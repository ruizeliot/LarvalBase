/**
 * ProgressBar Component
 * Pipeline v8
 *
 * US-118: Dashboard progress bar
 */
import React from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  percent: number;
  width?: number;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  width = 40,
  label,
}) => {
  // SKELETON: Shows static bar, doesn't update dynamically
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width);
  const empty = width - filled;

  return (
    <Box flexDirection="column">
      {label && <Text dimColor>{label}</Text>}
      <Box>
        <Text>[</Text>
        <Text color="green">{'█'.repeat(filled)}</Text>
        <Text dimColor>{'░'.repeat(empty)}</Text>
        <Text>] </Text>
        <Text>{Math.round(percent)}%</Text>
      </Box>
    </Box>
  );
};
