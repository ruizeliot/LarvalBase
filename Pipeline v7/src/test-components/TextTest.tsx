import React from 'react';
import { Box, Text, useApp } from 'ink';

interface TextTestProps {
  empty?: boolean;
}

export const TextTest: React.FC<TextTestProps> = ({ empty }) => {
  const { exit } = useApp();

  // Auto-exit after rendering
  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  if (empty) {
    return <Text></Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>bold</Text>
      <Text italic>italic</Text>
      <Text underline>underline</Text>
      <Text strikethrough>strikethrough</Text>
      <Text dimColor>dimmed</Text>
      <Text inverse>inverse</Text>
      <Text color="red">colored</Text>
    </Box>
  );
};
