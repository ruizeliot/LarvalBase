#!/usr/bin/env node
/**
 * analyze-worker-transcript.cjs
 *
 * Analyzes a worker transcript JSONL file to identify execution patterns:
 * - Retries (same tool on same file multiple times)
 * - Errors and recovery time
 * - Loops (repeated action sequences)
 * - Clean executions (one-shot successes)
 *
 * Outputs:
 * - Markdown report: .pipeline/analysis/phase-N-analysis.md
 * - Manifest update with todoSummaries
 */

const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node analyze-worker-transcript.cjs <projectPath> <sessionId> <phaseOrEpic> [phaseNumber|epicId]');
  console.error('  phaseOrEpic: "phase" or "epic"');
  console.error('  phaseNumber: 1-5 for phases, or epic ID for epics');
  process.exit(1);
}

const PROJECT_PATH = args[0];
const SESSION_ID = args[1];
const TYPE = args[2]; // 'phase' or 'epic'
const NUMBER = args[3] || '1';

const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');
const ANALYSIS_DIR = path.join(PROJECT_PATH, '.pipeline', 'analysis');

// ============ FIND TRANSCRIPT ============

function findTranscriptPath(sessionId) {
  const resolved = path.resolve(PROJECT_PATH);
  let encoded = resolved.replace(/\\/g, '/').replace(/:/g, '-').replace(/ /g, '-').replace(/\//g, '-');
  if (encoded.startsWith('-')) encoded = encoded.substring(1);

  const transcriptsDir = path.join(process.env.USERPROFILE, '.claude', 'projects', encoded);
  const transcriptPath = path.join(transcriptsDir, `${sessionId}.jsonl`);

  if (fs.existsSync(transcriptPath)) {
    return transcriptPath;
  }
  return null;
}

// ============ PARSE TRANSCRIPT ============

function parseTranscript(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(l => l.trim());

  const events = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      // Extract timestamp
      const timestamp = obj.timestamp ? new Date(obj.timestamp) : null;

      // Extract tool calls from assistant messages
      if (obj.message && obj.message.content && Array.isArray(obj.message.content)) {
        for (const block of obj.message.content) {
          if (block.type === 'tool_use') {
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

      // Extract tool results
      if (obj.type === 'tool_result' || (obj.message && obj.message.role === 'user')) {
        // Tool results come in user messages
        if (obj.message && obj.message.content && Array.isArray(obj.message.content)) {
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

      // Extract TodoWrite calls specifically
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

    } catch (e) {
      // Skip unparseable lines
    }
  }

  return events;
}

// ============ BUILD TODO SPANS ============

function buildTodoSpans(events) {
  const spans = [];
  const activeSpans = {}; // content -> { startTime, startIndex }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.type === 'todo_write') {
      for (const todo of event.todos) {
        const content = todo.content;

        if (todo.status === 'in_progress' && !activeSpans[content]) {
          activeSpans[content] = {
            startTime: event.timestamp,
            startIndex: i,
            content
          };
        } else if (todo.status === 'completed' && activeSpans[content]) {
          spans.push({
            content,
            startTime: activeSpans[content].startTime,
            endTime: event.timestamp,
            startIndex: activeSpans[content].startIndex,
            endIndex: i
          });
          delete activeSpans[content];
        }
      }
    }
  }

  return spans;
}

// ============ DETECT SEQUENCING VIOLATIONS ============

function detectSequencingViolations(events) {
  const violations = [];
  const taskOrder = []; // Track order tasks were started
  const completedTasks = new Set();
  let lastTaskNumber = 0;

  for (const event of events) {
    if (event.type !== 'todo_write') continue;

    for (const todo of event.todos) {
      // Extract task number from content (e.g., "1. Do something" -> 1)
      const match = todo.content.match(/^(\d+)\./);
      if (!match) continue;

      const taskNumber = parseInt(match[1], 10);

      if (todo.status === 'in_progress') {
        // Check if previous task was completed
        if (taskNumber > 1 && !completedTasks.has(taskNumber - 1)) {
          violations.push({
            type: 'skip',
            taskNumber,
            content: todo.content,
            missingTask: taskNumber - 1,
            message: `Task ${taskNumber} started before Task ${taskNumber - 1} was completed`
          });
        }

        // Check if jumping ahead (non-sequential)
        if (taskNumber > lastTaskNumber + 1 && lastTaskNumber > 0) {
          violations.push({
            type: 'jump',
            taskNumber,
            content: todo.content,
            expectedTask: lastTaskNumber + 1,
            message: `Jumped from Task ${lastTaskNumber} to Task ${taskNumber}, skipping Task ${lastTaskNumber + 1}`
          });
        }

        taskOrder.push({ taskNumber, content: todo.content, action: 'started' });
        lastTaskNumber = taskNumber;
      }

      if (todo.status === 'completed') {
        completedTasks.add(taskNumber);
        taskOrder.push({ taskNumber, content: todo.content, action: 'completed' });
      }
    }
  }

  // Detect out-of-order completions
  const completionOrder = taskOrder
    .filter(t => t.action === 'completed')
    .map(t => t.taskNumber);

  for (let i = 1; i < completionOrder.length; i++) {
    if (completionOrder[i] < completionOrder[i - 1]) {
      violations.push({
        type: 'out_of_order',
        taskNumber: completionOrder[i],
        message: `Task ${completionOrder[i]} completed after Task ${completionOrder[i - 1]} (out of order)`
      });
    }
  }

  return {
    violations,
    taskOrder,
    completedTasks: Array.from(completedTasks).sort((a, b) => a - b)
  };
}

// ============ ANALYZE TOOL CALLS PER TODO ============

function analyzeToolCalls(events, span) {
  const toolCalls = [];
  const toolResults = {};

  // Collect tool calls and results within the span
  for (let i = span.startIndex; i <= span.endIndex; i++) {
    const event = events[i];

    if (event.type === 'tool_call') {
      toolCalls.push({
        index: i,
        tool: event.tool,
        input: event.input,
        id: event.id,
        timestamp: event.timestamp
      });
    }

    if (event.type === 'tool_result') {
      toolResults[event.toolUseId] = {
        content: event.content,
        isError: event.isError
      };
    }
  }

  // Enrich tool calls with results
  for (const call of toolCalls) {
    if (toolResults[call.id]) {
      call.result = toolResults[call.id];
    }
  }

  return toolCalls;
}

// ============ DETECT PATTERNS ============

function detectPatterns(toolCalls) {
  const patterns = {
    retries: [],
    errors: [],
    loops: [],
    fileAccess: {} // track file access patterns
  };

  // Track tool+target combinations for retry detection
  const toolTargets = {};

  for (let i = 0; i < toolCalls.length; i++) {
    const call = toolCalls[i];
    const tool = call.tool;

    // Extract target (file path) from common tools
    let target = null;
    if (call.input) {
      target = call.input.file_path || call.input.path || call.input.pattern || call.input.command;
    }

    const key = `${tool}:${target || 'unknown'}`;

    if (!toolTargets[key]) {
      toolTargets[key] = [];
    }
    toolTargets[key].push({ index: i, call });

    // Track file access
    if (target && (tool === 'Read' || tool === 'Edit' || tool === 'Write')) {
      if (!patterns.fileAccess[target]) {
        patterns.fileAccess[target] = { reads: 0, edits: 0, writes: 0, errors: 0 };
      }
      if (tool === 'Read') patterns.fileAccess[target].reads++;
      if (tool === 'Edit') patterns.fileAccess[target].edits++;
      if (tool === 'Write') patterns.fileAccess[target].writes++;
    }

    // Detect errors
    if (call.result && call.result.isError) {
      patterns.errors.push({
        index: i,
        tool,
        target,
        error: typeof call.result.content === 'string'
          ? call.result.content.slice(0, 200)
          : JSON.stringify(call.result.content).slice(0, 200)
      });

      if (target && patterns.fileAccess[target]) {
        patterns.fileAccess[target].errors++;
      }
    }
  }

  // Detect retries (same tool+target multiple times)
  for (const [key, occurrences] of Object.entries(toolTargets)) {
    if (occurrences.length > 1) {
      const [tool, target] = key.split(':');
      if (tool === 'Edit' || tool === 'Write') {
        patterns.retries.push({
          tool,
          target,
          count: occurrences.length,
          indices: occurrences.map(o => o.index)
        });
      }
    }
  }

  // Detect loops (repeated sequences of 3+ tools)
  const sequence = toolCalls.map(c => c.tool).join(',');
  for (let windowSize = 3; windowSize <= 6; windowSize++) {
    for (let i = 0; i < toolCalls.length - windowSize * 2; i++) {
      const pattern = toolCalls.slice(i, i + windowSize).map(c => c.tool).join(',');
      const nextPattern = toolCalls.slice(i + windowSize, i + windowSize * 2).map(c => c.tool).join(',');
      if (pattern === nextPattern && pattern.length > 0) {
        patterns.loops.push({
          pattern: pattern.split(','),
          startIndex: i,
          repetitions: 2
        });
      }
    }
  }

  return patterns;
}

// ============ CLASSIFY HEALTH ============

function classifyHealth(toolCalls, patterns) {
  const retryCount = patterns.retries.reduce((sum, r) => sum + r.count - 1, 0);
  const errorCount = patterns.errors.length;
  const loopCount = patterns.loops.length;

  if (retryCount === 0 && errorCount === 0 && loopCount === 0) {
    return { status: 'clean', icon: '✓', color: 'green' };
  } else if (retryCount <= 2 && errorCount <= 1 && loopCount === 0) {
    return { status: 'minor_friction', icon: '⚠', color: 'yellow' };
  } else {
    return { status: 'struggled', icon: '✗', color: 'red' };
  }
}

// ============ GENERATE PHASE DESIGN SUGGESTIONS ============

function generatePhaseDesignSuggestions(todoAnalyses, sequencingData, metadata) {
  const suggestions = [];

  // 1. Analyze sequencing violations
  if (sequencingData.violations.length > 0) {
    const skipViolations = sequencingData.violations.filter(v => v.type === 'skip');
    const jumpViolations = sequencingData.violations.filter(v => v.type === 'jump');
    const outOfOrderViolations = sequencingData.violations.filter(v => v.type === 'out_of_order');

    if (skipViolations.length > 0) {
      suggestions.push({
        type: 'sequencing',
        severity: 'high',
        issue: `${skipViolations.length} task(s) were skipped`,
        details: skipViolations.map(v => v.message),
        recommendation: 'Enforce sequential execution rule. Worker must complete Task N-1 before starting Task N.',
        action: 'Add blocking check: "Is previous task completed?" before allowing in_progress'
      });
    }

    if (jumpViolations.length > 0) {
      suggestions.push({
        type: 'sequencing',
        severity: 'high',
        issue: `Worker jumped ahead ${jumpViolations.length} time(s)`,
        details: jumpViolations.map(v => v.message),
        recommendation: 'Tasks may have unclear dependencies or worker is optimizing incorrectly.',
        action: 'Review if jumped tasks have hidden dependencies. Consider merging related tasks.'
      });
    }

    if (outOfOrderViolations.length > 0) {
      suggestions.push({
        type: 'sequencing',
        severity: 'medium',
        issue: `${outOfOrderViolations.length} task(s) completed out of order`,
        details: outOfOrderViolations.map(v => v.message),
        recommendation: 'Worker may be context-switching or tasks have unclear boundaries.',
        action: 'Review task definitions for clarity. Consider splitting complex tasks.'
      });
    }
  }

  // 2. Analyze struggled tasks - connect to task design
  const struggledTasks = todoAnalyses.filter(t => t.health.status === 'struggled');
  for (const task of struggledTasks) {
    const retryCount = task.patterns.retries.reduce((sum, r) => sum + r.count - 1, 0);
    const errorCount = task.patterns.errors.length;

    // High retry count suggests unclear requirements
    if (retryCount >= 5) {
      suggestions.push({
        type: 'task_design',
        severity: 'high',
        issue: `Task "${task.content}" required ${retryCount} retries`,
        details: task.patterns.retries.map(r => `${r.tool} on ${path.basename(r.target || 'unknown')} (${r.count}x)`),
        recommendation: 'Task requirements may be unclear or too complex.',
        action: 'Consider breaking into smaller sub-tasks or adding clearer success criteria.'
      });
    }

    // Multiple errors suggest missing prerequisites
    if (errorCount >= 3) {
      const errorTypes = task.patterns.errors.map(e => e.tool);
      const uniqueErrorTools = [...new Set(errorTypes)];

      suggestions.push({
        type: 'task_design',
        severity: 'high',
        issue: `Task "${task.content}" hit ${errorCount} errors`,
        details: task.patterns.errors.map(e => `${e.tool}: ${e.error.slice(0, 100)}`),
        recommendation: `Errors in ${uniqueErrorTools.join(', ')} suggest missing prerequisites or incorrect assumptions.`,
        action: 'Add prerequisite check step or clarify expected state before this task.'
      });
    }

    // Loop detection suggests unclear exit condition
    if (task.patterns.loops.length > 0) {
      suggestions.push({
        type: 'task_design',
        severity: 'medium',
        issue: `Task "${task.content}" had ${task.patterns.loops.length} retry loop(s)`,
        details: task.patterns.loops.map(l => `Pattern: ${l.pattern.join(' → ')} (${l.repetitions}x)`),
        recommendation: 'Worker got stuck in loop. Exit condition unclear or approach incorrect.',
        action: 'Add explicit success criteria or alternative approach instructions.'
      });
    }
  }

  // 3. Analyze trivial tasks (very quick, few tool calls)
  const trivialTasks = todoAnalyses.filter(t =>
    t.health.status === 'clean' &&
    t.toolCalls.length <= 2 &&
    t.durationMs && t.durationMs < 30000
  );

  if (trivialTasks.length >= 3) {
    suggestions.push({
      type: 'task_design',
      severity: 'low',
      issue: `${trivialTasks.length} tasks were trivial (< 30s, ≤ 2 tool calls)`,
      details: trivialTasks.map(t => t.content),
      recommendation: 'These tasks may be too granular or could be merged.',
      action: 'Consider merging trivial tasks with related tasks to reduce overhead.'
    });
  }

  // 4. Analyze file access patterns for task boundaries
  const allFileAccess = {};
  for (const task of todoAnalyses) {
    for (const [file, access] of Object.entries(task.patterns.fileAccess || {})) {
      if (!allFileAccess[file]) {
        allFileAccess[file] = { tasks: [], totalEdits: 0 };
      }
      allFileAccess[file].tasks.push(task.content);
      allFileAccess[file].totalEdits += access.edits || 0;
    }
  }

  // Files touched by many tasks suggest poor task boundaries
  const overTouchedFiles = Object.entries(allFileAccess)
    .filter(([_, data]) => data.tasks.length >= 3 && data.totalEdits >= 5)
    .map(([file, data]) => ({ file: path.basename(file), taskCount: data.tasks.length, edits: data.totalEdits }));

  if (overTouchedFiles.length > 0) {
    suggestions.push({
      type: 'task_boundaries',
      severity: 'medium',
      issue: `${overTouchedFiles.length} file(s) edited by 3+ tasks`,
      details: overTouchedFiles.map(f => `${f.file}: ${f.taskCount} tasks, ${f.edits} edits`),
      recommendation: 'Multiple tasks touching same file suggests poor separation of concerns.',
      action: 'Consider reorganizing tasks by file/component rather than feature step.'
    });
  }

  return suggestions;
}

// ============ GENERATE SUMMARY ============

function generateSummary(toolCalls, patterns, health, durationMs) {
  const retryCount = patterns.retries.reduce((sum, r) => sum + r.count - 1, 0);
  const errorCount = patterns.errors.length;

  let summary = '';

  if (health.status === 'clean') {
    summary = `Clean execution. ${toolCalls.length} tool calls, no retries.`;
  } else if (health.status === 'minor_friction') {
    const details = [];
    if (retryCount > 0) {
      const mainRetry = patterns.retries[0];
      details.push(`${retryCount} ${mainRetry.tool} retry${retryCount > 1 ? 'ies' : ''} on ${path.basename(mainRetry.target || 'file')}`);
    }
    if (errorCount > 0) {
      details.push(`${errorCount} error${errorCount > 1 ? 's' : ''} recovered`);
    }
    summary = `Minor friction. ${details.join(', ')}. Resolved quickly.`;
  } else {
    const details = [];
    if (retryCount > 0) {
      details.push(`${retryCount} retries`);
    }
    if (errorCount > 0) {
      const mainError = patterns.errors[0];
      details.push(`hit "${mainError.error.slice(0, 50)}..."`);
    }
    if (patterns.loops.length > 0) {
      details.push(`${patterns.loops.length} loop${patterns.loops.length > 1 ? 's' : ''} detected`);
    }
    summary = `Struggled here. ${details.join(', ')}.`;
  }

  return summary;
}

// ============ GENERATE MARKDOWN REPORT ============

function generateMarkdownReport(todoAnalyses, metadata, sequencingData, suggestions) {
  const lines = [];

  const typeLabel = metadata.type === 'phase' ? `Phase ${metadata.number}` : `Epic ${metadata.number}`;
  const name = metadata.name || typeLabel;

  lines.push(`# ${typeLabel}: ${name} - Execution Analysis`);
  lines.push('');
  lines.push(`**Session ID:** ${metadata.sessionId}`);
  lines.push(`**Analyzed:** ${new Date().toISOString()}`);
  lines.push('');

  // Summary table
  const totalToolCalls = todoAnalyses.reduce((sum, t) => sum + t.toolCalls.length, 0);
  const totalRetries = todoAnalyses.reduce((sum, t) => sum + t.patterns.retries.reduce((s, r) => s + r.count - 1, 0), 0);
  const totalErrors = todoAnalyses.reduce((sum, t) => sum + t.patterns.errors.length, 0);
  const cleanTasks = todoAnalyses.filter(t => t.health.status === 'clean').length;
  const struggledTasks = todoAnalyses.filter(t => t.health.status === 'struggled').length;

  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total tool calls | ${totalToolCalls} |`);
  lines.push(`| Retries | ${totalRetries} (${totalToolCalls > 0 ? Math.round(totalRetries / totalToolCalls * 100) : 0}%) |`);
  lines.push(`| Errors encountered | ${totalErrors} |`);
  lines.push(`| Clean tasks | ${cleanTasks}/${todoAnalyses.length} |`);
  lines.push(`| Struggled tasks | ${struggledTasks}/${todoAnalyses.length} |`);
  lines.push(`| Sequencing violations | ${sequencingData.violations.length} |`);
  lines.push('');

  // Sequencing Violations section (if any)
  if (sequencingData.violations.length > 0) {
    lines.push('## ⚠️ Sequencing Violations');
    lines.push('');
    lines.push('**Tasks were NOT executed in sequential order.**');
    lines.push('');

    for (const violation of sequencingData.violations) {
      const icon = violation.type === 'skip' ? '⛔' : violation.type === 'jump' ? '⏭️' : '🔄';
      lines.push(`- ${icon} **${violation.type.toUpperCase()}:** ${violation.message}`);
    }
    lines.push('');

    lines.push('**Task execution order observed:**');
    lines.push('```');
    const orderStr = sequencingData.taskOrder
      .map(t => `${t.taskNumber} (${t.action})`)
      .join(' → ');
    lines.push(orderStr);
    lines.push('```');
    lines.push('');
  }

  // Phase Design Suggestions section (if any)
  if (suggestions.length > 0) {
    lines.push('## 💡 Phase Design Suggestions');
    lines.push('');
    lines.push('**The following issues were detected. User should review and decide whether to update the phase command.**');
    lines.push('');

    const highSeverity = suggestions.filter(s => s.severity === 'high');
    const mediumSeverity = suggestions.filter(s => s.severity === 'medium');
    const lowSeverity = suggestions.filter(s => s.severity === 'low');

    if (highSeverity.length > 0) {
      lines.push('### 🔴 High Severity');
      lines.push('');
      for (const suggestion of highSeverity) {
        lines.push(`#### ${suggestion.issue}`);
        lines.push(`**Type:** ${suggestion.type}`);
        lines.push('');
        if (suggestion.details && suggestion.details.length > 0) {
          lines.push('**Details:**');
          for (const detail of suggestion.details) {
            lines.push(`- ${detail}`);
          }
          lines.push('');
        }
        lines.push(`**Recommendation:** ${suggestion.recommendation}`);
        lines.push('');
        lines.push(`**Suggested Action:** ${suggestion.action}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    if (mediumSeverity.length > 0) {
      lines.push('### 🟡 Medium Severity');
      lines.push('');
      for (const suggestion of mediumSeverity) {
        lines.push(`#### ${suggestion.issue}`);
        lines.push(`**Type:** ${suggestion.type}`);
        lines.push('');
        if (suggestion.details && suggestion.details.length > 0) {
          lines.push('**Details:**');
          for (const detail of suggestion.details) {
            lines.push(`- ${detail}`);
          }
          lines.push('');
        }
        lines.push(`**Recommendation:** ${suggestion.recommendation}`);
        lines.push('');
        lines.push(`**Suggested Action:** ${suggestion.action}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    if (lowSeverity.length > 0) {
      lines.push('### 🟢 Low Severity');
      lines.push('');
      for (const suggestion of lowSeverity) {
        lines.push(`#### ${suggestion.issue}`);
        lines.push(`**Type:** ${suggestion.type}`);
        lines.push('');
        if (suggestion.details && suggestion.details.length > 0) {
          lines.push('**Details:**');
          for (const detail of suggestion.details) {
            lines.push(`- ${detail}`);
          }
          lines.push('');
        }
        lines.push(`**Recommendation:** ${suggestion.recommendation}`);
        lines.push('');
        lines.push(`**Suggested Action:** ${suggestion.action}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }
  }

  // Todo breakdown
  lines.push('## Todo Breakdown');
  lines.push('');

  for (let i = 0; i < todoAnalyses.length; i++) {
    const todo = todoAnalyses[i];
    const durationStr = todo.durationMs ? formatDuration(todo.durationMs) : 'unknown';
    const retryCount = todo.patterns.retries.reduce((sum, r) => sum + r.count - 1, 0);

    lines.push(`### ${i + 1}. ${todo.content}`);
    lines.push(`**Health:** ${todo.health.icon} ${todo.health.status.replace('_', ' ')}`);
    lines.push(`**Tool calls:** ${todo.toolCalls.length} | **Retries:** ${retryCount} | **Duration:** ${durationStr}`);
    lines.push('');
    lines.push(`> ${todo.summary}`);
    lines.push('');

    // Detailed breakdown for struggled tasks
    if (todo.health.status === 'struggled') {
      lines.push('**Tool sequence:**');
      lines.push('```');
      const toolSeq = todo.toolCalls.map(c => {
        const target = c.input?.file_path || c.input?.path || '';
        const basename = target ? path.basename(target) : '';
        const status = c.result?.isError ? ' [ERROR]' : '';
        return `${c.tool}${basename ? ` (${basename})` : ''}${status}`;
      });
      lines.push(toolSeq.join(' → '));
      lines.push('```');
      lines.push('');

      // List errors
      if (todo.patterns.errors.length > 0) {
        lines.push('**Errors:**');
        for (const err of todo.patterns.errors) {
          lines.push(`- \`${err.tool}\`: ${err.error}`);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// ============ UPDATE MANIFEST ============

// Build analysis object from todo analyses
function buildAnalysisObject(todoAnalyses, metadata, sequencingData, suggestions) {
  return {
    status: 'complete',
    analyzedAt: new Date().toISOString(),
    file: `.pipeline/analysis/${metadata.type}-${metadata.number}-analysis.md`,
    summary: {
      clean: todoAnalyses.filter(t => t.health.status === 'clean').length,
      minorFriction: todoAnalyses.filter(t => t.health.status === 'minor_friction').length,
      struggled: todoAnalyses.filter(t => t.health.status === 'struggled').length,
      totalToolCalls: todoAnalyses.reduce((sum, t) => sum + t.toolCalls.length, 0),
      totalRetries: todoAnalyses.reduce((sum, t) => sum + t.patterns.retries.reduce((s, r) => s + r.count - 1, 0), 0),
      sequencingViolations: sequencingData.violations.length,
      suggestionsCount: suggestions.length
    },
    sequencing: {
      violations: sequencingData.violations,
      taskOrder: sequencingData.taskOrder,
      completedTasks: sequencingData.completedTasks
    },
    suggestions: suggestions.map(s => ({
      type: s.type,
      severity: s.severity,
      issue: s.issue,
      recommendation: s.recommendation,
      action: s.action
    })),
    todoSummaries: todoAnalyses.map(t => ({
      content: t.content,
      summary: t.summary,
      health: t.health.status,
      toolCalls: t.toolCalls.length,
      retries: t.patterns.retries.reduce((sum, r) => sum + r.count - 1, 0)
    }))
  };
}

// Atomic write with retry logic to handle concurrent manifest modifications
function updateManifest(todoAnalyses, metadata, sequencingData, suggestions) {
  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 200;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (!fs.existsSync(MANIFEST_PATH)) {
        console.error('Manifest not found:', MANIFEST_PATH);
        return false;
      }

      // Re-read manifest on each attempt to get latest version
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      const analysis = buildAnalysisObject(todoAnalyses, metadata, sequencingData, suggestions);

      // Add analysis to appropriate location
      if (metadata.type === 'phase') {
        if (!manifest.phases) manifest.phases = {};
        if (!manifest.phases[metadata.number]) manifest.phases[metadata.number] = {};
        manifest.phases[metadata.number].analysis = analysis;
      } else if (metadata.type === 'epic') {
        if (manifest.epics) {
          const epic = manifest.epics.find(e => e.id === parseInt(metadata.number));
          if (epic) {
            epic.analysis = analysis;
          }
        }
      }

      // Atomic write: write to temp file, then rename
      const tempPath = MANIFEST_PATH + '.analysis-tmp';
      fs.writeFileSync(tempPath, JSON.stringify(manifest, null, 2));
      fs.renameSync(tempPath, MANIFEST_PATH);

      console.log(`Manifest updated with analysis data (attempt ${attempt})`);
      return true;

    } catch (err) {
      console.log(`Manifest update attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 200ms, 400ms, 800ms, 1600ms
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delayMs}ms...`);

        // Sync sleep (blocking but acceptable for this script)
        const waitUntil = Date.now() + delayMs;
        while (Date.now() < waitUntil) {
          // Busy wait - not ideal but works for short delays in CLI script
        }
      }
    }
  }

  console.error(`Failed to update manifest after ${MAX_RETRIES} attempts`);
  return false;
}

// ============ MAIN ============

async function main() {
  console.log('=== Worker Transcript Analysis ===');
  console.log(`Project: ${PROJECT_PATH}`);
  console.log(`Session: ${SESSION_ID}`);
  console.log(`Type: ${TYPE} ${NUMBER}`);
  console.log('');

  // Find transcript
  const transcriptPath = findTranscriptPath(SESSION_ID);
  if (!transcriptPath) {
    console.error('Transcript not found for session:', SESSION_ID);
    process.exit(1);
  }
  console.log('Transcript:', transcriptPath);

  // Parse transcript
  console.log('Parsing transcript...');
  const events = parseTranscript(transcriptPath);
  console.log(`Found ${events.length} events`);

  // Build todo spans
  const todoSpans = buildTodoSpans(events);
  console.log(`Found ${todoSpans.length} todo spans`);

  if (todoSpans.length === 0) {
    console.log('No completed todos found in transcript. Creating minimal report.');
    // Create minimal report
    const metadata = { type: TYPE, number: NUMBER, sessionId: SESSION_ID };

    // Ensure analysis directory exists
    if (!fs.existsSync(ANALYSIS_DIR)) {
      fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
    }

    const report = `# ${TYPE === 'phase' ? 'Phase' : 'Epic'} ${NUMBER} - Execution Analysis\n\n**Session ID:** ${SESSION_ID}\n\nNo completed todos found in transcript.\n`;
    const reportPath = path.join(ANALYSIS_DIR, `${TYPE}-${NUMBER}-analysis.md`);
    fs.writeFileSync(reportPath, report);
    console.log('Report written to:', reportPath);
    return;
  }

  // Analyze each todo
  const todoAnalyses = [];

  for (const span of todoSpans) {
    console.log(`\nAnalyzing: ${span.content}`);

    const toolCalls = analyzeToolCalls(events, span);
    const patterns = detectPatterns(toolCalls);
    const health = classifyHealth(toolCalls, patterns);
    const durationMs = span.endTime && span.startTime ? span.endTime - span.startTime : null;
    const summary = generateSummary(toolCalls, patterns, health, durationMs);

    console.log(`  Tool calls: ${toolCalls.length}`);
    console.log(`  Retries: ${patterns.retries.reduce((s, r) => s + r.count - 1, 0)}`);
    console.log(`  Errors: ${patterns.errors.length}`);
    console.log(`  Health: ${health.status}`);

    todoAnalyses.push({
      content: span.content,
      toolCalls,
      patterns,
      health,
      durationMs,
      summary
    });
  }

  // Get phase/epic name from manifest
  let name = null;
  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (TYPE === 'phase') {
      const phaseNames = { '1': 'Brainstorm', '2': 'Technical', '3': 'Bootstrap', '4': 'Implement', '5': 'Finalize' };
      name = phaseNames[NUMBER] || `Phase ${NUMBER}`;
    } else if (TYPE === 'epic' && manifest.epics) {
      const epic = manifest.epics.find(e => e.id === parseInt(NUMBER));
      if (epic) name = epic.name;
    }
  }

  const metadata = { type: TYPE, number: NUMBER, sessionId: SESSION_ID, name };

  // Detect sequencing violations
  console.log('\nChecking task sequencing...');
  const sequencingData = detectSequencingViolations(events);
  console.log(`  Violations: ${sequencingData.violations.length}`);
  console.log(`  Tasks completed: ${sequencingData.completedTasks.length}`);

  if (sequencingData.violations.length > 0) {
    console.log('  ⚠️ SEQUENCING VIOLATIONS DETECTED:');
    for (const v of sequencingData.violations) {
      console.log(`    - ${v.type.toUpperCase()}: ${v.message}`);
    }
  }

  // Generate phase design suggestions
  console.log('\nGenerating phase design suggestions...');
  const suggestions = generatePhaseDesignSuggestions(todoAnalyses, sequencingData, metadata);
  console.log(`  Suggestions: ${suggestions.length}`);

  if (suggestions.length > 0) {
    const highCount = suggestions.filter(s => s.severity === 'high').length;
    const mediumCount = suggestions.filter(s => s.severity === 'medium').length;
    const lowCount = suggestions.filter(s => s.severity === 'low').length;
    console.log(`    High: ${highCount}, Medium: ${mediumCount}, Low: ${lowCount}`);
  }

  // Generate markdown report
  console.log('\nGenerating markdown report...');
  const report = generateMarkdownReport(todoAnalyses, metadata, sequencingData, suggestions);

  // Ensure analysis directory exists
  if (!fs.existsSync(ANALYSIS_DIR)) {
    fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
  }

  const reportPath = path.join(ANALYSIS_DIR, `${TYPE}-${NUMBER}-analysis.md`);
  fs.writeFileSync(reportPath, report);
  console.log('Report written to:', reportPath);

  // Update manifest
  console.log('Updating manifest...');
  updateManifest(todoAnalyses, metadata, sequencingData, suggestions);

  console.log('\n=== Analysis Complete ===');

  // Print summary for user
  if (sequencingData.violations.length > 0 || suggestions.length > 0) {
    console.log('\n========================================');
    console.log('ATTENTION REQUIRED: Review analysis report');
    console.log('========================================');
    if (sequencingData.violations.length > 0) {
      console.log(`⚠️  ${sequencingData.violations.length} sequencing violation(s) detected`);
    }
    if (suggestions.length > 0) {
      console.log(`💡 ${suggestions.length} phase design suggestion(s) generated`);
    }
    console.log(`📄 Report: ${reportPath}`);
    console.log('========================================');
  }
}

main().catch(err => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
