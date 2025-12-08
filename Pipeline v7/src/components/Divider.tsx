import React from 'react';
import { Box, Text, useStdout } from 'ink';

interface DividerProps {
  title?: string;
}

export const Divider: React.FC<DividerProps> = ({ title }) => {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;

  if (title) {
    const sideLength = Math.max(0, Math.floor((width - title.length - 4) / 2));
    const left = '─'.repeat(sideLength);
    const right = '─'.repeat(sideLength);

    return (
      <Box>
        <Text dimColor>{left}</Text>
        <Text> {title} </Text>
        <Text dimColor>{right}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text dimColor>{'─'.repeat(width)}</Text>
    </Box>
  );
};
