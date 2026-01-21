/**
 * Orchestrator Module
 *
 * Main orchestration system for pipeline v11.
 * Composes state machine, events, and handlers.
 *
 * @module lib/orchestrator
 * @version 11.0.0
 */

'use strict';

// Core components
const { EVENTS, EventEmitter, EventHistory } = require('./events.cjs');
const { STATES, TRANSITIONS, StateMachine } = require('./state-machine.cjs');

// Handlers
const startup = require('./handlers/startup.cjs');
const phaseTransition = require('./handlers/phase-transition.cjs');
const { WorkerMonitor, parseTodos, formatTodo, formatProgressBar } = require('./handlers/worker-monitor.cjs');
const {
  ERROR_SEVERITY,
  ERROR_PATTERNS,
  RECOVERY_STRATEGIES,
  classifyError,
  ErrorContext,
  handleError,
  formatError
} = require('./handlers/error-handler.cjs');
const shutdown = require('./handlers/shutdown.cjs');
const supervisorCheck = require('./supervisor-check.cjs');

// Runner
const { DEFAULT_CONFIG, OrchestratorRunner, run } = require('./runner.cjs');

/**
 * Create a new orchestrator instance
 * @param {string} projectPath - Project root path
 * @param {Object} [options] - Configuration options
 * @returns {OrchestratorRunner} Orchestrator instance
 */
function createOrchestrator(projectPath, options = {}) {
  return new OrchestratorRunner(projectPath, options);
}

/**
 * Quick start orchestrator and run to completion
 * @param {string} projectPath - Project root path
 * @param {Object} [options] - Run options
 * @returns {Promise<Object>} Run result
 */
async function quickStart(projectPath, options = {}) {
  return run(projectPath, options);
}

module.exports = {
  // Runner
  DEFAULT_CONFIG,
  OrchestratorRunner,
  createOrchestrator,
  quickStart,
  run,

  // Events
  EVENTS,
  EventEmitter,
  EventHistory,

  // State Machine
  STATES,
  TRANSITIONS,
  StateMachine,

  // Handlers
  startup,
  phaseTransition,
  WorkerMonitor,
  parseTodos,
  formatTodo,
  formatProgressBar,

  // Error handling
  ERROR_SEVERITY,
  ERROR_PATTERNS,
  RECOVERY_STRATEGIES,
  classifyError,
  ErrorContext,
  handleError,
  formatError,

  // Shutdown
  shutdown,

  // Supervisor Check
  supervisorCheck
};
