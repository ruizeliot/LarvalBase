import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="cyan">
          {title}
        </Text>
      </Box>
      {subtitle && (
        <Box>
          <Text dimColor>{subtitle}</Text>
        </Box>
      )}
    </Box>
  );
};
