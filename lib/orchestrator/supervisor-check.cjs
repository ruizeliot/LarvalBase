/**
 * Supervisor Check Module
 *
 * Handles sending transcript slices to the supervisor for rule verification
 * after each todo completion.
 *
 * @module lib/orchestrator/supervisor-check
 * @version 11.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Extract transcript slice for a specific todo
 * Returns the transcript events between when the todo started (in_progress)
 * and when it completed.
 *
 * @param {Object[]} events - Array of transcript events
 * @param {string} todoContent - The content/name of the todo
 * @returns {string} Formatted transcript slice
 */
function extractTranscriptSlice(events, todoContent) {
  let startIndex = -1;
  let endIndex = -1;

  // Find the span for this todo
  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.type === 'todo_write' && event.todos) {
      for (const todo of event.todos) {
        if (todo.content === todoContent) {
          if (todo.status === 'in_progress' && startIndex === -1) {
            startIndex = i;
          } else if (todo.status === 'completed' && startIndex !== -1) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex !== -1) break;
  }

  // If we couldn't find the span, return empty
  if (startIndex === -1 || endIndex === -1) {
    return '[No transcript events found for this todo]';
  }

  // Look backwards from startIndex to include any assistant_message events
  // that are part of the same "turn" (they precede the TodoWrite in the same message)
  while (startIndex > 0 && events[startIndex - 1].type === 'assistant_message') {
    startIndex--;
  }

  // Build transcript slice from events between start and end
  const sliceEvents = events.slice(startIndex, endIndex + 1);
  const lines = [];

  for (const event of sliceEvents) {
    if (event.type === 'tool_call') {
      const target = event.input?.file_path || event.input?.path || event.input?.pattern || '';
      lines.push(`[Tool Call] ${event.tool}${target ? ` (${target})` : ''}`);
      if (event.input && Object.keys(event.input).length > 0) {
        // Include relevant input fields (excluding large content)
        const inputSummary = summarizeInput(event.input);
        if (inputSummary) {
          lines.push(`  Input: ${inputSummary}`);
        }
      }
    } else if (event.type === 'tool_result') {
      const status = event.isError ? 'ERROR' : 'SUCCESS';
      const contentPreview = typeof event.content === 'string'
        ? event.content.slice(0, 200)
        : JSON.stringify(event.content).slice(0, 200);
      lines.push(`[Tool Result] ${status}: ${contentPreview}${contentPreview.length >= 200 ? '...' : ''}`);
    } else if (event.type === 'assistant_message' && event.content) {
      // Include assistant reasoning (the missing piece that was documented)
      const preview = event.content.slice(0, 500);
      lines.push(`[Assistant] ${preview}${preview.length >= 500 ? '...' : ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Summarize tool input for logging (avoid large content)
 * @param {Object} input - Tool input object
 * @returns {string} Summary string
 */
function summarizeInput(input) {
  const parts = [];

  if (input.file_path) parts.push(`file: ${path.basename(input.file_path)}`);
  if (input.path) parts.push(`path: ${path.basename(input.path)}`);
  if (input.pattern) parts.push(`pattern: ${input.pattern}`);
  if (input.command) parts.push(`command: ${input.command.slice(0, 100)}`);

  return parts.join(', ');
}

/**
 * Format the supervisor check message according to supervisor-prompt.md template
 *
 * @param {Object} todo - The completed todo object
 * @param {string} phase - Current phase number
 * @param {string} transcriptSlice - The transcript slice content
 * @returns {string} Formatted message for supervisor
 */
function formatSupervisorMessage(todo, phase, transcriptSlice) {
  return `CHECK TODO: ${todo.content}
PHASE: ${phase}
TRANSCRIPT:
${transcriptSlice}`;
}

/**
 * Send supervisor check for a completed todo
 *
 * @param {Object} todo - The completed todo object
 * @param {Object} context - Context object with phase, projectPath, transcriptSlice, injectToRole
 * @returns {Promise<boolean>} Whether the message was sent successfully
 */
async function sendSupervisorCheck(todo, context) {
  const { phase, projectPath, transcriptSlice, injectToRole } = context;

  const message = formatSupervisorMessage(todo, phase, transcriptSlice);

  try {
    const result = await injectToRole(projectPath, 'supervisor', message);
    return result;
  } catch (error) {
    console.error('Failed to send supervisor check:', error.message);
    return false;
  }
}

/**
 * Parse transcript JSONL file and extract events
 * This is a simplified version of analyze-worker-transcript.cjs parseTranscript
 *
 * @param {string} transcriptPath - Path to the .jsonl transcript file
 * @returns {Object[]} Array of parsed events
 */
function parseTranscriptFile(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) {
    return [];
  }

  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(l => l.trim());
  const events = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const timestamp = obj.timestamp ? new Date(obj.timestamp) : null;

      // Extract assistant messages (the missing piece!)
      if (obj.message && obj.message.role === 'assistant') {
        // Check for text content blocks
        if (obj.message.content && Array.isArray(obj.message.content)) {
          for (const block of obj.message.content) {
            if (block.type === 'text') {
              events.push({
                type: 'assistant_message',
                timestamp,
                content: block.text
              });
            } else if (block.type === 'tool_use') {
              events.push({
                type: 'tool_call',
                timestamp,
                tool: block.name,
                input: block.input,
                id: block.id
              });
            }
          }
        }
      }

      // Extract tool results from user messages
      if (obj.message && obj.message.role === 'user') {
        if (obj.message.content && Array.isArray(obj.message.content)) {
          for (const block of obj.message.content) {
            if (block.type === 'tool_result') {
              events.push({
                type: 'tool_result',
                timestamp,
                toolUseId: block.tool_use_id,
                content: block.content,
                isError: block.is_error || false
              });
            }
          }
        }
      }

      // Extract TodoWrite calls
      if (obj.message && obj.message.content && Array.isArray(obj.message.content)) {
        const todoBlock = obj.message.content.find(b => b.type === 'tool_use' && b.name === 'TodoWrite');
        if (todoBlock && todoBlock.input && todoBlock.input.todos) {
          events.push({
            type: 'todo_write',
            timestamp,
            todos: todoBlock.input.todos
          });
        }
      }

    } catch {
      // Skip unparseable lines
    }
  }

  return events;
}

/**
 * Find the transcript file path for a Claude session
 *
 * @param {string} projectPath - Project path
 * @param {string} sessionId - Claude session ID
 * @returns {string|null} Path to transcript file or null if not found
 */
function findTranscriptPath(projectPath, sessionId) {
  const resolved = path.resolve(projectPath);
  let encoded = resolved.replace(/\\/g, '/').replace(/:/g, '-').replace(/ /g, '-').replace(/\//g, '-');
  if (encoded.startsWith('-')) encoded = encoded.substring(1);

  const userProfile = process.env.USERPROFILE || process.env.HOME;
  const transcriptsDir = path.join(userProfile, '.claude', 'projects', encoded);
  const transcriptPath = path.join(transcriptsDir, `${sessionId}.jsonl`);

  if (fs.existsSync(transcriptPath)) {
    return transcriptPath;
  }

  return null;
}

/**
 * Check supervisor response for violations
 * Reads .pipeline/violation.json if it exists
 *
 * @param {string} projectPath - Project path
 * @param {number} [timeoutMs=5000] - How long to wait for response
 * @returns {Promise<Object>} Result object with passed, violation, warning fields
 */
async function checkSupervisorResponse(projectPath, timeoutMs = 5000) {
  const violationPath = path.join(projectPath, '.pipeline', 'violation.json');

  // Wait for supervisor to process and potentially write violation file
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(violationPath)) {
      try {
        const content = fs.readFileSync(violationPath, 'utf8');
        const violation = JSON.parse(content);

        // Delete the file after reading
        fs.unlinkSync(violationPath);

        return {
          passed: false,
          violation: violation,
          warning: null
        };
      } catch {
        // If we can't parse, assume clean
        break;
      }
    }

    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // No violation found, assume passed
  return {
    passed: true,
    violation: null,
    warning: null
  };
}

/**
 * Discover the most recent worker session ID by finding the newest transcript file
 *
 * @param {string} projectPath - Project path
 * @returns {string|null} Session ID or null if not found
 */
function discoverWorkerSessionId(projectPath) {
  const resolved = path.resolve(projectPath);
  let encoded = resolved.replace(/\\/g, '/').replace(/:/g, '-').replace(/ /g, '-').replace(/\//g, '-');
  if (encoded.startsWith('-')) encoded = encoded.substring(1);

  const userProfile = process.env.USERPROFILE || process.env.HOME;
  const transcriptsDir = path.join(userProfile, '.claude', 'projects', encoded);

  if (!fs.existsSync(transcriptsDir)) {
    return null;
  }

  try {
    // Find all .jsonl files and sort by modification time (newest first)
    const files = fs.readdirSync(transcriptsDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: path.join(transcriptsDir, f),
        mtime: fs.statSync(path.join(transcriptsDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 0) {
      // Return the session ID (filename without .jsonl)
      return files[0].name.replace('.jsonl', '');
    }
  } catch {
    // Ignore errors
  }

  return null;
}

module.exports = {
  extractTranscriptSlice,
  formatSupervisorMessage,
  sendSupervisorCheck,
  parseTranscriptFile,
  findTranscriptPath,
  checkSupervisorResponse,
  summarizeInput,
  discoverWorkerSessionId
};
