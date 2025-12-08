import React from 'react';
import { Box, Text } from 'ink';
import type { ProgressBarProps } from '../types/index.js';

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  width = 20,
  showPercent = true,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const filledWidth = Math.round((clampedValue / 100) * width);
  const emptyWidth = width - filledWidth;

  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);

  return (
    <Box>
      <Text color="green">{filled}</Text>
      <Text dimColor>{empty}</Text>
      {showPercent && (
        <Text> {Math.round(clampedValue)}%</Text>
      )}
    </Box>
  );
};
