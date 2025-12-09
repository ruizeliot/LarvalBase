/**
 * dashboard-core.cjs - Extracted testable functions from dashboard
 *
 * Pure functions that can be unit tested without side effects.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ============ CONSTANTS ============

const PHASE_ORDER = ['1', '2', '3', '4', '5'];

const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

const PHASE_TIMEOUTS = {
  '1': 60 * 60 * 1000,    // 60 min
  '2': 15 * 60 * 1000,    // 15 min
  '3': 45 * 60 * 1000,    // 45 min
  '4': 90 * 60 * 1000,    // 90 min
  '5': 30 * 60 * 1000     // 30 min
};

// Opus 4.5 pricing per 1M tokens (Dec 2025)
const PRICING = {
  input: 5.00,        // $5/1M input
  output: 25.00,      // $25/1M output
  cacheWrite: 6.25,   // $6.25/1M cache write
  cacheRead: 0.50     // $0.50/1M cache read
};

// ============ MODE FUNCTIONS ============

/**
 * Get the phase sequence for a given pipeline mode
 * @param {string} mode - 'new', 'feature', or 'fix'
 * @returns {string[]} Array of phase numbers
 */
function getPhaseSequence(mode) {
  switch (mode) {
    case 'new':
      return ['1', '2', '3', '4', '5'];
    case 'feature':
      return ['1', '2', '3'];
    case 'fix':
      return ['2'];
    default:
      return ['1', '2', '3', '4', '5']; // Default to 'new'
  }
}

/**
 * Validate a pipeline mode
 * @param {string} mode - Mode to validate
 * @returns {boolean} True if valid
 */
function isValidMode(mode) {
  return ['new', 'feature', 'fix'].includes(mode);
}

/**
 * Get the default mode
 * @returns {string} Default mode ('new')
 */
function getDefaultMode() {
  return 'new';
}

// ============ TIME FUNCTIONS ============

/**
 * Format milliseconds to human-readable time
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time (e.g., "5m 30s")
 */
function formatTime(ms) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + 'm ' + s.toString().padStart(2, '0') + 's';
}

/**
 * Get phase timeout in milliseconds
 * @param {string} phase - Phase number
 * @returns {number} Timeout in ms
 */
function getPhaseTimeout(phase) {
  return PHASE_TIMEOUTS[phase] || 60 * 60 * 1000; // Default 1 hour
}

// ============ COST FUNCTIONS ============

/**
 * Format cost in USD
 * @param {number|string} usd - Cost value
 * @returns {string} Formatted cost (e.g., "$1.234")
 */
function formatCost(usd) {
  return '$' + parseFloat(usd || 0).toFixed(3);
}

/**
 * Format token count
 * @param {number} count - Token count
 * @returns {string} Formatted count (e.g., "1.5M", "500K", "100")
 */
function formatTokens(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return String(count);
}

/**
 * Calculate cost from token counts using Opus 4.5 pricing
 * @param {object} tokens - Token counts { input, output, cacheWrite, cacheRead }
 * @returns {number} Cost in USD
 */
function calculateCost(tokens) {
  const input = (tokens.input || 0) / 1000000 * PRICING.input;
  const output = (tokens.output || 0) / 1000000 * PRICING.output;
  const cacheWrite = (tokens.cacheWrite || 0) / 1000000 * PRICING.cacheWrite;
  const cacheRead = (tokens.cacheRead || 0) / 1000000 * PRICING.cacheRead;
  return input + output + cacheWrite + cacheRead;
}

/**
 * Generate ccusage session ID from project path
 * @param {string} projectPath - Project path
 * @returns {string} Session ID
 */
