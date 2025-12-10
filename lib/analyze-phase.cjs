#!/usr/bin/env node

/**
 * analyze-phase.cjs - Analyze pipeline phase transcripts for cost and timing
 *
 * Usage:
 *   node analyze-phase.cjs <project-path> <phase-number> [session-ids...]
 *
 * If no session-ids provided, analyzes all sessions from today
 *
 * Output: JSON with per-phase and per-todo metrics
 */

const fs = require('fs');
const path = require('path');

// Pricing (December 2025 - https://www.anthropic.com/claude/opus)
// Cache write = 1.25x input, Cache read = 0.1x input
const PRICING = {
  'claude-opus-4-5-20251101': {
    input: 5.00 / 1_000_000,
    output: 25.00 / 1_000_000,
    cacheWrite: 6.25 / 1_000_000,
    cacheRead: 0.50 / 1_000_000
  },
  'claude-sonnet-4-5-20250929': {
    input: 3.00 / 1_000_000,
    output: 15.00 / 1_000_000,
    cacheWrite: 3.75 / 1_000_000,
    cacheRead: 0.30 / 1_000_000
  },
  'claude-haiku-4-5-20251001': {
    input: 0.80 / 1_000_000,
    output: 4.00 / 1_000_000,
    cacheWrite: 1.00 / 1_000_000,
    cacheRead: 0.08 / 1_000_000
  }
};

// Default to Opus pricing if model not found
const DEFAULT_MODEL = 'claude-opus-4-5-20251101';

function encodeProjectPath(projectPath) {
  // Convert Windows path to Claude project folder format
  // C:\Users\ahunt\Documents\IMT Claude\test-project -> C--Users-ahunt-Documents-IMT-Claude-test-project
  return projectPath
    .replace(/\\/g, '/')    // backslash to forward
    .replace(/:/g, '-')     // colon to dash
    .replace(/ /g, '-')     // space to dash
    .replace(/\//g, '-')    // forward slash to dash
    .replace(/^-/, '');     // remove leading dash
}

function calculateCost(usage, model = DEFAULT_MODEL) {
  const pricing = PRICING[model] || PRICING[DEFAULT_MODEL];

  const inputCost = (usage.input_tokens || 0) * pricing.input;
  const outputCost = (usage.output_tokens || 0) * pricing.output;
  const cacheWriteCost = (usage.cache_creation_input_tokens || 0) * pricing.cacheWrite;
  const cacheReadCost = (usage.cache_read_input_tokens || 0) * pricing.cacheRead;

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

function parseTranscript(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n').filter(l => l);

  const messages = [];
  const todoChanges = [];
  let totalTokens = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  let totalCost = 0;
  let startTime = null;
  let endTime = null;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      if (obj.timestamp) {
        const ts = new Date(obj.timestamp);
        if (!startTime || ts < startTime) startTime = ts;
        if (!endTime || ts > endTime) endTime = ts;
      }

      // Track assistant messages for token usage
      if (obj.type === 'assistant' && obj.message?.usage) {
        const usage = obj.message.usage;
        totalTokens.input += usage.input_tokens || 0;
        totalTokens.output += usage.output_tokens || 0;
        totalTokens.cacheWrite += usage.cache_creation_input_tokens || 0;
        totalTokens.cacheRead += usage.cache_read_input_tokens || 0;

        // Determine model (may be in message)
        const model = obj.message.model || DEFAULT_MODEL;
        totalCost += calculateCost(usage, model);

        messages.push({
          timestamp: obj.timestamp,
          type: 'assistant',
          tokens: usage,
          cost: calculateCost(usage, model)
        });

        // Check for TodoWrite tool calls
        if (obj.message.content) {
          for (const content of obj.message.content) {
            if (content.type === 'tool_use' && content.name === 'TodoWrite') {
              todoChanges.push({
                timestamp: obj.timestamp,
                todos: content.input.todos
              });
            }
          }
        }
      }
    } catch (e) {
      // Skip unparseable lines
    }
  }

  return {
    startTime,
    endTime,
    duration: endTime && startTime ? (endTime - startTime) : 0,
    totalTokens,
    totalCost,
    todoChanges,
    messageCount: messages.length
  };
}

