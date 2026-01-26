import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User preferences state for AI behavior customization
 */
interface PreferencesState {
  // AI behavior preferences
  proactivity: 'low' | 'medium' | 'high';
  animationSpeed: 'instant' | 'fast' | 'smooth';
  defaultComplexity: 'minimal' | 'moderate' | 'detailed';
  preferredDiagramStyle: 'clean' | 'hand-drawn';

  // Setters
  setProactivity: (level: PreferencesState['proactivity']) => void;
  setAnimationSpeed: (speed: PreferencesState['animationSpeed']) => void;
  setDefaultComplexity: (complexity: PreferencesState['defaultComplexity']) => void;
  setPreferredDiagramStyle: (style: PreferencesState['preferredDiagramStyle']) => void;

  // Get all as object (for sending to server)
  getPreferences: () => {
    proactivity: PreferencesState['proactivity'];
    animationSpeed: PreferencesState['animationSpeed'];
    defaultComplexity: PreferencesState['defaultComplexity'];
    preferredDiagramStyle: PreferencesState['preferredDiagramStyle'];
  };
}

/**
 * Zustand store for user preferences with localStorage persistence
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Defaults (AI discretion = medium/moderate)
      proactivity: 'medium',
      animationSpeed: 'fast',
      defaultComplexity: 'moderate',
      preferredDiagramStyle: 'hand-drawn',  // Excalidraw's natural style

      setProactivity: (level) => set({ proactivity: level }),
      setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
      setDefaultComplexity: (complexity) => set({ defaultComplexity: complexity }),
      setPreferredDiagramStyle: (style) => set({ preferredDiagramStyle: style }),

      getPreferences: () => ({
        proactivity: get().proactivity,
        animationSpeed: get().animationSpeed,
        defaultComplexity: get().defaultComplexity,
        preferredDiagramStyle: get().preferredDiagramStyle,
      }),
    }),
    {
      name: 'canvas-preferences',  // localStorage key
    }
  )
);
