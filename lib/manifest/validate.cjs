/**
 * Manifest Validation Functions
 *
 * Validates manifest objects against the v11 schema.
 * Provides both full validation and specific pre-condition checks.
 */

'use strict';

const {
  SCHEMA_VERSION,
  VALID_STACKS,
  VALID_MODES,
  VALID_USER_MODES,
  VALID_STATUSES,
  VALID_PHASES,
  VALID_PHASE_STATUSES
} = require('./schema.cjs');

/**
 * Validate a manifest object against the v11 schema
 * @param {Object} manifest - The manifest to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validate(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'] };
  }

  // Version check
  if (!manifest.version) {
    errors.push('Missing required field: version');
  } else if (!manifest.version.startsWith('11.')) {
    errors.push(`Invalid version: ${manifest.version} (must be 11.x.x)`);
  }

  // Project check
  if (!manifest.project) {
    errors.push('Missing required field: project');
  } else {
    if (!manifest.project.name || typeof manifest.project.name !== 'string') {
      errors.push('project.name must be a non-empty string');
    }
    if (!manifest.project.path || typeof manifest.project.path !== 'string') {
      errors.push('project.path must be a non-empty string');
    }
  }

  // Stack check
  if (!manifest.stack) {
    errors.push('Missing required field: stack');
  } else if (!VALID_STACKS.includes(manifest.stack)) {
    errors.push(`Invalid stack: ${manifest.stack} (must be one of: ${VALID_STACKS.join(', ')})`);
  }

  // Mode check
  if (!manifest.mode) {
    errors.push('Missing required field: mode');
  } else if (!VALID_MODES.includes(manifest.mode)) {
    errors.push(`Invalid mode: ${manifest.mode} (must be one of: ${VALID_MODES.join(', ')})`);
  }

  // User mode check
  if (!manifest.userMode) {
    errors.push('Missing required field: userMode');
  } else if (!VALID_USER_MODES.includes(manifest.userMode)) {
    errors.push(`Invalid userMode: ${manifest.userMode} (must be one of: ${VALID_USER_MODES.join(', ')})`);
  }

  // Status check
  if (!manifest.status) {
    errors.push('Missing required field: status');
  } else if (!VALID_STATUSES.includes(manifest.status)) {
    errors.push(`Invalid status: ${manifest.status} (must be one of: ${VALID_STATUSES.join(', ')})`);
  }

  // Brainstorm check
  if (!manifest.brainstorm) {
    errors.push('Missing required field: brainstorm');
  } else {
    if (typeof manifest.brainstorm.completed !== 'boolean') {
      errors.push('brainstorm.completed must be a boolean');
    }
    if (!manifest.brainstorm.notesFile || typeof manifest.brainstorm.notesFile !== 'string') {
      errors.push('brainstorm.notesFile must be a non-empty string');
    }
    if (!manifest.brainstorm.storiesFile || typeof manifest.brainstorm.storiesFile !== 'string') {
      errors.push('brainstorm.storiesFile must be a non-empty string');
    }
  }

  // Current phase check
  if (manifest.currentPhase !== null && !VALID_PHASES.includes(manifest.currentPhase)) {
    errors.push(`Invalid currentPhase: ${manifest.currentPhase} (must be one of: ${VALID_PHASES.join(', ')} or null)`);
  }

  // Phases check
  if (!manifest.phases) {
    errors.push('Missing required field: phases');
  } else {
    for (const phase of VALID_PHASES) {
      if (!manifest.phases[phase]) {
        errors.push(`Missing phase: ${phase}`);
      } else {
        const phaseErrors = validatePhase(manifest.phases[phase], phase);
        errors.push(...phaseErrors);
      }
    }
  }

  // Heartbeat check
  if (!manifest.heartbeat) {
    errors.push('Missing required field: heartbeat');
  } else {
    if (typeof manifest.heartbeat.enabled !== 'boolean') {
      errors.push('heartbeat.enabled must be a boolean');
    }
    if (typeof manifest.heartbeat.intervalMs !== 'number' || manifest.heartbeat.intervalMs < 1000) {
      errors.push('heartbeat.intervalMs must be a number >= 1000');
    }
  }

  // Numeric field checks
  if (typeof manifest.totalCost !== 'undefined' && (typeof manifest.totalCost !== 'number' || manifest.totalCost < 0)) {
    errors.push('totalCost must be a non-negative number');
  }
  if (typeof manifest.totalDuration !== 'undefined' && (typeof manifest.totalDuration !== 'number' || manifest.totalDuration < 0)) {
    errors.push('totalDuration must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single phase entry
 * @param {Object} phase - The phase entry
 * @param {string} phaseName - The phase identifier (for error messages)
 * @returns {string[]} Array of error messages
 */
