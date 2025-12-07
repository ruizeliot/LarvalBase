import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface SelectTestProps {
  simulateDown?: boolean;
}

export const SelectTest: React.FC<SelectTestProps> = ({ simulateDown }) => {
  const { exit } = useApp();
  const [selected, setSelected] = useState(0);
  const options = ['Option 1', 'Option 2', 'Option 3'];

  // Simulate down arrow for testing when stdin isn't available
  // Delay increased to 1000ms to allow test harness to capture initial state
  useEffect(() => {
    if (simulateDown) {
      const timer = setTimeout(() => {
        setSelected(1);
        setTimeout(() => exit(), 500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simulateDown, exit]);

  useInput((input, key) => {
    if (key.downArrow) {
      setSelected((prev) => Math.min(prev + 1, options.length - 1));
    }
    if (key.upArrow) {
      setSelected((prev) => Math.max(prev - 1, 0));
    }
    if (key.return) {
      setTimeout(() => exit(), 100);
    }
  }, { isActive: !simulateDown });

  return (
    <Box flexDirection="column">
      {options.map((option, index) => (
        <Box key={option}>
          <Text color={index === selected ? 'cyan' : undefined}>
            {index === selected ? '► ' : '  '}
            {option}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
