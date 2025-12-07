import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface UseAppTestProps {
  simulateQuit?: boolean;
}

export const UseAppTest: React.FC<UseAppTestProps> = ({ simulateQuit }) => {
  const { exit } = useApp();
  const [exiting, setExiting] = useState(false);

  // Simulate quit for testing when stdin isn't available
  // Delay increased to 1000ms to allow test harness to capture initial state
  useEffect(() => {
    if (simulateQuit) {
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => exit(), 500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simulateQuit, exit]);

  useInput((input) => {
    if (input === 'q') {
      setExiting(true);
      setTimeout(() => exit(), 100);
    }
  }, { isActive: !simulateQuit });

  if (exiting) {
    return <Text>Exiting...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>App ready</Text>
      <Text dimColor>(press 'q' to exit)</Text>
    </Box>
  );
};
