import { useInput, useApp } from 'ink';
import { useState, useCallback } from 'react';

interface UseKeyboardOptions {
  onQuit?: () => void;
  onHelp?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  active?: boolean;
}

interface KeyboardState {
  showHelp: boolean;
  showQuitConfirm: boolean;
  isPaused: boolean;
}

export function useKeyboard(options: UseKeyboardOptions = {}) {
  const { exit } = useApp();
  const [state, setState] = useState<KeyboardState>({
    showHelp: false,
    showQuitConfirm: false,
    isPaused: false,
  });

  const handleInput = useCallback(
    (input: string, key: { escape?: boolean; ctrl?: boolean }) => {
      // Global shortcuts
      if (input === '?') {
        setState((prev) => ({ ...prev, showHelp: !prev.showHelp }));
        options.onHelp?.();
        return;
      }

      if (input === 'q' && !state.showQuitConfirm) {
        setState((prev) => ({ ...prev, showQuitConfirm: true }));
        return;
      }

      if (state.showQuitConfirm) {
        if (input === 'y' || input === 'Y') {
          options.onQuit?.();
          exit();
          return;
        }
        if (input === 'n' || input === 'N' || key.escape) {
          setState((prev) => ({ ...prev, showQuitConfirm: false }));
          return;
        }
      }

      if (key.escape && state.showHelp) {
        setState((prev) => ({ ...prev, showHelp: false }));
        return;
      }

      if (input === 'p') {
        setState((prev) => ({ ...prev, isPaused: true }));
        options.onPause?.();
        return;
      }

      if (input === 'r' && state.isPaused) {
        setState((prev) => ({ ...prev, isPaused: false }));
        options.onResume?.();
        return;
      }
    },
    [state, options, exit]
  );

  useInput(handleInput, { isActive: options.active ?? true });

  return {
    showHelp: state.showHelp,
    showQuitConfirm: state.showQuitConfirm,
    isPaused: state.isPaused,
    setShowHelp: (show: boolean) => setState((prev) => ({ ...prev, showHelp: show })),
    setShowQuitConfirm: (show: boolean) => setState((prev) => ({ ...prev, showQuitConfirm: show })),
  };
}
