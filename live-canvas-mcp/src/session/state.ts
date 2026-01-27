/**
 * Session state machine for Double Diamond brainstorming phases
 *
 * Double Diamond Design Process:
 * - Diamond 1 (Problem Space): Discover -> Define
 * - Diamond 2 (Solution Space): Develop -> Deliver
 *
 * Discover/Develop = diverge (generate ideas)
 * Define/Deliver = converge (narrow focus)
 */

export type DiamondPhase = 'discover' | 'define' | 'develop' | 'deliver';
export type VisualizationTechnique = 'mindmap' | 'matrix' | 'affinity' | 'flow';

export type EngagementSignal = 'terse' | 'normal' | 'verbose' | 'confused' | 'excited';

export interface SessionState {
  phase: DiamondPhase;
  diamond: 1 | 2;  // First diamond (problem) or second (solution)
  turnCount: number;
  lastPhaseSwitch: number;  // timestamp
  ideas: {
    generated: number;
    recentTurns: number[];  // Ideas per last N turns (for stagnation detection)
  };
  currentTechnique: VisualizationTechnique;
  lastEngagement: EngagementSignal;  // Last detected engagement signal
}

// Phase transition rules: discover -> define -> develop -> deliver -> discover (cycle)
const PHASE_TRANSITIONS: Record<DiamondPhase, DiamondPhase> = {
  discover: 'define',   // diverge -> converge (end of diamond 1)
  define: 'develop',    // converge -> diverge (start of diamond 2)
  develop: 'deliver',   // diverge -> converge (end of diamond 2)
  deliver: 'discover',  // converge -> diverge (new cycle)
};

// Phase guidance for AI
const PHASE_GUIDANCE: Record<DiamondPhase, string> = {
  discover: "Generate many ideas without judgment. Use mind maps to branch out. Ask open-ended questions to explore the problem space.",
  define: "Narrow down to key themes. Use matrix to prioritize. Synthesize findings into clear problem statements.",
  develop: "Generate solutions for defined problem. Use affinity diagrams to group approaches. Brainstorm without constraints.",
  deliver: "Converge on final solution. Use flow diagrams to map implementation. Prioritize and select actionable next steps."
};

// Recommended techniques for each phase
const PHASE_TECHNIQUES: Record<DiamondPhase, VisualizationTechnique[]> = {
  discover: ['mindmap', 'affinity'],      // Diverge: explore connections and groupings
  define: ['matrix', 'flow'],             // Converge: prioritize and sequence
  develop: ['mindmap', 'affinity'],       // Diverge: generate solution ideas
  deliver: ['matrix', 'flow']             // Converge: finalize and implement
};

/**
 * Create initial session state
 */
export function createSessionState(): SessionState {
  return {
    phase: 'discover',
    diamond: 1,
    turnCount: 0,
    lastPhaseSwitch: Date.now(),
    ideas: {
      generated: 0,
      recentTurns: []
    },
    currentTechnique: 'mindmap',
    lastEngagement: 'normal'
  };
}

/**
 * Increment turn and track ideas generated
 * @param state Current session state
 * @param ideasThisTurn Number of ideas generated in this turn
 * @returns Updated session state
 */
export function incrementTurn(state: SessionState, ideasThisTurn: number = 0): SessionState {
  const recentTurns = [...state.ideas.recentTurns, ideasThisTurn];
  // Keep only last 5 turns for stagnation detection
  if (recentTurns.length > 5) {
    recentTurns.shift();
  }

  return {
    ...state,
    turnCount: state.turnCount + 1,
    ideas: {
      generated: state.ideas.generated + ideasThisTurn,
      recentTurns
    }
  };
}

/**
 * Check if phase should transition based on turn count and diminishing returns
 * @param state Current session state
 * @returns true if transition is recommended
 */
