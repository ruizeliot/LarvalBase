/**
 * Orchestrator Events Module
 *
 * Event definitions for the orchestrator state machine.
 *
 * @module lib/orchestrator/events
 * @version 11.0.0
 */

'use strict';

/**
 * All possible orchestrator events
 */
const EVENTS = {
  // Lifecycle
  START: 'START',
  SHUTDOWN: 'SHUTDOWN',

  // Validation
  FILES_VALID: 'FILES_VALID',
  FILES_INVALID: 'FILES_INVALID',

  // Startup
  QUESTIONS_ANSWERED: 'QUESTIONS_ANSWERED',
  MANIFEST_CREATED: 'MANIFEST_CREATED',

  // Spawning
  DASHBOARD_READY: 'DASHBOARD_READY',
  DASHBOARD_FAILED: 'DASHBOARD_FAILED',
  WORKER_READY: 'WORKER_READY',
  WORKER_FAILED: 'WORKER_FAILED',
  SUPERVISOR_READY: 'SUPERVISOR_READY',
  SUPERVISOR_FAILED: 'SUPERVISOR_FAILED',

  // Monitoring
  HEARTBEAT: 'HEARTBEAT',
  HEARTBEAT_TIMEOUT: 'HEARTBEAT_TIMEOUT',
  TODO_UPDATE: 'TODO_UPDATE',
  WORKER_OUTPUT: 'WORKER_OUTPUT',

  // Phase Management
  PHASE_COMPLETE: 'PHASE_COMPLETE',
  PHASE_FAILED: 'PHASE_FAILED',
  PIPELINE_COMPLETE: 'PIPELINE_COMPLETE',

  // User Actions
  USER_PAUSE: 'USER_PAUSE',
  USER_RESUME: 'USER_RESUME',
  USER_QUIT: 'USER_QUIT',
  USER_SKIP_PHASE: 'USER_SKIP_PHASE',
  USER_RETRY_PHASE: 'USER_RETRY_PHASE',

  // End of Pipeline
  RATINGS_COLLECTED: 'RATINGS_COLLECTED',
  RATINGS_SKIPPED: 'RATINGS_SKIPPED',
  ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE',

  // Errors
  ERROR: 'ERROR',
  RECOVERABLE_ERROR: 'RECOVERABLE_ERROR',
  FATAL_ERROR: 'FATAL_ERROR'
};

/**
 * Create an event object
 * @param {string} type - Event type from EVENTS
 * @param {Object} [payload] - Event payload data
 * @returns {Object} Event object
 */
function createEvent(type, payload = {}) {
  if (!EVENTS[type] && !Object.values(EVENTS).includes(type)) {
    throw new Error(`Unknown event type: ${type}`);
  }

  return {
    type: EVENTS[type] || type,
    payload,
    timestamp: Date.now()
  };
}

/**
 * Event emitter class for orchestrator
 */
class EventEmitter {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  /**
   * Register event listener
   * @param {string} event - Event type
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  /**
   * Register one-time event listener
   * @param {string} event - Event type
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }
    this.onceListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const filtered = this.listeners.get(event).filter(cb => cb !== callback);
      this.listeners.set(event, filtered);
    }
    if (this.onceListeners.has(event)) {
      const filtered = this.onceListeners.get(event).filter(cb => cb !== callback);
      this.onceListeners.set(event, filtered);
    }
  }

  /**
   * Emit event
   * @param {string|Object} eventOrType - Event type or event object
   * @param {Object} [payload] - Event payload (if type provided)
   */
  emit(eventOrType, payload) {
    const event = typeof eventOrType === 'string'
      ? createEvent(eventOrType, payload)
      : eventOrType;

    // Call regular listeners
    if (this.listeners.has(event.type)) {
      for (const callback of this.listeners.get(event.type)) {
        try {
          callback(event);
        } catch (error) {
          console.error(`Event listener error for ${event.type}:`, error);
        }
      }
    }

    // Call and remove once listeners
    if (this.onceListeners.has(event.type)) {
      const callbacks = this.onceListeners.get(event.type);
      this.onceListeners.set(event.type, []);
      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (error) {
          console.error(`Once listener error for ${event.type}:`, error);
        }
      }
    }

    // Call wildcard listeners
    if (this.listeners.has('*')) {
      for (const callback of this.listeners.get('*')) {
        try {
          callback(event);
        } catch (error) {
          console.error('Wildcard listener error:', error);
        }
      }
    }
  }

  /**
   * Wait for specific event
   * @param {string} event - Event type
   * @param {number} [timeout] - Timeout in ms (optional)
   * @returns {Promise<Object>} Event object
   */
  waitFor(event, timeout = null) {
    return new Promise((resolve, reject) => {
      let timeoutId = null;

      const handler = (e) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(e);
      };

      this.once(event, handler);

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off(event, handler);
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.clear();
    this.onceListeners.clear();
  }
}

/**
 * Event history for debugging
 */
class EventHistory {
  constructor(maxSize = 100) {
    this.events = [];
    this.maxSize = maxSize;
  }

  /**
   * Add event to history
   * @param {Object} event - Event object
   */
  add(event) {
    this.events.push({
      ...event,
      recordedAt: Date.now()
    });

    if (this.events.length > this.maxSize) {
      this.events.shift();
    }
  }

  /**
   * Get all events
   * @returns {Object[]} Event history
   */
  getAll() {
    return [...this.events];
  }

  /**
   * Get events by type
   * @param {string} type - Event type
   * @returns {Object[]} Matching events
   */
  getByType(type) {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get events since timestamp
   * @param {number} timestamp - Unix timestamp
   * @returns {Object[]} Events since timestamp
   */
  getSince(timestamp) {
    return this.events.filter(e => e.timestamp >= timestamp);
  }

  /**
   * Clear history
   */
  clear() {
    this.events = [];
  }
}

module.exports = {
  EVENTS,
  createEvent,
  EventEmitter,
  EventHistory
};
