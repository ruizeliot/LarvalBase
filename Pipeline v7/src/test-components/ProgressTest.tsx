import React from 'react';
import { Box, Text, useApp } from 'ink';

interface ProgressTestProps {
  value?: number;
}

export const ProgressTest: React.FC<ProgressTestProps> = ({ value = 50 }) => {
  const { exit } = useApp();

  // Auto-exit after rendering
  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  const width = 16;
  const clampedValue = Math.max(0, Math.min(100, value));
  const filled = Math.round((clampedValue / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color="green">{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text> {clampedValue}%</Text>
    </Box>
  );
};
