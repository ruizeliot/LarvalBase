/**
 * Error Handler
 *
 * Handles error recovery and classification.
 *
 * @module lib/orchestrator/handlers/error-handler
 * @version 11.0.0
 */

'use strict';

/**
 * Error severity levels
 */
const ERROR_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  RECOVERABLE: 'RECOVERABLE',
  FATAL: 'FATAL'
};

/**
 * Known error patterns and their handling
 */
const ERROR_PATTERNS = [
  {
    pattern: /ENOENT|no such file/i,
    severity: ERROR_SEVERITY.RECOVERABLE,
    message: 'File not found',
    recovery: 'CHECK_FILES'
  },
  {
    pattern: /EACCES|permission denied/i,
    severity: ERROR_SEVERITY.FATAL,
    message: 'Permission denied',
    recovery: null
  },
  {
    pattern: /ETIMEDOUT|timeout|timed out/i,
    severity: ERROR_SEVERITY.RECOVERABLE,
    message: 'Operation timed out',
    recovery: 'RETRY'
  },
  {
    pattern: /ECONNREFUSED|connection refused/i,
    severity: ERROR_SEVERITY.RECOVERABLE,
    message: 'Connection refused',
    recovery: 'RETRY'
  },
  {
    pattern: /worker.*died|process.*exit|unexpected exit/i,
    severity: ERROR_SEVERITY.RECOVERABLE,
    message: 'Worker process died',
    recovery: 'RESTART_WORKER'
  },
  {
    pattern: /heartbeat.*timeout/i,
    severity: ERROR_SEVERITY.WARNING,
    message: 'Worker heartbeat timeout',
    recovery: 'CHECK_WORKER'
  },
  {
    pattern: /manifest.*invalid|schema.*error/i,
    severity: ERROR_SEVERITY.RECOVERABLE,
    message: 'Invalid manifest',
    recovery: 'RESET_MANIFEST'
  },
  {
    pattern: /out of memory|heap|memory/i,
    severity: ERROR_SEVERITY.FATAL,
    message: 'Out of memory',
    recovery: null
  },
  {
    pattern: /rate.*limit|too many requests/i,
    severity: ERROR_SEVERITY.RECOVERABLE,
    message: 'Rate limited',
    recovery: 'WAIT_AND_RETRY'
  }
];

/**
 * Recovery strategies
 */
const RECOVERY_STRATEGIES = {
  RETRY: {
    maxAttempts: 3,
    delayMs: 5000,
    backoffMultiplier: 2
  },
  WAIT_AND_RETRY: {
    maxAttempts: 3,
    delayMs: 60000, // 1 minute
    backoffMultiplier: 1.5
  },
  RESTART_WORKER: {
    maxAttempts: 2,
    delayMs: 3000
  },
  CHECK_WORKER: {
    maxAttempts: 5,
    delayMs: 10000
  },
  CHECK_FILES: {
    maxAttempts: 1,
    delayMs: 0
  },
  RESET_MANIFEST: {
    maxAttempts: 1,
    delayMs: 0
  }
};

/**
 * Classify an error
 * @param {Error|string} error - Error to classify
 * @returns {Object} Classification result
 */
function classifyError(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : null;

  // Find matching pattern
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(errorMessage)) {
      return {
        originalError: error,
        message: errorMessage,
        stack: errorStack,
        severity: pattern.severity,
        classification: pattern.message,
        recovery: pattern.recovery,
        recoverable: pattern.severity === ERROR_SEVERITY.RECOVERABLE ||
                     pattern.severity === ERROR_SEVERITY.WARNING
      };
    }
  }

  // Unknown error - default to recoverable for first occurrence
  return {
    originalError: error,
    message: errorMessage,
    stack: errorStack,
    severity: ERROR_SEVERITY.RECOVERABLE,
    classification: 'Unknown error',
    recovery: 'RETRY',
    recoverable: true
  };
}

/**
 * Error context for tracking recovery attempts
 */
class ErrorContext {
  constructor() {
    this.errors = [];
    this.recoveryAttempts = new Map();
  }

  /**
   * Record an error
   * @param {Object} classifiedError - Classified error
   */
  record(classifiedError) {
    this.errors.push({
      ...classifiedError,
      timestamp: Date.now()
    });
  }

  /**
   * Get recovery attempts for a strategy
   * @param {string} strategy - Recovery strategy
   * @returns {number} Attempt count
   */
  getAttempts(strategy) {
    return this.recoveryAttempts.get(strategy) || 0;
  }

  /**
   * Increment recovery attempts
   * @param {string} strategy - Recovery strategy
   */
  incrementAttempts(strategy) {
    const current = this.getAttempts(strategy);
    this.recoveryAttempts.set(strategy, current + 1);
  }

