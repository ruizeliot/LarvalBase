/**
 * StatusBar Component
 * Pipeline v8
 *
 * US-140: Status bar with keyboard hints
 */
import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  hints: { key: string; label: string }[];
}

export const StatusBar: React.FC<StatusBarProps> = ({ hints }) => {
  return (
    <Box borderStyle="single" paddingX={1} width="100%">
      {hints.map((hint, i) => (
        <Box key={hint.key} marginRight={2}>
          <Text color="yellow">[{hint.key}]</Text>
          <Text> {hint.label}</Text>
          {i < hints.length - 1 && <Text>  </Text>}
        </Box>
      ))}
    </Box>
  );
};
