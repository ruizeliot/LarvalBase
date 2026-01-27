/**
 * Session state store for viewer
 *
 * Tracks the current Double Diamond session phase, synced from server.
 * Used to display session indicator in UI.
 */

import { create } from 'zustand';

export type DiamondPhase = 'discover' | 'define' | 'develop' | 'deliver';
export type VisualizationTechnique = 'mindmap' | 'matrix' | 'affinity' | 'flow';

interface SessionStoreState {
  // Session state from server
  phase: DiamondPhase;
  diamond: 1 | 2;
  turnCount: number;
  technique: VisualizationTechnique;

  // Actions
  updateFromServer: (data: {
    phase: DiamondPhase;
    diamond: 1 | 2;
    turnCount: number;
    currentTechnique: VisualizationTechnique;
  }) => void;
}

/**
 * Zustand store for session state
 */
export const useSessionStore = create<SessionStoreState>()((set) => ({
  // Defaults (initial state before server sync)
  phase: 'discover',
  diamond: 1,
  turnCount: 0,
  technique: 'mindmap',

  updateFromServer: (data) => set({
    phase: data.phase,
    diamond: data.diamond,
    turnCount: data.turnCount,
    technique: data.currentTechnique
  })
}));
