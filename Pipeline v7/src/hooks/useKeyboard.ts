import { useInput, useApp } from 'ink';

interface KeyboardActions {
  onStart?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onFocus?: () => void;
  onHelp?: () => void;
  onQuit?: () => void;
  onClear?: () => void;
  isActive?: boolean;
}

export function useKeyboard(actions: KeyboardActions) {
  const { exit, clear } = useApp();
  const isActive = actions.isActive ?? true;

  useInput((input, key) => {
    if (!isActive) return;

    // Global shortcuts
    if (input === 's') {
      actions.onStart?.();
    } else if (input === 'x') {
      actions.onStop?.();
    } else if (input === 'r') {
      actions.onRestart?.();
    } else if (input === 'f') {
      actions.onFocus?.();
    } else if (input === '?') {
      actions.onHelp?.();
    } else if (input === 'q') {
      actions.onQuit?.();
    } else if (key.ctrl && input === 'l') {
      actions.onClear?.();
      clear();
    }
  });
}
