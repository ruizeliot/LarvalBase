import React from 'react';
import { Box, Text } from 'ink';

interface DividerProps {
  title?: string;
  width?: number;
  style?: 'single' | 'double' | 'dashed';
}

export const Divider: React.FC<DividerProps> = ({
  title,
  width = 40,
  style = 'single',
}) => {
  const chars: Record<string, string> = {
    single: '─',
    double: '═',
    dashed: '-',
  };

  const char = chars[style];

  if (title) {
    const titleWithPadding = ` ${title} `;
    const sideWidth = Math.max(2, Math.floor((width - titleWithPadding.length) / 2));
    const leftSide = char.repeat(sideWidth);
    const rightSide = char.repeat(sideWidth);

    return (
      <Box>
        <Text dimColor>{leftSide}</Text>
        <Text bold>{titleWithPadding}</Text>
        <Text dimColor>{rightSide}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text dimColor>{char.repeat(width)}</Text>
    </Box>
  );
};
