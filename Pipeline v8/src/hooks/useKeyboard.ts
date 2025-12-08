/**
 * Keyboard Hooks
 * Pipeline v8
 *
 * Global keyboard handling
 */
import { useInput, useApp } from 'ink';
import { useCallback, useState } from 'react';

interface KeyboardHandlers {
  onQuit?: () => void;
  onHelp?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onAdvance?: () => void;
  onFocusWorker?: () => void;
}

/**
 * US-007: Global keyboard handler hook
 */
export function useGlobalKeyboard(handlers: KeyboardHandlers = {}) {
  const { exit } = useApp();
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useInput((input, key) => {
    // US-007: q triggers quit flow
    if (input === 'q' && !showQuitDialog) {
      setShowQuitDialog(true);
      handlers.onQuit?.();
    }

    // US-007: ? toggles help
    if (input === '?') {
      setShowHelp(!showHelp);
      handlers.onHelp?.();
    }

    // US-007: Ctrl+C emergency stop
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  return {
    showQuitDialog,
    setShowQuitDialog,
    showHelp,
    setShowHelp,
  };
}

/**
 * US-125-127: Dashboard keyboard handler hook
 */
export function useDashboardKeyboard(handlers: KeyboardHandlers = {}) {
  useInput((input, key) => {
    // US-125: p to pause
    if (input === 'p') {
      handlers.onPause?.();
    }

    // US-090: r to resume
    if (input === 'r') {
      handlers.onResume?.();
    }

    // US-126: a to advance
    if (input === 'a') {
      handlers.onAdvance?.();
    }

    // US-127: w to focus worker
    if (input === 'w') {
      handlers.onFocusWorker?.();
    }
  });
}

/**
 * US-008: Dialog keyboard handler hook
 */
export function useDialogKeyboard(
  onConfirm: () => void,
  onCancel: () => void
) {
  useInput((input, key) => {
    if (key.return) {
      onConfirm();
    }
    if (key.escape) {
      onCancel();
    }
  });
}
