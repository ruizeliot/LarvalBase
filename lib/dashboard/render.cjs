/**
 * Dashboard Render Module
 *
 * Main rendering logic for the dashboard terminal UI.
 */

'use strict';

const { colors, SYMBOLS } = require('./colors.cjs');
const {
  getTerminalSize,
  boxTop,
  boxBottom,
  boxRow,
  boxSeparator,
  pad,
  progressBar,
  headerRow
} = require('./layout.cjs');

/**
 * Get phase status symbol and color
 * @param {string} status - Phase status
 * @returns {{ symbol: string, colorFn: Function }}
 */
function getPhaseStyle(status) {
  switch (status) {
    case 'complete':
      return { symbol: SYMBOLS.checkmark, colorFn: colors.complete };
    case 'running':
      return { symbol: SYMBOLS.arrow, colorFn: colors.running };
    case 'failed':
      return { symbol: SYMBOLS.cross, colorFn: colors.failed };
    case 'skipped':
      return { symbol: '-', colorFn: colors.skipped };
    case 'pending':
    default:
      return { symbol: SYMBOLS.circle, colorFn: colors.pending };
  }
}

/**
 * Format cost for display
 * @param {number} cost - Cost in dollars
 * @returns {string}
 */
function formatCost(cost) {
  return colors.cost(`${SYMBOLS.lightning} $${cost.toFixed(2)}`);
}

/**
 * Format duration for display
 * @param {number} ms - Duration in milliseconds
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Render header section
 * @param {Object} manifest - Pipeline manifest
 * @param {number} width - Render width
 * @returns {string[]}
 */
function renderHeader(manifest, width) {
  const lines = [];

  // Title and version
  const title = colors.header(`PIPELINE v${manifest.version}`);

  // Project name
  const projectName = colors.accent(manifest.project?.name || 'Unknown');

  // Current phase
  const phase = manifest.currentPhase
    ? `Phase ${manifest.currentPhase}/5`
    : 'Not started';

  // Current epic (for Phase 4)
  let epicInfo = '';
  if (manifest.currentPhase === '4' && manifest.currentEpic) {
    const epicStatuses = manifest.phases?.['4']?.epicStatuses || [];
    epicInfo = `Epic ${manifest.currentEpic}/${epicStatuses.length}`;
  }

  // Cost
  const cost = formatCost(manifest.totalCost || 0);

  // Build stats array
  const stats = [projectName, phase];
  if (epicInfo) stats.push(epicInfo);
  stats.push(cost);

  lines.push(boxTop(width));
  lines.push(headerRow(title, stats, width));
  lines.push(boxSeparator(width));

  return lines;
}

/**
 * Render phases section
 * @param {Object} manifest - Pipeline manifest
 * @param {number} width - Render width
 * @returns {string[]}
 */
function renderPhases(manifest, width) {
  const lines = [];

  lines.push(boxRow(colors.label('PHASES'), width));

  // Phase display (phases 2-5, no phase 1 in v11)
  const phaseNames = {
    '2': 'Discovery',
    '3': 'Tests',
    '4': 'Impl',
    '5': 'Quality'
  };

  const phaseDisplay = ['2', '3', '4', '5'].map(p => {
    const phase = manifest.phases?.[p] || { status: 'pending' };
    const { symbol, colorFn } = getPhaseStyle(phase.status);
    const name = phaseNames[p];

    return colorFn(`[${p}] ${name} ${symbol}`);
  }).join('    ');

  lines.push(boxRow(phaseDisplay, width));

  // Show brainstorm status if not complete
  if (!manifest.brainstorm?.completed) {
    lines.push(boxRow('', width));
    lines.push(boxRow(
      colors.warning('⚠ Brainstorm not complete - run /brainstorm first'),
      width
    ));
  }

  lines.push(boxSeparator(width));

  return lines;
}

/**
 * Render current epic section (for Phase 4)
 * @param {Object} manifest - Pipeline manifest
 * @param {number} width - Render width
 * @returns {string[]}
 */
function renderCurrentEpic(manifest, width) {
  const lines = [];

  if (manifest.currentPhase !== '4') {
    return lines;
  }

  const phase4 = manifest.phases?.['4'] || {};
  const epicStatuses = phase4.epicStatuses || [];

  if (epicStatuses.length === 0) {
    return lines;
  }

  const currentEpicId = phase4.currentEpic || manifest.currentEpic;
  const currentEpic = epicStatuses.find(e => e.id === currentEpicId);

  lines.push(boxRow(colors.label('CURRENT EPIC: ') + colors.value(currentEpic?.name || `Epic ${currentEpicId}`), width));
  lines.push(boxRow('', width));

  // Show epic stories/tasks
  for (const epic of epicStatuses) {
    const { symbol, colorFn } = getPhaseStyle(epic.status);
    const prefix = epic.id === currentEpicId ? colors.highlight('├── ') : colors.muted('├── ');
    const name = epic.name || `Epic ${epic.id}`;

    lines.push(boxRow(prefix + colorFn(`${name} ${symbol}`), width));
  }

  lines.push(boxSeparator(width));

  return lines;
}

/**
 * Render worker section
 * @param {Object} manifest - Pipeline manifest
 * @param {number} width - Render width
 * @returns {string[]}
 */
