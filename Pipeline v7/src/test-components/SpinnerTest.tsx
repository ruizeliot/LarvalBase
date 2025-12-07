import React from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';

export const SpinnerTest: React.FC = () => {
  const { exit } = useApp();

  // Auto-exit after showing spinner
  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 500);
    return () => clearTimeout(timer);
  }, [exit]);

  return (
    <Box>
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
      <Text> Loading...</Text>
    </Box>
  );
};
