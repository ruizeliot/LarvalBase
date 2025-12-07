import React from 'react';
import { Box, Text, useApp } from 'ink';

interface DividerTestProps {
  title?: string;
}

export const DividerTest: React.FC<DividerTestProps> = ({ title }) => {
  const { exit } = useApp();

  // Auto-exit after rendering
  React.useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  const width = 40;
  const char = '─';

  if (title) {
    const titleWithPadding = ` ${title} `;
    const sideWidth = Math.floor((width - titleWithPadding.length) / 2);
    return (
      <Box>
        <Text dimColor>{char.repeat(sideWidth)}</Text>
        <Text bold>{titleWithPadding}</Text>
        <Text dimColor>{char.repeat(sideWidth)}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text dimColor>{char.repeat(width)}</Text>
    </Box>
  );
};