  /**
   * Reset recovery attempts
   * @param {string} [strategy] - Strategy to reset (all if not provided)
   */
  resetAttempts(strategy = null) {
    if (strategy) {
      this.recoveryAttempts.delete(strategy);
    } else {
      this.recoveryAttempts.clear();
    }
  }

  /**
   * Check if recovery should be attempted
   * @param {string} strategy - Recovery strategy
   * @returns {{ shouldRetry: boolean, attempts: number, maxAttempts: number }}
   */
  shouldRetry(strategy) {
    const strategyConfig = RECOVERY_STRATEGIES[strategy];
    if (!strategyConfig) {
      return { shouldRetry: false, attempts: 0, maxAttempts: 0 };
    }

    const attempts = this.getAttempts(strategy);
    return {
      shouldRetry: attempts < strategyConfig.maxAttempts,
      attempts,
      maxAttempts: strategyConfig.maxAttempts
    };
  }

  /**
   * Get delay for next retry
   * @param {string} strategy - Recovery strategy
   * @returns {number} Delay in milliseconds
   */
  getRetryDelay(strategy) {
    const strategyConfig = RECOVERY_STRATEGIES[strategy];
    if (!strategyConfig) {
      return 5000;
    }

    const attempts = this.getAttempts(strategy);
    const multiplier = Math.pow(strategyConfig.backoffMultiplier || 1, attempts);
    return Math.round(strategyConfig.delayMs * multiplier);
  }

  /**
   * Get recent errors
   * @param {number} [limit=10] - Max errors to return
   * @returns {Object[]} Recent errors
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  /**
   * Get error count by severity
   * @returns {Object} Count by severity
   */
  getErrorCounts() {
    const counts = {};
    for (const severity of Object.values(ERROR_SEVERITY)) {
      counts[severity] = 0;
    }
    for (const error of this.errors) {
      counts[error.severity] = (counts[error.severity] || 0) + 1;
    }
    return counts;
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
    this.recoveryAttempts.clear();
  }
}

/**
 * Handle error with recovery
 * @param {Error|string} error - Error to handle
 * @param {ErrorContext} context - Error context
 * @param {Object} [handlers] - Recovery handlers
 * @returns {Promise<Object>} Recovery result
 */
async function handleError(error, context, handlers = {}) {
  const classified = classifyError(error);
  context.record(classified);

  // Check if fatal
  if (classified.severity === ERROR_SEVERITY.FATAL) {
    return {
      recovered: false,
      error: classified,
      action: 'FATAL_STOP'
    };
  }

  // Check if recoverable
  if (!classified.recovery) {
    return {
      recovered: false,
      error: classified,
      action: 'NO_RECOVERY'
    };
  }

  // Check retry attempts
  const retryInfo = context.shouldRetry(classified.recovery);
  if (!retryInfo.shouldRetry) {
    return {
      recovered: false,
      error: classified,
      action: 'MAX_RETRIES_EXCEEDED',
      attempts: retryInfo.attempts
    };
  }

  // Increment attempts
  context.incrementAttempts(classified.recovery);

  // Get delay
  const delay = context.getRetryDelay(classified.recovery);

  // Wait if needed
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Execute recovery handler if provided
  if (handlers[classified.recovery]) {
    try {
      await handlers[classified.recovery](classified);
      return {
        recovered: true,
        error: classified,
        action: classified.recovery,
        attempts: retryInfo.attempts + 1
      };
    } catch (recoveryError) {
      return {
        recovered: false,
        error: classified,
        recoveryError,
        action: 'RECOVERY_FAILED'
      };
    }
  }

  return {
    recovered: true,
    error: classified,
    action: classified.recovery,
    attempts: retryInfo.attempts + 1
  };
}

/**
 * Format error for display
 * @param {Object} classifiedError - Classified error
 * @returns {string} Formatted error string
 */
function formatError(classifiedError) {
  const severityIcon = {
    [ERROR_SEVERITY.INFO]: 'ℹ',
    [ERROR_SEVERITY.WARNING]: '⚠',
    [ERROR_SEVERITY.RECOVERABLE]: '⟳',
    [ERROR_SEVERITY.FATAL]: '✗'
  };

  const icon = severityIcon[classifiedError.severity] || '?';
  return `${icon} [${classifiedError.severity}] ${classifiedError.classification}: ${classifiedError.message}`;
}

module.exports = {
  ERROR_SEVERITY,
  ERROR_PATTERNS,
  RECOVERY_STRATEGIES,
  classifyError,
  ErrorContext,
  handleError,
  formatError
};