function renderWorkers(manifest, width) {
  const lines = [];

  const currentWorker = manifest.workers?.current;
  const supervisor = manifest.workers?.supervisor;

  // Worker status
  const workerStatus = currentWorker
    ? colors.success('Running')
    : colors.muted('Not running');
  const workerPid = currentWorker ? colors.muted(` │ PID: ${currentWorker.pid}`) : '';

  // Heartbeat status
  let heartbeatStr = '';
  if (currentWorker && manifest.heartbeat?.lastSeen) {
    const lastSeen = new Date(manifest.heartbeat.lastSeen);
    const ago = Math.round((Date.now() - lastSeen.getTime()) / 1000);
    heartbeatStr = colors.muted(` │ Last heartbeat: ${ago}s ago`);
  }

  lines.push(boxRow(
    colors.label('WORKER: ') + workerStatus + workerPid + heartbeatStr,
    width
  ));

  // Supervisor status
  const supervisorStatus = supervisor
    ? colors.success('Running')
    : colors.muted('Not running');
  const supervisorPid = supervisor ? colors.muted(` │ PID: ${supervisor.pid}`) : '';

  lines.push(boxRow(
    colors.label('SUPERVISOR: ') + supervisorStatus + supervisorPid,
    width
  ));

  lines.push(boxSeparator(width));

  return lines;
}

/**
 * Render footer with key bindings
 * @param {number} width - Render width
 * @returns {string[]}
 */
function renderFooter(width) {
  const lines = [];

  const keys = [
    colors.key('[Q]') + 'uit',
    colors.key('[P]') + 'ause',
    colors.key('[R]') + 'esume',
    colors.key('[K]') + 'ill Worker',
    colors.key('[1-5]') + ' Expand Phase'
  ];

  lines.push(boxRow(keys.join('  '), width));
  lines.push(boxBottom(width));

  return lines;
}

/**
 * Render full dashboard
 * @param {Object} manifest - Pipeline manifest
 * @param {Object} options - Render options
 * @returns {string}
 */
function render(manifest, options = {}) {
  const { width } = options.terminalSize || getTerminalSize();
  const lines = [];

  lines.push(...renderHeader(manifest, width));
  lines.push(...renderPhases(manifest, width));
  lines.push(...renderCurrentEpic(manifest, width));
  lines.push(...renderWorkers(manifest, width));
  lines.push(...renderFooter(width));

  return lines.join('\n');
}

/**
 * Render compact single-line status
 * @param {Object} manifest - Pipeline manifest
 * @returns {string}
 */
function renderCompact(manifest) {
  const project = manifest.project?.name || 'Unknown';
  const phase = manifest.currentPhase ? `P${manifest.currentPhase}` : 'idle';
  const status = manifest.status || 'pending';
  const cost = `$${(manifest.totalCost || 0).toFixed(2)}`;

  const { colorFn } = getPhaseStyle(status === 'running' ? 'running' : status);

  return `${colors.accent(project)} ${colorFn(`[${phase}]`)} ${colors.cost(cost)}`;
}

/**
 * Render expanded phase detail
 * @param {Object} manifest - Pipeline manifest
 * @param {string} phase - Phase to expand ('2', '3', '4', '5')
 * @param {number} width - Render width
 * @returns {string}
 */
function renderPhaseDetail(manifest, phase, width = 80) {
  const lines = [];
  const phaseData = manifest.phases?.[phase] || { status: 'pending' };

  const phaseNames = {
    '2': 'Discovery & Planning',
    '3': 'Test Architecture',
    '4': 'Implementation',
    '5': 'Quality & Finalization'
  };

  lines.push(boxTop(width));
  lines.push(boxRow(colors.header(`Phase ${phase}: ${phaseNames[phase]}`), width));
  lines.push(boxSeparator(width));

  // Status
  const { symbol, colorFn } = getPhaseStyle(phaseData.status);
  lines.push(boxRow(colors.label('Status: ') + colorFn(`${phaseData.status} ${symbol}`), width));

  // Timing
  if (phaseData.startedAt) {
    lines.push(boxRow(colors.label('Started: ') + colors.value(phaseData.startedAt), width));
  }
  if (phaseData.completedAt) {
    lines.push(boxRow(colors.label('Completed: ') + colors.value(phaseData.completedAt), width));
  }
  if (phaseData.duration) {
    lines.push(boxRow(colors.label('Duration: ') + colors.value(formatDuration(phaseData.duration)), width));
  }

  // Cost
  if (phaseData.cost) {
    lines.push(boxRow(colors.label('Cost: ') + formatCost(phaseData.cost), width));
  }

  // Phase 4 specific: epic statuses
  if (phase === '4' && phaseData.epicStatuses?.length > 0) {
    lines.push(boxSeparator(width));
    lines.push(boxRow(colors.label('EPICS'), width));

    for (const epic of phaseData.epicStatuses) {
      const { symbol: epicSymbol, colorFn: epicColorFn } = getPhaseStyle(epic.status);
      lines.push(boxRow(
        `  ${epicColorFn(`${epic.name || `Epic ${epic.id}`} ${epicSymbol}`)}`,
        width
      ));
    }
  }

  lines.push(boxBottom(width));

  return lines.join('\n');
}

module.exports = {
  render,
  renderCompact,
  renderPhaseDetail,
  renderHeader,
  renderPhases,
  renderCurrentEpic,
  renderWorkers,
  renderFooter,
  getPhaseStyle,
  formatCost,
  formatDuration
};
