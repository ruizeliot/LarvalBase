import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface ModalTestProps {
  simulateClose?: boolean;
}

export const ModalTest: React.FC<ModalTestProps> = ({ simulateClose }) => {
  const { exit } = useApp();
  const [closed, setClosed] = useState(false);

  // Simulate escape for testing when stdin isn't available
  // Delay increased to 1000ms to allow test harness to capture initial state
  useEffect(() => {
    if (simulateClose) {
      const timer = setTimeout(() => {
        setClosed(true);
        setTimeout(() => exit(), 500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simulateClose, exit]);

  useInput((input, key) => {
    if (key.escape) {
      setClosed(true);
      setTimeout(() => exit(), 100);
    }
  }, { isActive: !simulateClose });

  if (closed) {
    return <Text>Modal closed</Text>;
  }

  // Use 'single' border style for ┌┐│└┘ characters instead of 'round' (╭╮╯╰)
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold color="cyan">Modal Title</Text>
      <Box marginY={1}>
        <Text>Content</Text>
      </Box>
      <Text dimColor>[Esc] Close</Text>
    </Box>
  );
};
