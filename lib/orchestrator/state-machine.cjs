/**
 * Orchestrator State Machine Module
 *
 * Pure state transition logic for the orchestrator.
 *
 * @module lib/orchestrator/state-machine
 * @version 11.0.0
 */

'use strict';

const { EVENTS } = require('./events.cjs');

/**
 * All possible orchestrator states
 */
const STATES = {
  // Lifecycle
  INIT: 'INIT',
  DONE: 'DONE',
  ERROR: 'ERROR',

  // Startup
  VALIDATING: 'VALIDATING',
  ASKING_QUESTIONS: 'ASKING_QUESTIONS',
  CREATING_MANIFEST: 'CREATING_MANIFEST',

  // Spawning
  SPAWNING_DASHBOARD: 'SPAWNING_DASHBOARD',
  SPAWNING_WORKER: 'SPAWNING_WORKER',
  SPAWNING_SUPERVISOR: 'SPAWNING_SUPERVISOR',

  // Running
  MONITORING: 'MONITORING',
  PAUSED: 'PAUSED',

  // Phase Transitions
  PHASE_COMPLETE: 'PHASE_COMPLETE',
  TRANSITIONING: 'TRANSITIONING',
  PIPELINE_COMPLETE: 'PIPELINE_COMPLETE',

  // End of Pipeline
  COLLECTING_RATINGS: 'COLLECTING_RATINGS',
  ANALYZING: 'ANALYZING',

  // Recovery
  RECOVERING: 'RECOVERING'
};

/**
 * State transition definitions
 * Maps current state + event to next state
 */
