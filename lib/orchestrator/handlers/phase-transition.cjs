/**
 * Phase Transition Handler
 *
 * Handles phase completion and transition to next phase.
 *
 * @module lib/orchestrator/handlers/phase-transition
 * @version 11.0.0
 */

'use strict';

/**
 * Phase order for pipeline
 */
const PHASE_ORDER = ['2', '3', '4', '5'];

/**
 * Phase metadata
 */
const PHASES = {
  '2': {
    name: 'PM/Stories',
    description: 'Define user stories and acceptance criteria',
    command: '2-new-pipeline-desktop-v11.0'
  },
  '3': {
    name: 'Test Architecture',
    description: 'Create test specifications and architecture',
    command: '3-new-pipeline-desktop-v11.0'
  },
  '4': {
    name: 'Implementation',
    description: 'Implement features following TDD',
    command: '4-new-pipeline-desktop-v11.0'
  },
  '5': {
    name: 'Quality/Polish',
    description: 'Final quality checks and polish',
    command: '5-new-pipeline-desktop-v11.0'
  }
};

/**
 * Get next phase in sequence
 * @param {string} currentPhase - Current phase number
 * @returns {string | null} Next phase number or null if complete
 */
function getNextPhase(currentPhase) {
  const index = PHASE_ORDER.indexOf(currentPhase);
  if (index === -1 || index === PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[index + 1];
}

/**
 * Get previous phase in sequence
 * @param {string} currentPhase - Current phase number
 * @returns {string | null} Previous phase number or null
 */
function getPreviousPhase(currentPhase) {
  const index = PHASE_ORDER.indexOf(currentPhase);
  if (index <= 0) {
    return null;
  }
  return PHASE_ORDER[index - 1];
}

/**
 * Check if phase is the last phase
 * @param {string} phase - Phase number
 * @returns {boolean}
 */
function isLastPhase(phase) {
  return phase === PHASE_ORDER[PHASE_ORDER.length - 1];
}

/**
 * Get phase metadata
 * @param {string} phase - Phase number
 * @returns {Object | null} Phase metadata
 */
function getPhaseInfo(phase) {
  return PHASES[phase] || null;
}

/**
 * Detect phase completion from manifest todos
 * @param {Object} manifest - Pipeline manifest
 * @returns {{ complete: boolean, progress: number, totalTodos: number, completedTodos: number }}
 */
function detectPhaseCompletion(manifest) {
  const currentPhase = manifest.currentPhase;
  const phaseData = manifest.phases?.[currentPhase];

  if (!phaseData) {
    return {
      complete: false,
      progress: 0,
      totalTodos: 0,
      completedTodos: 0
    };
  }

  // Check todos if available
  if (phaseData.todos && Array.isArray(phaseData.todos)) {
    const totalTodos = phaseData.todos.length;
    const completedTodos = phaseData.todos.filter(t => t.status === 'completed').length;
    const progress = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

    return {
      complete: completedTodos === totalTodos && totalTodos > 0,
      progress,
      totalTodos,
      completedTodos
    };
  }

  // Fallback: check status
  return {
    complete: phaseData.status === 'complete',
    progress: phaseData.status === 'complete' ? 100 : 0,
    totalTodos: 0,
    completedTodos: 0
  };
}

/**
 * Calculate phase duration from timestamps
 * @param {Object} phaseData - Phase data from manifest
 * @returns {number} Duration in milliseconds
 */
function calculatePhaseDuration(phaseData) {
  if (phaseData.startedAt && phaseData.completedAt) {
    return new Date(phaseData.completedAt) - new Date(phaseData.startedAt);
  }
  if (phaseData.duration) {
    return phaseData.duration;
  }
  return 0;
}

/**
 * Handle phase completion
 * @param {Object} context - Handler context
 * @param {Object} context.manifest - Current manifest
 * @param {EventEmitter} context.emitter - Event emitter
 * @returns {Object} Transition result
 */
function handlePhaseComplete(context) {
  const { manifest, emitter } = context;
  const currentPhase = manifest.currentPhase;
  const nextPhase = getNextPhase(currentPhase);

  // Calculate stats for completed phase
  const phaseData = manifest.phases?.[currentPhase] || {};
  const duration = calculatePhaseDuration(phaseData);

  const result = {
    completedPhase: currentPhase,
    duration,
    nextPhase,
    pipelineComplete: nextPhase === null
  };

  if (nextPhase === null) {
    emitter.emit('PIPELINE_COMPLETE', result);
  }

  return result;
}

/**
 * Prepare for next phase
 * @param {Object} context - Handler context
 * @param {string} nextPhase - Next phase number
 * @returns {Object} Preparation result
 */
function prepareNextPhase(context, nextPhase) {
  const phaseInfo = getPhaseInfo(nextPhase);

  if (!phaseInfo) {
    return {
      success: false,
      error: `Unknown phase: ${nextPhase}`
    };
  }

  return {
    success: true,
    phase: nextPhase,
    info: phaseInfo,
    command: phaseInfo.command
  };
}

/**
 * Generate phase summary
 * @param {Object} manifest - Pipeline manifest
 * @returns {Object} Phase summary
 */
function generatePhaseSummary(manifest) {
  const summary = {
    phases: [],
    totalDuration: 0,
    totalCost: 0,
    completedPhases: 0,
    currentPhase: manifest.currentPhase
  };

  for (const phase of PHASE_ORDER) {
    const phaseData = manifest.phases?.[phase];
    const phaseInfo = getPhaseInfo(phase);

    const phaseSummary = {
      phase,
      name: phaseInfo?.name || `Phase ${phase}`,
      status: phaseData?.status || 'pending',
      duration: calculatePhaseDuration(phaseData || {}),
      cost: phaseData?.cost || 0,
      todoProgress: null
    };

    if (phaseData?.todos) {
      const total = phaseData.todos.length;
      const completed = phaseData.todos.filter(t => t.status === 'completed').length;
      phaseSummary.todoProgress = { total, completed };
    }

    if (phaseSummary.status === 'complete') {
      summary.completedPhases++;
    }

    summary.totalDuration += phaseSummary.duration;
    summary.totalCost += phaseSummary.cost;
    summary.phases.push(phaseSummary);
  }

  return summary;
}

/**
 * Check if phase can start
 * @param {string} phase - Phase to check
 * @param {Object} manifest - Pipeline manifest
 * @returns {{ canStart: boolean, reason: string | null }}
 */
function canStartPhase(phase, manifest) {
  // Phase 2 always can start if brainstorm complete
  if (phase === '2') {
    if (manifest.brainstorm?.complete) {
      return { canStart: true, reason: null };
    }
    return { canStart: false, reason: 'Brainstorm phase not complete' };
  }

  // Other phases require previous phase complete
  const prevPhase = getPreviousPhase(phase);
  if (prevPhase) {
    const prevStatus = manifest.phases?.[prevPhase]?.status;
    if (prevStatus !== 'complete') {
      return {
        canStart: false,
        reason: `Phase ${prevPhase} must be complete first`
      };
    }
  }

  return { canStart: true, reason: null };
}

module.exports = {
  PHASE_ORDER,
  PHASES,
  getNextPhase,
  getPreviousPhase,
  isLastPhase,
  getPhaseInfo,
  detectPhaseCompletion,
  calculatePhaseDuration,
  handlePhaseComplete,
  prepareNextPhase,
  generatePhaseSummary,
  canStartPhase
};
