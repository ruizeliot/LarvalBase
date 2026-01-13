/**
 * Shutdown Handler
 *
 * Handles graceful shutdown of orchestrator and child processes.
 *
 * @module lib/orchestrator/handlers/shutdown
 * @version 11.0.0
 */

'use strict';

/**
 * Default shutdown configuration
 */
const DEFAULT_CONFIG = {
  gracePeriodMs: 10000,    // 10 seconds grace period
  forceKillDelayMs: 5000,  // 5 seconds before force kill
  saveStateOnShutdown: true
};

/**
 * Shutdown reason codes
 */
const SHUTDOWN_REASONS = {
  USER_QUIT: 'USER_QUIT',
  PIPELINE_COMPLETE: 'PIPELINE_COMPLETE',
  FATAL_ERROR: 'FATAL_ERROR',
  SIGNAL: 'SIGNAL',
  TIMEOUT: 'TIMEOUT',
  MANUAL: 'MANUAL'
};

/**
 * Shutdown state
 */
class ShutdownState {
  constructor() {
    this.isShuttingDown = false;
    this.startTime = null;
    this.reason = null;
    this.completedSteps = [];
    this.pendingSteps = [];
    this.errors = [];
  }

  /**
   * Start shutdown
   * @param {string} reason - Shutdown reason
   */
  start(reason) {
    this.isShuttingDown = true;
    this.startTime = Date.now();
    this.reason = reason;
  }

  /**
   * Mark step as complete
   * @param {string} step - Step name
   */
  completeStep(step) {
    this.completedSteps.push({
      step,
      timestamp: Date.now()
    });
    this.pendingSteps = this.pendingSteps.filter(s => s !== step);
  }

  /**
   * Add pending step
   * @param {string} step - Step name
   */
  addPendingStep(step) {
    if (!this.pendingSteps.includes(step)) {
      this.pendingSteps.push(step);
    }
  }

  /**
   * Record error
   * @param {string} step - Step name
   * @param {Error} error - Error object
   */
  recordError(step, error) {
    this.errors.push({
      step,
      error: error.message,
      timestamp: Date.now()
    });
  }

  /**
   * Check if shutdown complete
   * @returns {boolean}
   */
  isComplete() {
    return this.pendingSteps.length === 0;
  }

  /**
   * Get elapsed time
   * @returns {number} Milliseconds since shutdown started
   */
  getElapsed() {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Get summary
   * @returns {Object} Shutdown summary
   */
  getSummary() {
    return {
      reason: this.reason,
      elapsed: this.getElapsed(),
      completedSteps: this.completedSteps.length,
      pendingSteps: this.pendingSteps.length,
      errors: this.errors.length,
      complete: this.isComplete()
    };
  }
}

/**
 * Create shutdown sequence
 * @param {Object} context - Orchestrator context
 * @returns {Object[]} Array of shutdown steps
 */
function createShutdownSequence(context) {
  const steps = [];

  // Step 1: Stop monitoring
  steps.push({
    name: 'stop_monitoring',
    priority: 1,
    execute: async () => {
      if (context.monitor) {
        context.monitor.stop();
      }
    }
  });

  // Step 2: Save state
  if (context.config?.saveStateOnShutdown !== false) {
    steps.push({
      name: 'save_state',
      priority: 2,
      execute: async () => {
        if (context.saveState) {
          await context.saveState();
        }
      }
    });
  }

  // Step 3: Kill supervisor
  steps.push({
    name: 'kill_supervisor',
    priority: 3,
    execute: async () => {
      if (context.killSupervisor) {
        await context.killSupervisor();
      }
    }
  });

  // Step 4: Kill worker (graceful)
  steps.push({
    name: 'kill_worker',
    priority: 4,
    execute: async () => {
      if (context.killWorker) {
        await context.killWorker({ graceful: true });
      }
    }
  });

  // Step 5: Kill dashboard
  steps.push({
    name: 'kill_dashboard',
    priority: 5,
    execute: async () => {
      if (context.killDashboard) {
        await context.killDashboard();
      }
    }
  });

  // Step 6: Cleanup PIDs
  steps.push({
    name: 'cleanup_pids',
    priority: 6,
    execute: async () => {
      if (context.cleanupPids) {
        await context.cleanupPids();
      }
    }
  });

  // Step 7: Final state update
  steps.push({
    name: 'finalize',
    priority: 7,
    execute: async () => {
      if (context.updateManifest) {
        await context.updateManifest({
          status: context.pipelineComplete ? 'complete' : 'stopped',
          stoppedAt: new Date().toISOString()
        });
      }
    }
  });

  // Sort by priority
  steps.sort((a, b) => a.priority - b.priority);

  return steps;
}

/**
 * Execute shutdown sequence
 * @param {Object} context - Orchestrator context
 * @param {string} reason - Shutdown reason
 * @param {Object} [config] - Shutdown config
 * @returns {Promise<ShutdownState>} Shutdown state
 */
async function executeShutdown(context, reason, config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const state = new ShutdownState();
  state.start(reason);

  const steps = createShutdownSequence(context);

  // Add all steps as pending
  for (const step of steps) {
    state.addPendingStep(step.name);
  }

  // Execute steps with timeout
  const startTime = Date.now();

  for (const step of steps) {
    // Check if we've exceeded grace period
    if (Date.now() - startTime > finalConfig.gracePeriodMs) {
      state.recordError(step.name, new Error('Shutdown grace period exceeded'));
      break;
    }

    try {
      await Promise.race([
        step.execute(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Step timeout')), finalConfig.forceKillDelayMs)
        )
      ]);
      state.completeStep(step.name);
    } catch (error) {
      state.recordError(step.name, error);
      state.completeStep(step.name); // Mark as complete even on error
    }
  }

  return state;
}

/**
 * Setup signal handlers for graceful shutdown
 * @param {Function} shutdownFn - Shutdown function to call
 * @returns {Function} Cleanup function
 */
function setupSignalHandlers(shutdownFn) {
  const handler = (signal) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    shutdownFn(SHUTDOWN_REASONS.SIGNAL);
  };

  // Handle common signals
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);

  // Windows doesn't have SIGINT/SIGTERM behavior
  if (process.platform === 'win32') {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('SIGINT', () => {
      process.emit('SIGINT');
    });
  }

  // Return cleanup function
  return () => {
    process.removeListener('SIGINT', handler);
    process.removeListener('SIGTERM', handler);
  };
}

/**
 * Format shutdown message
 * @param {ShutdownState} state - Shutdown state
 * @returns {string} Formatted message
 */
function formatShutdownMessage(state) {
  const lines = [
    '',
    '========================================',
    '          ORCHESTRATOR SHUTDOWN',
    '========================================',
    '',
    `Reason: ${state.reason}`,
    `Duration: ${(state.getElapsed() / 1000).toFixed(1)}s`,
    ''
  ];

  if (state.completedSteps.length > 0) {
    lines.push('Completed steps:');
    for (const step of state.completedSteps) {
      lines.push(`  ✓ ${step.step}`);
    }
  }

  if (state.errors.length > 0) {
    lines.push('');
    lines.push('Errors during shutdown:');
    for (const error of state.errors) {
      lines.push(`  ✗ ${error.step}: ${error.error}`);
    }
  }

  lines.push('');
  lines.push('========================================');
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  DEFAULT_CONFIG,
  SHUTDOWN_REASONS,
  ShutdownState,
  createShutdownSequence,
  executeShutdown,
  setupSignalHandlers,
  formatShutdownMessage
};
