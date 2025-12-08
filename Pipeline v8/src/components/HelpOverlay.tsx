/**
 * HelpOverlay Component
 * Pipeline v8
 *
 * US-135-137: Help overlay
 */
import React from 'react';
import { Box, Text } from 'ink';

interface HelpOverlayProps {
  context: 'launcher' | 'dashboard' | 'complete';
  onClose: () => void;
}

const shortcuts = {
  global: [
    { key: 'q', description: 'Quit' },
    { key: '?', description: 'Toggle help' },
    { key: 'Ctrl+C', description: 'Emergency stop' },
  ],
  launcher: [
    { key: 'Tab', description: 'Next field' },
    { key: 'Shift+Tab', description: 'Previous field' },
    { key: '↑/↓', description: 'Navigate options' },
    { key: 'Enter', description: 'Select/Start' },
  ],
  dashboard: [
    { key: 'p', description: 'Pause pipeline' },
    { key: 'r', description: 'Resume (when paused)' },
    { key: 'a', description: 'Advance phase (manual)' },
    { key: 'w', description: 'Focus worker window' },
  ],
  complete: [
    { key: 'n', description: 'New project' },
    { key: 'q', description: 'Exit' },
  ],
};

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ context, onClose }) => {
  const contextShortcuts = shortcuts[context] || [];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width={50}
    >
      <Text bold color="cyan">
        Keyboard Shortcuts
      </Text>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Global</Text>
        {shortcuts.global.map((s) => (
          <Box key={s.key}>
            <Text color="yellow">{s.key.padEnd(12)}</Text>
            <Text>{s.description}</Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>{context.charAt(0).toUpperCase() + context.slice(1)}</Text>
        {contextShortcuts.map((s) => (
          <Box key={s.key}>
            <Text color="yellow">{s.key.padEnd(12)}</Text>
            <Text>{s.description}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press ? or Esc to close</Text>
      </Box>
    </Box>
  );
};
