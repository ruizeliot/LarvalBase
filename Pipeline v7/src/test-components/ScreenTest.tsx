import React from 'react';
import { Box, Text, useApp } from 'ink';

export const ScreenTest: React.FC = () => {
  const { exit } = useApp();

  // Auto-exit after rendering
  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  const width = 40;
  const char = '═';

  return (
    <Box flexDirection="column">
      <Text dimColor>{char.repeat(width)}</Text>
      <Box paddingX={2} paddingY={1}>
        <Text>Screen Content</Text>
      </Box>
      <Text dimColor>{char.repeat(width)}</Text>
    </Box>
  );
};