const TRANSITIONS = {
  [STATES.INIT]: {
    [EVENTS.START]: STATES.VALIDATING,
    [EVENTS.ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.VALIDATING]: {
    [EVENTS.FILES_VALID]: STATES.ASKING_QUESTIONS,
    [EVENTS.FILES_INVALID]: STATES.ERROR,
    [EVENTS.ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.ASKING_QUESTIONS]: {
    [EVENTS.QUESTIONS_ANSWERED]: STATES.CREATING_MANIFEST,
    [EVENTS.USER_QUIT]: STATES.DONE,
    [EVENTS.ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.CREATING_MANIFEST]: {
    [EVENTS.MANIFEST_CREATED]: STATES.SPAWNING_DASHBOARD,
    [EVENTS.ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.SPAWNING_DASHBOARD]: {
    [EVENTS.DASHBOARD_READY]: STATES.SPAWNING_WORKER,
    [EVENTS.DASHBOARD_FAILED]: STATES.RECOVERING,
    [EVENTS.ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.SPAWNING_WORKER]: {
    [EVENTS.WORKER_READY]: STATES.SPAWNING_SUPERVISOR,
    [EVENTS.WORKER_FAILED]: STATES.RECOVERING,
    [EVENTS.ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.SPAWNING_SUPERVISOR]: {
    [EVENTS.SUPERVISOR_READY]: STATES.MONITORING,
    [EVENTS.SUPERVISOR_FAILED]: STATES.MONITORING, // Continue without supervisor
    [EVENTS.ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.MONITORING]: {
    [EVENTS.HEARTBEAT]: STATES.MONITORING,
    [EVENTS.TODO_UPDATE]: STATES.MONITORING,
    [EVENTS.WORKER_OUTPUT]: STATES.MONITORING,
    [EVENTS.PHASE_COMPLETE]: STATES.PHASE_COMPLETE,
    [EVENTS.PHASE_FAILED]: STATES.RECOVERING,
    [EVENTS.HEARTBEAT_TIMEOUT]: STATES.RECOVERING,
    [EVENTS.USER_PAUSE]: STATES.PAUSED,
    [EVENTS.USER_QUIT]: STATES.DONE,
    [EVENTS.ERROR]: STATES.RECOVERING,
    [EVENTS.RECOVERABLE_ERROR]: STATES.RECOVERING,
    [EVENTS.FATAL_ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.PAUSED]: {
    [EVENTS.USER_RESUME]: STATES.MONITORING,
    [EVENTS.USER_QUIT]: STATES.DONE,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.PHASE_COMPLETE]: {
    [EVENTS.PIPELINE_COMPLETE]: STATES.PIPELINE_COMPLETE,
    [EVENTS.START]: STATES.TRANSITIONING, // Start next phase
    [EVENTS.USER_QUIT]: STATES.DONE,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.TRANSITIONING]: {
    [EVENTS.WORKER_READY]: STATES.SPAWNING_SUPERVISOR,
    [EVENTS.WORKER_FAILED]: STATES.RECOVERING,
    [EVENTS.ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.PIPELINE_COMPLETE]: {
    [EVENTS.START]: STATES.COLLECTING_RATINGS,
    [EVENTS.RATINGS_SKIPPED]: STATES.ANALYZING,
    [EVENTS.USER_QUIT]: STATES.DONE,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.COLLECTING_RATINGS]: {
    [EVENTS.RATINGS_COLLECTED]: STATES.ANALYZING,
    [EVENTS.RATINGS_SKIPPED]: STATES.ANALYZING,
    [EVENTS.USER_QUIT]: STATES.DONE,
    [EVENTS.ERROR]: STATES.ANALYZING, // Continue even if rating fails
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.ANALYZING]: {
    [EVENTS.ANALYSIS_COMPLETE]: STATES.DONE,
    [EVENTS.ERROR]: STATES.DONE, // Complete even if analysis fails
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.RECOVERING]: {
    [EVENTS.WORKER_READY]: STATES.MONITORING,
    [EVENTS.USER_RETRY_PHASE]: STATES.SPAWNING_WORKER,
    [EVENTS.USER_SKIP_PHASE]: STATES.PHASE_COMPLETE,
    [EVENTS.USER_QUIT]: STATES.DONE,
    [EVENTS.FATAL_ERROR]: STATES.ERROR,
    [EVENTS.SHUTDOWN]: STATES.DONE
  },

  [STATES.ERROR]: {
    [EVENTS.SHUTDOWN]: STATES.DONE,
    [EVENTS.USER_QUIT]: STATES.DONE
  },

  [STATES.DONE]: {
    // Terminal state - no transitions
  }
};

/**
 * State machine class
 */
class StateMachine {
  /**
   * Create a new state machine
   * @param {Object} [options] - Options
   */
  constructor(options = {}) {
    this.currentState = STATES.INIT;
    this.previousState = null;
    this.context = options.context || {};
    this.history = [];
    this.onTransition = options.onTransition || null;
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Check if in a specific state
   * @param {string} state - State to check
   * @returns {boolean}
   */
  isIn(state) {
    return this.currentState === state;
  }

  /**
   * Check if state machine is in terminal state
   * @returns {boolean}
   */
  isTerminal() {
    return this.currentState === STATES.DONE || this.currentState === STATES.ERROR;
  }

  /**
   * Get valid events for current state
   * @returns {string[]} Valid event types
   */
  getValidEvents() {
    const transitions = TRANSITIONS[this.currentState];
    return transitions ? Object.keys(transitions) : [];
  }

  /**
   * Check if event is valid in current state
   * @param {string} event - Event type
   * @returns {boolean}
   */
  canHandle(event) {
    const transitions = TRANSITIONS[this.currentState];
    return transitions && transitions[event] !== undefined;
  }

  /**
   * Transition to next state based on event
   * @param {string} event - Event type
   * @param {Object} [payload] - Event payload
   * @returns {{ success: boolean, from: string, to: string, event: string }}
   */
  transition(event, payload = {}) {
    const transitions = TRANSITIONS[this.currentState];

    if (!transitions || !transitions[event]) {
      return {
        success: false,
        from: this.currentState,
        to: this.currentState,
        event,
        error: `Invalid transition: ${this.currentState} + ${event}`
      };
    }

    const from = this.currentState;
    const to = transitions[event];

    // Record history
    this.history.push({
      from,
      to,
      event,
      payload,
      timestamp: Date.now()
    });

    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Update state
    this.previousState = from;
    this.currentState = to;

    // Update context
    this.context = {
      ...this.context,
      ...payload
    };

    // Call transition callback
    if (this.onTransition) {
      try {
        this.onTransition({ from, to, event, payload });
      } catch (error) {
        console.error('Transition callback error:', error);
      }
    }

    return {
      success: true,
      from,
      to,
      event
    };
  }

  /**
   * Force state (for recovery scenarios)
   * @param {string} state - State to force
   * @param {string} [reason] - Reason for forcing
   */
  forceState(state, reason = 'manual') {
    if (!STATES[state]) {
      throw new Error(`Invalid state: ${state}`);
    }

    this.history.push({
      from: this.currentState,
      to: state,
      event: 'FORCE',
      payload: { reason },
      timestamp: Date.now()
    });

    this.previousState = this.currentState;
    this.currentState = state;
  }

  /**
   * Get transition history
   * @returns {Object[]} History entries
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Get context value
   * @param {string} [key] - Context key (optional, returns all if not provided)
   * @returns {*} Context value
   */
  getContext(key = null) {
    if (key === null) {
      return { ...this.context };
    }
    return this.context[key];
  }

  /**
   * Update context
   * @param {Object} updates - Context updates
   */
  updateContext(updates) {
    this.context = {
      ...this.context,
      ...updates
    };
  }

  /**
   * Reset state machine
   */
  reset() {
    this.currentState = STATES.INIT;
    this.previousState = null;
    this.context = {};
    this.history = [];
  }

  /**
   * Serialize state machine
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      context: this.context,
      history: this.history
    };
  }

  /**
   * Deserialize state machine
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    this.currentState = data.currentState || STATES.INIT;
    this.previousState = data.previousState || null;
    this.context = data.context || {};
    this.history = data.history || [];
  }
}

/**
 * Get all states that can transition to a specific state
 * @param {string} targetState - Target state
 * @returns {Object[]} Array of { state, event } pairs
 */
function getTransitionsTo(targetState) {
  const results = [];

  for (const [state, transitions] of Object.entries(TRANSITIONS)) {
    for (const [event, to] of Object.entries(transitions)) {
      if (to === targetState) {
        results.push({ state, event });
      }
    }
  }

  return results;
}

/**
 * Validate state machine definition
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDefinition() {
  const errors = [];

  // Check all states are defined
  for (const state of Object.values(STATES)) {
    if (!TRANSITIONS[state] && state !== STATES.DONE) {
      errors.push(`Missing transitions for state: ${state}`);
    }
  }

  // Check all transition targets are valid states
  for (const [state, transitions] of Object.entries(TRANSITIONS)) {
    for (const [event, target] of Object.entries(transitions)) {
      if (!STATES[target]) {
        errors.push(`Invalid target state in ${state} + ${event}: ${target}`);
      }
    }
  }

  // Check INIT has START transition
  if (!TRANSITIONS[STATES.INIT]?.[EVENTS.START]) {
    errors.push('INIT state must have START transition');
  }

  // Check DONE is terminal
  if (TRANSITIONS[STATES.DONE] && Object.keys(TRANSITIONS[STATES.DONE]).length > 0) {
    errors.push('DONE state should be terminal');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  STATES,
  TRANSITIONS,
  StateMachine,
  getTransitionsTo,
  validateDefinition
};