function generateCcusageSessionId(projectPath) {
  const normalized = projectPath.replace(/\\/g, '/');
  return normalized.replace(/^\//, '').replace(/:/g, '-').replace(/\//g, '-').replace(/ /g, '-');
}

// ============ SESSION FUNCTIONS ============

/**
 * Generate a new session ID (UUID)
 * @returns {string} UUID
 */
function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * Get the todo file path for a session ID
 * @param {string} sessionId - Session ID
 * @param {string} todosDir - Base todos directory
 * @returns {string|null} Todo file path or null
 */
function getWorkerTodoFilePath(sessionId, todosDir) {
  if (!sessionId || !todosDir) return null;
  return path.join(todosDir, sessionId + '-agent-' + sessionId + '.json');
}

// ============ PHASE FUNCTIONS ============

/**
 * Get the next phase in sequence
 * @param {string} currentPhase - Current phase number
 * @returns {string|null} Next phase or null if last
 */
function getNextPhase(currentPhase) {
  const idx = PHASE_ORDER.indexOf(currentPhase);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

/**
 * Get phase name by number
 * @param {string} phase - Phase number
 * @returns {string} Phase name
 */
function getPhaseName(phase) {
  return PHASE_NAMES[phase] || 'Unknown';
}

/**
 * Check if a phase is valid
 * @param {string} phase - Phase number
 * @returns {boolean} True if valid
 */
function isValidPhase(phase) {
  return PHASE_ORDER.includes(phase);
}

// ============ TODO PARSING ============

/**
 * Parse todo items from an array
 * @param {Array} todos - Raw todo array
 * @returns {object} Parsed stats { pending, inProgress, completed, total, items }
 */
function parseTodoStats(todos) {
  if (!Array.isArray(todos)) {
    return { pending: 0, inProgress: 0, completed: 0, total: 0, items: [] };
  }

  return {
    pending: todos.filter(t => t && t.status === 'pending').length,
    inProgress: todos.filter(t => t && t.status === 'in_progress').length,
    completed: todos.filter(t => t && t.status === 'completed').length,
    total: todos.length,
    items: todos.map(t => ({
      content: t && t.content || '',
      status: t && t.status || 'pending'
    }))
  };
}

/**
 * Check if all todos are complete
 * @param {object} stats - Todo stats from parseTodoStats
 * @returns {boolean} True if all complete
 */
function areTodosComplete(stats) {
  return stats.total > 0 && stats.completed === stats.total;
}

/**
 * Calculate completion percentage
 * @param {object} stats - Todo stats
 * @returns {number} Percentage 0-100
 */
function getCompletionPercentage(stats) {
  if (stats.total === 0) return 0;
  return Math.round((stats.completed / stats.total) * 100);
}

// ============ CLI ARGUMENT PARSING ============

/**
 * Parse CLI arguments
 * @param {string[]} args - CLI arguments (process.argv.slice(2))
 * @returns {object} Parsed options
 */
function parseCliArgs(args) {
  const options = {
    mode: 'new',
    noTimeout: false,
    verbose: false,
    budget: null,
    maxRestarts: 3,
    resume: false,
    resumeSession: false,
    phase: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--mode' && args[i + 1]) {
      options.mode = args[i + 1];
      i++;
    } else if (arg === '--no-timeout') {
      options.noTimeout = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--budget' && args[i + 1]) {
      const budget = parseFloat(args[i + 1]);
      if (!isNaN(budget) && budget > 0) {
        options.budget = budget;
      }
      i++;
    } else if (arg === '--max-restarts' && args[i + 1]) {
      const restarts = parseInt(args[i + 1]);
      if (!isNaN(restarts) && restarts >= 0) {
        options.maxRestarts = restarts;
      }
      i++;
    } else if (arg === '--resume') {
      options.resume = true;
    } else if (arg === '--resume-session') {
      options.resumeSession = true;
    } else if (arg === '--phase' && args[i + 1]) {
      options.phase = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

// ============ MANIFEST FUNCTIONS ============

/**
 * Create initial manifest object
 * @param {string} projectId - Project ID
 * @param {string} projectPath - Project path
 * @param {string} mode - Pipeline mode
 * @returns {object} Manifest object
 */
function createManifest(projectId, projectPath, mode = 'new') {
  const phases = {};
  const sequence = getPhaseSequence(mode);
  for (const phase of sequence) {
    phases[phase] = { status: 'pending' };
  }

  return {
    projectId,
    projectPath,
    currentPhase: sequence[0],
    status: 'running',
    mode,
    createdAt: new Date().toISOString(),
    phases
  };
}

/**
 * Validate manifest structure
 * @param {object} manifest - Manifest to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateManifest(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest is not an object'] };
  }

  if (!manifest.projectId) {
    errors.push('Missing projectId');
  }

  if (!manifest.phases || typeof manifest.phases !== 'object' || Array.isArray(manifest.phases)) {
    errors.push('Missing or invalid phases object');
  }

  if (!manifest.currentPhase) {
    errors.push('Missing currentPhase');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Save manifest to file with backup
 * @param {string} manifestPath - Path to manifest file
 * @param {object} manifest - Manifest object to save
 */
function saveManifest(manifestPath, manifest) {
  // Create backup if file exists
  if (fs.existsSync(manifestPath)) {
    const backupPath = manifestPath + '.backup';
    fs.copyFileSync(manifestPath, backupPath);
  }

  // Ensure directory exists
  const dir = path.dirname(manifestPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Load manifest with recovery from backup if main is corrupt
 * @param {string} manifestPath - Path to manifest file
 * @returns {object|null} Manifest object or null if unrecoverable
 */
function loadManifestWithRecovery(manifestPath) {
  // Try main manifest first
  if (fs.existsSync(manifestPath)) {
    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      if (content.trim()) {
        return JSON.parse(content);
      }
    } catch (e) {
      // Main is corrupt, try backup
    }
  }

  // Try backup
  const backupPath = manifestPath + '.backup';
  if (fs.existsSync(backupPath)) {
    try {
      const content = fs.readFileSync(backupPath, 'utf8');
      if (content.trim()) {
        return JSON.parse(content);
      }
    } catch (e) {
      // Backup also corrupt
    }
  }

  return null;
}

// ============ EPIC FUNCTIONS ============

/**
 * Get epics from manifest
 * @param {object} manifest - Manifest object
 * @returns {Array} Epic array
 */
function getEpicsFromManifest(manifest) {
  if (!manifest || !manifest.phases) return [];

  // Check phase 4 for epicLoops (newer format)
  if (manifest.phases['4'] && manifest.phases['4'].epicLoops) {
    return manifest.phases['4'].epicLoops;
  }

  // Check phase 2 for loops (older format)
  if (manifest.phases['2'] && manifest.phases['2'].loops) {
    return manifest.phases['2'].loops;
  }

  return [];
}

/**
 * Get next pending epic
 * @param {Array} epics - Epic array
 * @returns {object|null} Next pending epic or null
 */
function getNextEpic(epics) {
  if (!Array.isArray(epics)) return null;
  return epics.find(e => e && e.status !== 'complete') || null;
}

/**
 * Check if all epics are complete
 * @param {Array} epics - Epic array
 * @returns {boolean} True if all complete or empty
 */
function allEpicsComplete(epics) {
  if (!Array.isArray(epics) || epics.length === 0) return true;
  return epics.every(e => e && e.status === 'complete');
}

// ============ PROGRESS BAR ============

/**
 * Generate a progress bar string
 * @param {number} percentage - Percentage 0-100
 * @param {number} width - Bar width in characters
 * @returns {string} Progress bar string
 */
function renderProgressBar(percentage, width = 20) {
  const filled = Math.floor(percentage / (100 / width));
  const empty = width - filled;
  return '#'.repeat(filled) + '.'.repeat(empty);
}

// ============ BUDGET CHECK ============

/**
 * Check if budget has been exceeded
 * @param {number} currentCost - Current cost in USD
 * @param {number|null} budgetLimit - Budget limit or null for no limit
 * @returns {object} { exceeded: boolean, remaining: number|null, percentage: number|null }
 */
function checkBudget(currentCost, budgetLimit) {
  if (budgetLimit === null) {
    return { exceeded: false, remaining: null, percentage: null };
  }

  const remaining = budgetLimit - currentCost;
  const percentage = Math.round((currentCost / budgetLimit) * 100);

  return {
    exceeded: currentCost >= budgetLimit,
    remaining: Math.max(0, remaining),
    percentage
  };
}

// ============ EXPORTS ============

module.exports = {
  // Constants
  PHASE_ORDER,
  PHASE_NAMES,
  PHASE_TIMEOUTS,
  PRICING,

  // Mode functions
  getPhaseSequence,
  isValidMode,
  getDefaultMode,

  // Time functions
  formatTime,
  getPhaseTimeout,

  // Cost functions
  formatCost,
  formatTokens,
  calculateCost,
  generateCcusageSessionId,

  // Session functions
  generateSessionId,
  getWorkerTodoFilePath,

  // Phase functions
  getNextPhase,
  getPhaseName,
  isValidPhase,

  // Todo functions
  parseTodoStats,
  areTodosComplete,
  getCompletionPercentage,

  // CLI functions
  parseCliArgs,

  // Manifest functions
  createManifest,
  validateManifest,
  saveManifest,
  loadManifestWithRecovery,

  // Epic functions
  getEpicsFromManifest,
  getNextEpic,
  allEpicsComplete,

  // UI functions
  renderProgressBar,

  // Budget functions
  checkBudget
};