function analyzePerTodoDurations(todoChanges) {
  if (todoChanges.length === 0) return [];

  // Track when each todo transitioned to each status
  const todoTimelines = {};

  for (const change of todoChanges) {
    const ts = new Date(change.timestamp);

    for (const todo of change.todos) {
      const key = todo.content;
      if (!todoTimelines[key]) {
        todoTimelines[key] = {
          content: key,
          statuses: [],
          startedAt: null,
          completedAt: null,
          inProgressAt: null
        };
      }

      // Record status change
      const lastStatus = todoTimelines[key].statuses.length > 0
        ? todoTimelines[key].statuses[todoTimelines[key].statuses.length - 1].status
        : null;

      if (todo.status !== lastStatus) {
        todoTimelines[key].statuses.push({
          status: todo.status,
          timestamp: ts
        });

        if (todo.status === 'in_progress' && !todoTimelines[key].inProgressAt) {
          todoTimelines[key].inProgressAt = ts;
        }
        if (todo.status === 'completed') {
          todoTimelines[key].completedAt = ts;
        }
      }
    }
  }

  // Calculate durations
  const results = [];
  for (const [key, timeline] of Object.entries(todoTimelines)) {
    const duration = timeline.completedAt && timeline.inProgressAt
      ? (timeline.completedAt - timeline.inProgressAt)
      : null;

    results.push({
      content: timeline.content,
      startedAt: timeline.inProgressAt?.toISOString() || null,
      completedAt: timeline.completedAt?.toISOString() || null,
      durationMs: duration,
      durationFormatted: duration ? formatDuration(duration) : null
    });
  }

  return results;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatCost(cost) {
  return `$${cost.toFixed(4)}`;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node analyze-phase.cjs <project-path> <phase-number> [session-ids...]');
    process.exit(1);
  }

  const projectPath = args[0];
  const phaseNumber = args[1];
  const sessionIds = args.slice(2);

  // Find Claude projects folder
  const claudeProjectsDir = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'projects');
  const encodedPath = encodeProjectPath(path.resolve(projectPath));
  const projectTranscriptsDir = path.join(claudeProjectsDir, encodedPath);

  if (!fs.existsSync(projectTranscriptsDir)) {
    console.error(`Transcripts directory not found: ${projectTranscriptsDir}`);
    process.exit(1);
  }

  // Find transcript files
  let transcriptFiles = [];

  if (sessionIds.length > 0) {
    // Use provided session IDs
    for (const id of sessionIds) {
      const file = path.join(projectTranscriptsDir, `${id}.jsonl`);
      if (fs.existsSync(file)) {
        transcriptFiles.push(file);
      } else {
        console.error(`Session not found: ${id}`);
      }
    }
  } else {
    // Find all .jsonl files modified today (excluding agent-* files)
    const today = new Date().toISOString().slice(0, 10);
    const files = fs.readdirSync(projectTranscriptsDir)
      .filter(f => f.endsWith('.jsonl') && !f.startsWith('agent-'))
      .map(f => ({
        name: f,
        path: path.join(projectTranscriptsDir, f),
        mtime: fs.statSync(path.join(projectTranscriptsDir, f)).mtime
      }))
      .filter(f => f.mtime.toISOString().slice(0, 10) === today)
      .sort((a, b) => a.mtime - b.mtime);

    transcriptFiles = files.map(f => f.path);
  }

  if (transcriptFiles.length === 0) {
    console.error('No transcript files found');
    process.exit(1);
  }

  // Analyze all transcripts
  let combinedResults = {
    phase: phaseNumber,
    transcriptCount: transcriptFiles.length,
    transcriptIds: transcriptFiles.map(f => path.basename(f, '.jsonl')),
    startTime: null,
    endTime: null,
    durationMs: 0,
    durationFormatted: '',
    tokens: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, total: 0 },
    cost: 0,
    costFormatted: '',
    todoBreakdown: []
  };

  let allTodoChanges = [];

  for (const file of transcriptFiles) {
    const result = parseTranscript(file);

    // Merge timestamps
    if (!combinedResults.startTime || (result.startTime && result.startTime < combinedResults.startTime)) {
      combinedResults.startTime = result.startTime;
    }
    if (!combinedResults.endTime || (result.endTime && result.endTime > combinedResults.endTime)) {
      combinedResults.endTime = result.endTime;
    }

    // Sum tokens
    combinedResults.tokens.input += result.totalTokens.input;
    combinedResults.tokens.output += result.totalTokens.output;
    combinedResults.tokens.cacheWrite += result.totalTokens.cacheWrite;
    combinedResults.tokens.cacheRead += result.totalTokens.cacheRead;

    // Sum cost
    combinedResults.cost += result.totalCost;

    // Collect todo changes
    allTodoChanges = allTodoChanges.concat(result.todoChanges);
  }

  // Calculate totals
  combinedResults.tokens.total =
    combinedResults.tokens.input +
    combinedResults.tokens.output +
    combinedResults.tokens.cacheWrite +
    combinedResults.tokens.cacheRead;

  if (combinedResults.startTime && combinedResults.endTime) {
    combinedResults.durationMs = combinedResults.endTime - combinedResults.startTime;
    combinedResults.durationFormatted = formatDuration(combinedResults.durationMs);
    combinedResults.startTime = combinedResults.startTime.toISOString();
    combinedResults.endTime = combinedResults.endTime.toISOString();
  }

  combinedResults.costFormatted = formatCost(combinedResults.cost);

  // Analyze per-todo durations
  allTodoChanges.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  combinedResults.todoBreakdown = analyzePerTodoDurations(allTodoChanges);

  console.log(JSON.stringify(combinedResults, null, 2));
}

main();
