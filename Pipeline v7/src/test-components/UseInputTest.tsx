import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface UseInputTestProps {
  simulateKey?: string;
}

export const UseInputTest: React.FC<UseInputTestProps> = ({ simulateKey }) => {
  const { exit } = useApp();
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Simulate key press for testing when stdin isn't available
  useEffect(() => {
    if (simulateKey) {
      const timer = setTimeout(() => {
        setLastKey(simulateKey);
        setTimeout(() => exit(), 200);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [simulateKey, exit]);

  useInput((input, key) => {
    if (input === 'q') {
      setTimeout(() => exit(), 100);
      return;
    }

    if (input) {
      setLastKey(input);
    } else if (key.escape) {
      setLastKey('Escape');
    } else if (key.return) {
      setLastKey('Enter');
    } else if (key.upArrow) {
      setLastKey('Up');
    } else if (key.downArrow) {
      setLastKey('Down');
    } else if (key.leftArrow) {
      setLastKey('Left');
    } else if (key.rightArrow) {
      setLastKey('Right');
    } else if (key.tab) {
      setLastKey('Tab');
    }
  }, { isActive: !simulateKey });

  return (
    <Box flexDirection="column">
      <Text>Listening for input</Text>
      {lastKey && <Text>Key: {lastKey}</Text>}
      <Text dimColor>(press 'q' to quit)</Text>
    </Box>
  );
};