function validatePhase(phase, phaseName) {
  const errors = [];

  if (!phase.status) {
    errors.push(`phases.${phaseName}.status is required`);
  } else if (!VALID_PHASE_STATUSES.includes(phase.status)) {
    errors.push(`phases.${phaseName}.status invalid: ${phase.status}`);
  }

  if (typeof phase.duration !== 'undefined' && (typeof phase.duration !== 'number' || phase.duration < 0)) {
    errors.push(`phases.${phaseName}.duration must be a non-negative number`);
  }

  if (typeof phase.cost !== 'undefined' && (typeof phase.cost !== 'number' || phase.cost < 0)) {
    errors.push(`phases.${phaseName}.cost must be a non-negative number`);
  }

  return errors;
}

/**
 * Validate that brainstorm phase is complete (pre-requisite for pipeline start)
 * @param {Object} manifest - The manifest to check
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateBrainstormComplete(manifest) {
  const errors = [];

  if (!manifest.brainstorm) {
    errors.push('Brainstorm section missing from manifest');
    return { valid: false, errors };
  }

  if (!manifest.brainstorm.completed) {
    errors.push('Brainstorm phase not completed. Run /brainstorm first.');
  }

  if (manifest.brainstorm.epicCount < 1) {
    errors.push('No epics defined. Brainstorm must produce at least 1 epic.');
  }

  if (manifest.brainstorm.storyCount < 1) {
    errors.push('No stories defined. Brainstorm must produce at least 1 user story.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate that a specific phase can be started
 * @param {Object} manifest - The manifest
 * @param {string} phase - The phase to check ('2', '3', '4', '5')
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePhaseCanStart(manifest, phase) {
  const errors = [];

  if (!VALID_PHASES.includes(phase)) {
    errors.push(`Invalid phase: ${phase}`);
    return { valid: false, errors };
  }

  // Check if pipeline is in a valid state
  if (manifest.status === 'failed') {
    errors.push('Pipeline has failed. Cannot start new phase.');
  }

  if (manifest.status === 'complete') {
    errors.push('Pipeline is complete. Cannot start new phase.');
  }

  // Phase 2 requires brainstorm complete
  if (phase === '2') {
    const brainstormResult = validateBrainstormComplete(manifest);
    if (!brainstormResult.valid) {
      errors.push(...brainstormResult.errors);
    }
  }

  // Phases 3-5 require previous phase complete
  const phaseNum = parseInt(phase, 10);
  if (phaseNum > 2) {
    const prevPhase = String(phaseNum - 1);
    const prevStatus = manifest.phases[prevPhase]?.status;

    if (prevStatus !== 'complete' && prevStatus !== 'skipped') {
      errors.push(`Phase ${prevPhase} must be complete before starting Phase ${phase}`);
    }
  }

  // Check current phase isn't already running
  if (manifest.phases[phase]?.status === 'running') {
    errors.push(`Phase ${phase} is already running`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if manifest needs migration from v10
 * @param {Object} manifest - The manifest to check
 * @returns {boolean}
 */
function needsMigration(manifest) {
  if (!manifest || !manifest.version) {
    return true;
  }

  // Version 10.x.x or earlier needs migration
  const majorVersion = parseInt(manifest.version.split('.')[0], 10);
  return majorVersion < 11;
}

module.exports = {
  validate,
  validatePhase,
  validateBrainstormComplete,
  validatePhaseCanStart,
  needsMigration
};
