/**
 * Session management MCP tools
 *
 * Provides tools for AI to understand current brainstorm session state,
 * including Double Diamond phase, engagement signals, and recommended actions.
 */

import {
  sessionState,
  getPhaseGuidance,
  getRecommendedTechniques,
  DiamondPhase,
  VisualizationTechnique
} from '../session/state.js';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Register session-related MCP tools
 */
export function registerSessionTools(): ToolDefinition[] {
  return [
    {
      name: "get_session_phase",
      description: "Get current brainstorm session phase (Double Diamond), turn count, current technique, and recommended approach. Use this to understand where the user is in the brainstorming process and guide your responses accordingly.",
      inputSchema: {
        type: "object" as const,
        properties: {},
        required: []
      }
    }
  ];
}

/**
 * Handle session tool calls
 */
export function handleSessionTool(name: string): ToolResponse {
  if (name === "get_session_phase") {
    // Determine diverge/converge mode from phase
    const mode: 'diverge' | 'converge' =
      (sessionState.phase === 'discover' || sessionState.phase === 'develop')
        ? 'diverge' : 'converge';

    // Get phase-specific information
    const guidance = getPhaseGuidance(sessionState);
    const recommendedTechniques = getRecommendedTechniques(sessionState);

    // Build response
    const response = {
      phase: sessionState.phase,
      diamond: sessionState.diamond,
      mode,
      turnCount: sessionState.turnCount,
      currentTechnique: sessionState.currentTechnique,
      recommendedTechniques,
      ideasThisPhase: sessionState.ideas.generated,
      engagement: sessionState.lastEngagement,  // Include engagement signal
      recommendedAction: guidance,
      phaseDescription: getPhaseDescription(sessionState.phase, sessionState.diamond)
    };

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: `Unknown session tool: ${name}`
    }],
    isError: true
  };
}

/**
 * Get human-readable description of current phase
 */
function getPhaseDescription(phase: DiamondPhase, diamond: 1 | 2): string {
  const descriptions: Record<DiamondPhase, string> = {
    discover: `Diamond ${diamond}: DISCOVER - Exploring and understanding the problem space. Generate many ideas freely.`,
    define: `Diamond ${diamond}: DEFINE - Synthesizing discoveries into clear problem statements. Focus and prioritize.`,
    develop: `Diamond ${diamond}: DEVELOP - Generating potential solutions. Brainstorm without constraints.`,
    deliver: `Diamond ${diamond}: DELIVER - Converging on actionable solutions. Finalize and plan implementation.`
  };

  return descriptions[phase];
}
