import React from 'react';
import { Box, Text, useApp } from 'ink';

interface BoxTestProps {
  empty?: boolean;
}

export const BoxTest: React.FC<BoxTestProps> = ({ empty }) => {
  const { exit } = useApp();

  // Auto-exit after rendering
  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  if (empty) {
    return (
      <Box borderStyle="single" width={20} height={3}>
        <Text></Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" padding={1}>
      <Text>Box Content</Text>
    </Box>
  );
};