export function shouldTransition(state: SessionState): boolean {
  // Minimum 3 turns per phase (avoid premature transitions)
  if (state.turnCount < 3) {
    return false;
  }

  // After 5+ turns, check for diminishing returns
  if (state.turnCount >= 5) {
    const recentTurns = state.ideas.recentTurns.slice(-3);
    if (recentTurns.length >= 3) {
      const avgIdeas = recentTurns.reduce((a, b) => a + b, 0) / recentTurns.length;
      // Stagnation: less than 2 ideas on average over last 3 turns
      if (avgIdeas < 2) {
        return true;
      }
    }
  }

  // After 10 turns, suggest transition regardless
  if (state.turnCount >= 10) {
    return true;
  }

  return false;
}

/**
 * Transition to next phase
 * @param state Current session state
 * @returns Updated session state with new phase
 */
export function transitionPhase(state: SessionState): SessionState {
  const nextPhase = PHASE_TRANSITIONS[state.phase];

  // Update diamond when moving from define to develop
  const nextDiamond = state.phase === 'define' ? 2 :
                      state.phase === 'deliver' ? 1 :
                      state.diamond;

  // Select appropriate technique for new phase
  const techniquesForPhase = PHASE_TECHNIQUES[nextPhase];
  const nextTechnique = techniquesForPhase[0];

  return {
    phase: nextPhase,
    diamond: nextDiamond as 1 | 2,
    turnCount: 0,
    lastPhaseSwitch: Date.now(),
    ideas: {
      generated: 0,
      recentTurns: []
    },
    currentTechnique: nextTechnique,
    lastEngagement: state.lastEngagement
  };
}

/**
 * Get guidance string for current phase
 * @param state Current session state
 * @returns Guidance text for AI
 */
export function getPhaseGuidance(state: SessionState): string {
  return PHASE_GUIDANCE[state.phase];
}

/**
 * Get recommended techniques for current phase
 * @param state Current session state
 * @returns Array of recommended visualization techniques
 */
export function getRecommendedTechniques(state: SessionState): VisualizationTechnique[] {
  return PHASE_TECHNIQUES[state.phase];
}

/**
 * Update current visualization technique
 * @param state Current session state
 * @param technique New technique to use
 * @returns Updated session state
 */
export function setTechnique(state: SessionState, technique: VisualizationTechnique): SessionState {
  return {
    ...state,
    currentTechnique: technique
  };
}

// Singleton session state for server-wide tracking
export let sessionState: SessionState = createSessionState();

/**
 * Reset session state (for testing or new session)
 */
export function resetSessionState(): void {
  sessionState = createSessionState();
}

/**
 * Update the global session state
 * @param newState Updated state
 */
export function updateSessionState(newState: SessionState): void {
  sessionState = newState;
}

/**
 * Check if current technique is stagnating (<2 ideas over 3 turns)
 * @param state Current session state
 * @returns true if stagnation detected
 */
export function isStagnating(state: SessionState): boolean {
  const recentTurns = state.ideas.recentTurns.slice(-3);
  if (recentTurns.length < 3) return false;

  const totalRecent = recentTurns.reduce((a, b) => a + b, 0);
  return totalRecent < 2;
}

/**
 * Recommend next technique based on current phase
 * Diverge phases: prioritize exploration (mindmap, affinity)
 * Converge phases: prioritize evaluation (matrix, flow)
 * @param current Current technique
 * @param phase Current diamond phase
 * @returns Next recommended technique
 */
export function recommendNextTechnique(
  current: VisualizationTechnique,
  phase: DiamondPhase
): VisualizationTechnique {
  const divergeOrder: VisualizationTechnique[] = ['mindmap', 'affinity', 'flow', 'matrix'];
  const convergeOrder: VisualizationTechnique[] = ['matrix', 'flow', 'mindmap', 'affinity'];

  const order = (phase === 'discover' || phase === 'develop')
    ? divergeOrder : convergeOrder;
  const currentIndex = order.indexOf(current);
  return order[(currentIndex + 1) % order.length];
}

/**
 * Switch to next technique, reset stagnation tracking
 * @param state Current session state
 * @returns Updated session state with new technique
 */
export function switchTechnique(state: SessionState): SessionState {
  const next = recommendNextTechnique(state.currentTechnique, state.phase);
  return {
    ...state,
    currentTechnique: next,
    ideas: {
      generated: 0,
      recentTurns: []  // Reset stagnation tracking
    }
  };
}
