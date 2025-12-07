import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface InputTestProps {
  placeholder?: string;
  simulateInput?: string;
  simulatePlaceholder?: boolean;
}

export const InputTest: React.FC<InputTestProps> = ({ placeholder, simulateInput, simulatePlaceholder }) => {
  const { exit } = useApp();
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Simulate input for testing when stdin isn't available
  // Delay increased to 1000ms to allow test harness to capture initial state
  useEffect(() => {
    if (simulateInput) {
      const timer = setTimeout(() => {
        setValue(simulateInput);
        setTimeout(() => {
          setSubmitted(true);
          setTimeout(() => exit(), 300);
        }, 500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simulateInput, exit]);

  // Simulate placeholder mode - just show initial state and exit
  useEffect(() => {
    if (simulatePlaceholder) {
      const timer = setTimeout(() => exit(), 300);
      return () => clearTimeout(timer);
    }
  }, [simulatePlaceholder, exit]);

  useInput((input, key) => {
    if (key.return) {
      setSubmitted(true);
      setTimeout(() => exit(), 100);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setValue((prev) => prev + input);
    }
  }, { isActive: !simulateInput && !simulatePlaceholder });

  if (submitted) {
    return <Text>Submitted: {value}</Text>;
  }

  return (
    <Box>
      <Text>Enter text: </Text>
      {value ? (
        <Text>{value}|</Text>
      ) : placeholder ? (
        <Text dimColor>{placeholder}</Text>
      ) : (
        <Text>|</Text>
      )}
    </Box>
  );
};
