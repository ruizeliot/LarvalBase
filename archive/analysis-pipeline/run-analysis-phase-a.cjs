#!/usr/bin/env node
/**
 * Analysis Pipeline - Phase A: Initial Analysis
 * Pure Node.js (no bash/jq) for Windows compatibility.
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude');
const SESSIONS_DIR = path.join(CLAUDE_DIR, 'projects');

function log(msg) {
  console.log('[' + new Date().toISOString() + '] ' + msg);
}

function parseJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function parseJSONL(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').filter(l => l.trim()).map(l => parseJSON(l)).filter(Boolean);
  } catch { return []; }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { projectPath: null, runId: null, pipelineRun: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run-id' && args[i + 1]) { result.runId = args[++i]; }
    else if (args[i] === '--pipeline-run' && args[i + 1]) { result.pipelineRun = args[++i]; }
    else if (!result.projectPath) { result.projectPath = path.resolve(args[i]); }
  }
  return result;
}

// Load pipeline runs data from project
function loadPipelineRuns(projectPath) {
  const runsFile = path.join(projectPath, '.pipeline', 'pipeline-runs.json');
  try {
    if (fs.existsSync(runsFile)) {
      return JSON.parse(fs.readFileSync(runsFile, 'utf8'));
    }
  } catch {}
  return { runs: [] };
}

// Get sessions for a specific pipeline run
function getSessionsForPipelineRun(projectPath, pipelineRunId) {
  const data = loadPipelineRuns(projectPath);
  const run = data.runs.find(r => r.runId === pipelineRunId);
  if (!run) return null;
  return run.sessions || [];
}

// List available pipeline runs
function listPipelineRuns(projectPath) {
  const data = loadPipelineRuns(projectPath);
  return data.runs.map(r => ({
    runId: r.runId,
    type: r.type,
    description: r.description,
    startedAt: r.startedAt,
    status: r.status,
    sessions: r.sessions?.length || 0
  }));
}

function findSessions(filterSessionIds = null) {
  const sessions = [];
  const searchDirs = [SESSIONS_DIR, path.join(CLAUDE_DIR, 'sessions')];
  for (const baseDir of searchDirs) {
    if (!fs.existsSync(baseDir)) continue;
    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectDir = path.join(baseDir, entry.name);
          try {
            const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'))
              .map(f => { const p = path.join(projectDir, f); try { return { path: p, mtime: fs.statSync(p).mtimeMs, sessionId: path.basename(f, '.jsonl') }; } catch { return null; } })
              .filter(Boolean);
            sessions.push(...files);
          } catch {}
        }
      }
    } catch {}
  }

  // If filter provided, only return matching sessions
  if (filterSessionIds && filterSessionIds.length > 0) {
    const filtered = sessions.filter(s => filterSessionIds.includes(s.sessionId));
    log('Filtered to ' + filtered.length + ' sessions from pipeline run');
    return filtered.sort((a, b) => b.mtime - a.mtime);
  }

  return sessions.sort((a, b) => b.mtime - a.mtime).slice(0, 20);
}

function detectPhase(sessionPath) {
  const events = parseJSONL(sessionPath);
  for (const event of events) {
    const text = String(event.message?.content || '');
    if (text.includes('Phase 0a') || text.includes('/0a-pipeline')) return '0a';
    if (text.includes('Phase 0b') || text.includes('/0b-pipeline')) return '0b';
    if (text.includes('Phase 1') || text.includes('/1-pipeline')) return '1';
    if (text.includes('Phase 2') || text.includes('/2-pipeline')) return '2';
    if (text.includes('Phase 3') || text.includes('/3-pipeline')) return '3';
  }
  return 'unknown';
}

function extractTodoSpans(sessionPath) {
  const events = parseJSONL(sessionPath);
  const spans = [], active = new Map();
  for (const event of events) {
    const ts = event.timestamp || event.created_at;
    if (event.tool_name === 'TodoWrite' || event.type === 'tool_use') {
      const todos = event.todos || event.input?.todos || [];
      for (const todo of todos) {
        const key = todo.content;
        if (todo.status === 'in_progress' && !active.has(key)) {
          active.set(key, { content: key, started_at: ts });
        } else if (todo.status === 'completed' && active.has(key)) {
          const a = active.get(key);
          spans.push({ content: key, started_at: a.started_at, completed_at: ts, duration_ms: new Date(ts) - new Date(a.started_at) });
          active.delete(key);
        }
      }
    }
  }
  return { spans, incomplete: Array.from(active.values()) };
}

function calculateMetrics(sessionPath, phase) {
  const events = parseJSONL(sessionPath);
  const todoSpans = extractTodoSpans(sessionPath);
  const first = events[0], last = events[events.length - 1];
  const start = first?.timestamp || first?.created_at, end = last?.timestamp || last?.created_at;
  const duration = start && end ? (new Date(end) - new Date(start)) / 1000 : 0;
  const toolCounts = {};
  for (const e of events) { if (e.tool_name || e.type === 'tool_use') { const t = e.tool_name || e.name || 'unknown'; toolCounts[t] = (toolCounts[t] || 0) + 1; } }
  const slowTodos = todoSpans.spans.filter(t => t.duration_ms > 60000);
  return {
    session_file: sessionPath, phase, total_duration_seconds: duration, event_count: events.length,
    tool_usage: toolCounts, todo_spans: todoSpans.spans.length,
    slow_todos: slowTodos.map(t => ({ content: t.content, duration_seconds: Math.round(t.duration_ms / 1000) })),
    incomplete_todos: todoSpans.incomplete.length
  };
}

function runDiagnosis(metrics, projectName, runId) {
  const issues = [], suggestions = [];
  const allMetrics = metrics.all_metrics || [];
  for (const m of allMetrics) {
    if (m.slow_todos?.length > 0) {
      for (const slow of m.slow_todos) {
        issues.push({ type: 'slow_todo', severity: slow.duration_seconds > 300 ? 'high' : 'medium', description: 'Slow todo took ' + slow.duration_seconds + 's', phase: m.phase });
      }
    }
    if (m.incomplete_todos > 0) issues.push({ type: 'incomplete_todos', severity: 'low', description: m.incomplete_todos + ' incomplete todos', phase: m.phase });
    const total = Object.values(m.tool_usage || {}).reduce((a, b) => a + b, 0);
    if (total > 100) issues.push({ type: 'high_tool_usage', severity: 'medium', description: 'High tool usage: ' + total + ' calls', phase: m.phase });
  }
  if (issues.some(i => i.type === 'slow_todo')) suggestions.push({ type: 'optimization', confidence: 'medium', description: 'Break down slow tasks', target: 'pipeline' });
  if (issues.some(i => i.type === 'high_tool_usage')) suggestions.push({ type: 'efficiency', confidence: 'medium', description: 'Reduce redundant tool calls', target: 'pipeline' });
  return { project: projectName, run_id: runId, analyzed_at: new Date().toISOString(), issues, suggestions, summary: { total_issues: issues.length, high_severity: issues.filter(i => i.severity === 'high').length, medium_severity: issues.filter(i => i.severity === 'medium').length, low_severity: issues.filter(i => i.severity === 'low').length } };
}

function updatePatternDB(projectName, runId, diagnosis) {
  const patternDBPath = path.join(CLAUDE_DIR, 'analysis-patterns.json');
  let db = { runs: [], patterns: [] };
  try { if (fs.existsSync(patternDBPath)) db = JSON.parse(fs.readFileSync(patternDBPath, 'utf8')); } catch {}
  db.runs.push({ project: projectName, run_id: runId, analyzed_at: new Date().toISOString(), issues_count: diagnosis?.issues?.length || 0 });
  if (db.runs.length > 50) db.runs = db.runs.slice(-50);
  if (diagnosis?.issues) {
    for (const issue of diagnosis.issues) {
      const existing = db.patterns.find(p => p.type === issue.type && p.phase === issue.phase);
      if (existing) { existing.occurrences++; existing.last_seen = new Date().toISOString(); }
      else { db.patterns.push({ id: 'pattern-' + Date.now(), type: issue.type, phase: issue.phase, description: issue.description, occurrences: 1, first_seen: new Date().toISOString(), last_seen: new Date().toISOString(), status: 'active' }); }
    }
  }
  fs.writeFileSync(patternDBPath, JSON.stringify(db, null, 2));
  log('Pattern database updated: ' + db.patterns.length + ' patterns');
}

function queueTests(analysisDir, diagnosis) {
  const tests = [];
  if (diagnosis?.suggestions) {
    for (const s of diagnosis.suggestions) {
      if (s.confidence === 'high' || s.confidence === 'medium') {
        tests.push({ id: 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), suggestion: s, status: 'pending', created_at: new Date().toISOString() });
      }
    }
  }
  fs.writeFileSync(path.join(analysisDir, 'pending-tests.json'), JSON.stringify(tests, null, 2));
  return tests;
}

async function main() {
  console.log('===== ANALYSIS PIPELINE - PHASE A =====\n');
  const { projectPath, runId: providedId, pipelineRun } = parseArgs();
  if (!projectPath) {
    console.log('Usage: node run-analysis-phase-a.cjs <project-path> [--run-id <id>] [--pipeline-run <pipeline-run-id>]');
    console.log('\nOptions:');
    console.log('  --run-id        Custom analysis run ID (default: auto-generated)');
    console.log('  --pipeline-run  Filter to sessions from a specific pipeline run');
    console.log('\nTo list available pipeline runs:');
    console.log('  node run-analysis-phase-a.cjs <project-path> --list-runs');
    process.exit(1);
  }

  // Handle --list-runs
  if (process.argv.includes('--list-runs')) {
    const runs = listPipelineRuns(projectPath);
    if (runs.length === 0) {
      console.log('No pipeline runs found. Future pipelines will be tracked after dashboards are updated.');
    } else {
      console.log('Available pipeline runs:\n');
      for (const r of runs) {
        console.log('  ' + r.runId);
        console.log('    Type: ' + r.type + ', Status: ' + r.status + ', Sessions: ' + r.sessions);
        console.log('    Started: ' + r.startedAt);
        if (r.description) console.log('    Description: ' + r.description);
        console.log('');
      }
    }
    process.exit(0);
  }

  const projectName = path.basename(projectPath), runId = providedId || 'run-' + Date.now();
  log('Project: ' + projectName);
  log('Run ID: ' + runId);

  // Get sessions (optionally filtered by pipeline run)
  let filterSessionIds = null;
  if (pipelineRun) {
    log('Filtering by pipeline run: ' + pipelineRun);
    filterSessionIds = getSessionsForPipelineRun(projectPath, pipelineRun);
    if (!filterSessionIds) {
      console.log('ERROR: Pipeline run ' + pipelineRun + ' not found.');
      console.log('Use --list-runs to see available runs.');
      process.exit(1);
    }
    log('Pipeline run has ' + filterSessionIds.length + ' sessions');
  }

  const analysisDir = path.join(projectPath, '.pipeline', 'analysis', runId);
  fs.mkdirSync(analysisDir, { recursive: true });
  log('Analysis directory: ' + analysisDir);
  log('Finding sessions...');
  const sessions = findSessions(filterSessionIds);
  log('Found ' + sessions.length + ' sessions');
  const phaseMetrics = {}, allMetrics = [];
  for (const session of sessions.slice(0, 10)) {
    log('Processing: ' + path.basename(session.path));
    const phase = detectPhase(session.path), metrics = calculateMetrics(session.path, phase);
    if (metrics) { allMetrics.push(metrics); if (!phaseMetrics[phase]) phaseMetrics[phase] = []; phaseMetrics[phase].push(metrics); }
  }
  log('Metrics extracted: ' + allMetrics.length);
  const metricsData = { project: projectName, run_id: runId, phases: phaseMetrics, all_metrics: allMetrics, phase_metrics: { total_duration_seconds: allMetrics.reduce((s, m) => s + (m.total_duration_seconds || 0), 0) } };
  fs.writeFileSync(path.join(analysisDir, 'layer1-metrics.json'), JSON.stringify(metricsData, null, 2));
  log('Running diagnosis...');
  const diagnosis = runDiagnosis(metricsData, projectName, runId);
  fs.writeFileSync(path.join(analysisDir, 'layer2-diagnosis.json'), JSON.stringify(diagnosis, null, 2));
  log('Issues: ' + diagnosis.issues.length + ', Suggestions: ' + diagnosis.suggestions.length);
  log('Updating pattern database...');
  updatePatternDB(projectName, runId, diagnosis);
  log('Queueing tests...');
  const tests = queueTests(analysisDir, diagnosis);
  log('Queued ' + tests.length + ' tests');
  const report = {
    version: '6.0',
    phase: 'A',
    status: 'complete',
    generated_at: new Date().toISOString(),
    project: projectName,
    run_id: runId,
    pipeline_run: pipelineRun || null,
    sessions_analyzed: sessions.length,
    phase_metrics: phaseMetrics,
    issues_found: diagnosis.issues.length,
    issues: diagnosis.issues,
    suggestions: diagnosis.suggestions,
    pending_tests: tests.length
  };
  fs.writeFileSync(path.join(analysisDir, 'phase-a-report.json'), JSON.stringify(report, null, 2));
  console.log('\n===== PHASE A COMPLETE =====');
  console.log('Sessions: ' + sessions.length + ', Issues: ' + report.issues_found + ', Tests queued: ' + tests.length);
  console.log('Report: ' + path.join(analysisDir, 'phase-a-report.json'));
  console.log('\nANALYSIS:PHASE-A-COMPLETE');
}

main().catch(err => { console.error('Phase A failed:', err); process.exit(1); });
