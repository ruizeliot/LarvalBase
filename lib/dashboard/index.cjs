/**
 * Dashboard Module - Public API
 *
 * Main entry point for the Dashboard Renderer module.
 * Provides terminal UI rendering, keyboard input handling, and layout utilities.
 *
 * @module lib/dashboard
 * @version 11.0.0
 */

'use strict';

const { colors, SYMBOLS, BOX, RESET, FG, BG, STYLE } = require('./colors.cjs');
const {
  DEFAULT_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
  getTerminalSize,
  horizontalLine,
  boxTop,
  boxBottom,
  boxRow,
  boxSeparator,
  pad,
  truncate,
  progressBar,
  columns,
  headerRow
} = require('./layout.cjs');
const {
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
} = require('./render.cjs');
const {
  KEYS,
  createInputHandler,
  prompt,
  confirm,
  select
} = require('./input.cjs');

/**
 * Clear terminal screen
 */
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

/**
 * Move cursor to position
 * @param {number} row - Row (1-based)
 * @param {number} col - Column (1-based)
 */
function moveCursor(row, col) {
  process.stdout.write(`\x1b[${row};${col}H`);
}

/**
 * Hide cursor
 */
function hideCursor() {
  process.stdout.write('\x1b[?25l');
}

/**
 * Show cursor
 */
function showCursor() {
  process.stdout.write('\x1b[?25h');
}

/**
 * Create a dashboard instance with refresh capability
 * @param {Object} options - Dashboard options
 * @returns {Object} Dashboard controller
 */
function createDashboard(options = {}) {
  const { refreshInterval = 1000 } = options;
  let intervalId = null;
  let manifest = null;
  let inputHandler = null;

  /**
   * Update manifest and re-render
   * @param {Object} newManifest - Updated manifest
   */
  function update(newManifest) {
    manifest = newManifest;
    redraw();
  }

  /**
   * Redraw the dashboard
   */
  function redraw() {
    if (!manifest) return;

    clearScreen();
    console.log(render(manifest));
  }

  /**
   * Start dashboard with auto-refresh
   * @param {Object} initialManifest - Initial manifest
   * @param {Object} callbacks - Input callbacks
   */
  function start(initialManifest, callbacks = {}) {
    manifest = initialManifest;

    hideCursor();
    clearScreen();

    // Initial render
    console.log(render(manifest));

    // Set up auto-refresh
    if (refreshInterval > 0) {
      intervalId = setInterval(redraw, refreshInterval);
    }

    // Set up input handling
    inputHandler = createInputHandler({
      ...callbacks,
      onQuit: () => {
        stop();
        callbacks.onQuit?.();
      }
    });
    inputHandler.start();
  }

  /**
   * Stop dashboard
   */
  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    if (inputHandler) {
      inputHandler.stop();
      inputHandler = null;
    }

    showCursor();
  }

  /**
   * Check if dashboard is running
   */
  function isRunning() {
    return intervalId !== null;
  }

  return {
    start,
    stop,
    update,
    redraw,
    isRunning
  };
}

// Export public API
module.exports = {
  // Colors
  colors,
  SYMBOLS,
  BOX,
  RESET,
  FG,
  BG,
  STYLE,

  // Layout
  DEFAULT_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
  getTerminalSize,
  horizontalLine,
  boxTop,
  boxBottom,
  boxRow,
  boxSeparator,
  pad,
  truncate,
  progressBar,
  columns,
  headerRow,

  // Rendering
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
  formatDuration,

  // Input
  KEYS,
  createInputHandler,
  prompt,
  confirm,
  select,

  // Terminal utilities
  clearScreen,
  moveCursor,
  hideCursor,
  showCursor,

  // Dashboard controller
  createDashboard
};
