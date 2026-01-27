import { useRef, useCallback } from 'react';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

interface CanvasEditState {
  lastVersion: number;
  aiElementIds: Set<string>;
}

export interface CanvasEdit {
  type: 'modify' | 'add' | 'delete';
  elementIds: string[];
  description: string;
}

interface UseCanvasEditsOptions {
  onUserEdit: (edit: CanvasEdit) => void;
}

// AI element IDs stored in localStorage for persistence across refresh
const AI_ELEMENTS_KEY = 'canvas_ai_elements';

function loadAiElementIds(): Set<string> {
  try {
    const stored = localStorage.getItem(AI_ELEMENTS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveAiElementIds(ids: Set<string>): void {
  localStorage.setItem(AI_ELEMENTS_KEY, JSON.stringify([...ids]));
}

export function useCanvasEdits({ onUserEdit }: UseCanvasEditsOptions) {
  const stateRef = useRef<CanvasEditState>({
    lastVersion: 0,
    aiElementIds: loadAiElementIds()
  });

  // Register elements created by AI (called when diagram_elements received)
  const registerAiElements = useCallback((ids: string[]) => {
    ids.forEach(id => stateRef.current.aiElementIds.add(id));
    saveAiElementIds(stateRef.current.aiElementIds);
  }, []);

  // Called on Excalidraw onChange - detects user modifications
  const detectEdits = useCallback((
    elements: readonly ExcalidrawElement[],
    sceneVersion: number
  ) => {
    const state = stateRef.current;

    // Skip if scene hasn't actually changed
    if (sceneVersion === state.lastVersion) {
      return;
    }

    // First call - just record initial state
    if (state.lastVersion === 0) {
      state.lastVersion = sceneVersion;
      return;
    }

    state.lastVersion = sceneVersion;

    // Find user-created elements (not from AI)
    const userCreated = elements.filter(
      el => !el.isDeleted && !state.aiElementIds.has(el.id)
    );

    // Detect new user elements
    const newUserElements = userCreated.filter(el => {
      // Element is "new" if it wasn't in AI set and was just created
      // This is approximate - proper detection would need prev state
      return el.updated > Date.now() - 1000;  // Created in last second
    });

    if (newUserElements.length > 0) {
      const description = describeElements(newUserElements);
      onUserEdit({
        type: 'add',
        elementIds: newUserElements.map(el => el.id),
        description
      });
    }

    // Note: Detecting modifications to AI elements and deletions requires
    // comparing previous element state, which we don't track here.
    // For MVP, we focus on detecting new user-drawn elements.
  }, [onUserEdit]);

  // Clear AI element tracking (for session reset)
  const clearAiElements = useCallback(() => {
    stateRef.current.aiElementIds.clear();
    localStorage.removeItem(AI_ELEMENTS_KEY);
  }, []);

  return {
    registerAiElements,
    detectEdits,
    clearAiElements
  };
}

function describeElements(elements: readonly ExcalidrawElement[]): string {
  if (elements.length === 0) return 'no changes';
  if (elements.length === 1) {
    const el = elements[0];
    const type = el.type === 'text' ? 'text' : el.type;
    return `User added ${type}`;
  }
  return `User added ${elements.length} elements`;
}
