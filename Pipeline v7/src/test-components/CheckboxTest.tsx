import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface CheckboxTestProps {
  simulateToggle?: boolean;
}

export const CheckboxTest: React.FC<CheckboxTestProps> = ({ simulateToggle }) => {
  const { exit } = useApp();
  const [checked, setChecked] = useState(false);

  // Simulate toggle for testing when stdin isn't available
  // Delay increased to 1000ms to allow test harness to capture initial state
  useEffect(() => {
    if (simulateToggle) {
      const timer = setTimeout(() => {
        setChecked(true);
        setTimeout(() => exit(), 500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simulateToggle, exit]);

  useInput((input, key) => {
    if (input === ' ' || key.return) {
      setChecked((prev) => !prev);
    }
    if (input === 'q') {
      setTimeout(() => exit(), 100);
    }
  }, { isActive: !simulateToggle });

  return (
    <Box>
      <Text>
        {checked ? '☑' : '☐'} Enable feature
      </Text>
    </Box>
  );
};
