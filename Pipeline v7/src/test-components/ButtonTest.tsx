import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface ButtonTestProps {
  simulatePress?: boolean;
}

export const ButtonTest: React.FC<ButtonTestProps> = ({ simulatePress }) => {
  const { exit } = useApp();
  const [pressed, setPressed] = useState(false);

  // Simulate button press for testing when stdin isn't available
  // Delay increased to 1000ms to allow test harness to capture initial state
  useEffect(() => {
    if (simulatePress) {
      const timer = setTimeout(() => {
        setPressed(true);
        setTimeout(() => exit(), 500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simulatePress, exit]);

  useInput((input, key) => {
    if (key.return) {
      setPressed(true);
      setTimeout(() => exit(), 100);
    }
  }, { isActive: !simulatePress });

  if (pressed) {
    return <Text>Button pressed!</Text>;
  }

  return (
    <Box>
      <Text inverse>[ Submit ]</Text>
    </Box>
  );
};
