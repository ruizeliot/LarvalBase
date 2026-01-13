/**
 * Dashboard Input Module
 *
 * Keyboard input handling for the dashboard.
 */

'use strict';

const readline = require('readline');

// Key definitions
const KEYS = {
  QUIT: 'q',
  PAUSE: 'p',
  RESUME: 'r',
  KILL: 'k',
  REFRESH: 'f',
  EXPAND_PHASE_2: '2',
  EXPAND_PHASE_3: '3',
  EXPAND_PHASE_4: '4',
  EXPAND_PHASE_5: '5',
  ESCAPE: '\x1b',
  CTRL_C: '\x03'
};

/**
 * Create keyboard input handler
 * @param {Object} callbacks - Event callbacks
 * @param {Function} callbacks.onQuit - Called when quit key pressed
 * @param {Function} callbacks.onPause - Called when pause key pressed
 * @param {Function} callbacks.onResume - Called when resume key pressed
 * @param {Function} callbacks.onKill - Called when kill key pressed
 * @param {Function} callbacks.onRefresh - Called when refresh key pressed
 * @param {Function} callbacks.onExpandPhase - Called with phase number when expand key pressed
 * @returns {Object} Input handler with start/stop methods
 */
function createInputHandler(callbacks = {}) {
  let rl = null;
  let isRunning = false;

  /**
   * Handle keypress event
   * @param {string} key - The pressed key
   */
  function handleKeypress(key) {
    if (!key) return;

    const lowerKey = key.toLowerCase();

    switch (lowerKey) {
      case KEYS.QUIT:
      case KEYS.CTRL_C:
        callbacks.onQuit?.();
        break;

      case KEYS.PAUSE:
        callbacks.onPause?.();
        break;

      case KEYS.RESUME:
        callbacks.onResume?.();
        break;

      case KEYS.KILL:
        callbacks.onKill?.();
        break;

      case KEYS.REFRESH:
        callbacks.onRefresh?.();
        break;

      case KEYS.EXPAND_PHASE_2:
      case KEYS.EXPAND_PHASE_3:
      case KEYS.EXPAND_PHASE_4:
      case KEYS.EXPAND_PHASE_5:
        callbacks.onExpandPhase?.(lowerKey);
        break;

      case KEYS.ESCAPE:
        callbacks.onEscape?.();
        break;

      default:
        // Unknown key - ignore
        break;
    }
  }

  /**
   * Start listening for input
   */
  function start() {
    if (isRunning) return;

    // Check if stdin is a TTY
    if (!process.stdin.isTTY) {
      console.warn('Warning: stdin is not a TTY, keyboard input disabled');
      return;
    }

    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    // Enable raw mode to capture single keypresses
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    process.stdin.resume();

    // Listen for data events (raw keypresses)
    process.stdin.on('data', handleKeypress);

    isRunning = true;
  }

  /**
   * Stop listening for input
   */
  function stop() {
    if (!isRunning) return;

    process.stdin.removeListener('data', handleKeypress);

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }

    if (rl) {
      rl.close();
      rl = null;
    }

    isRunning = false;
  }

  /**
   * Check if input handler is running
   * @returns {boolean}
   */
  function isActive() {
    return isRunning;
  }

  return {
    start,
    stop,
    isActive,
    KEYS
  };
}

/**
 * Simple prompt for single input
 * @param {string} question - Question to ask
 * @returns {Promise<string>}
 */
function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Confirmation prompt (y/n)
 * @param {string} question - Question to ask
 * @param {boolean} defaultValue - Default value if enter pressed
 * @returns {Promise<boolean>}
 */
async function confirm(question, defaultValue = false) {
  const suffix = defaultValue ? ' [Y/n]: ' : ' [y/N]: ';
  const answer = await prompt(question + suffix);

  if (answer === '') return defaultValue;

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Selection prompt
 * @param {string} question - Question to ask
 * @param {string[]} options - Options to choose from
 * @returns {Promise<number>} - Index of selected option
 */
async function select(question, options) {
  console.log(question);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt}`);
  });

  while (true) {
    const answer = await prompt('Enter number: ');
    const num = parseInt(answer, 10);

    if (num >= 1 && num <= options.length) {
      return num - 1;
    }

    console.log(`Please enter a number between 1 and ${options.length}`);
  }
}

module.exports = {
  KEYS,
  createInputHandler,
  prompt,
  confirm,
  select
};
