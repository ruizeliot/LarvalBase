import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface RadioTestProps {
  simulateSelect?: boolean;
}

export const RadioTest: React.FC<RadioTestProps> = ({ simulateSelect }) => {
  const { exit } = useApp();
  const [selected, setSelected] = useState(0);
  const [focused, setFocused] = useState(0);
  const options = ['Option A', 'Option B', 'Option C'];

  // Simulate selection for testing when stdin isn't available
  // Auto-exit after rendering initial state
  useEffect(() => {
    if (simulateSelect) {
      // Just render initial state and exit
      const timer = setTimeout(() => exit(), 300);
      return () => clearTimeout(timer);
    }
  }, [simulateSelect, exit]);

  useInput((input, key) => {
    if (key.downArrow) {
      setFocused((prev) => Math.min(prev + 1, options.length - 1));
    }
    if (key.upArrow) {
      setFocused((prev) => Math.max(prev - 1, 0));
    }
    if (key.return || input === ' ') {
      setSelected(focused);
    }
    if (input === 'q') {
      setTimeout(() => exit(), 100);
    }
  }, { isActive: !simulateSelect });

  return (
    <Box flexDirection="column">
      {options.map((option, index) => (
        <Box key={option}>
          <Text color={index === focused ? 'cyan' : undefined}>
            {index === selected ? '● ' : '○ '}
            {option}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
