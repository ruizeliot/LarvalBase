import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface SplitPaneTestProps {
  simulateResize?: boolean;
}

export const SplitPaneTest: React.FC<SplitPaneTestProps> = ({ simulateResize }) => {
  const { exit } = useApp();
  const [leftRatio, setLeftRatio] = useState(50);

  // Simulate resize for testing when stdin isn't available
  // Delay increased to 500ms to allow test harness to capture initial state
  useEffect(() => {
    if (simulateResize) {
      const timer = setTimeout(() => {
        setLeftRatio(55);
        setTimeout(() => exit(), 300);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [simulateResize, exit]);

  useInput((input, key) => {
    if (key.rightArrow) {
      setLeftRatio((prev) => Math.min(prev + 5, 80));
    }
    if (key.leftArrow) {
      setLeftRatio((prev) => Math.max(prev - 5, 20));
    }
    if (key.return || input === 'q') {
      setTimeout(() => exit(), 100);
    }
  }, { isActive: !simulateResize });

  return (
    <Box flexDirection="column">
      <Box>
        <Text>Left Pane</Text>
        <Text dimColor> │ </Text>
        <Text>Right Pane</Text>
      </Box>
      <Text dimColor>Resize: {leftRatio}%</Text>
    </Box>
  );
};
