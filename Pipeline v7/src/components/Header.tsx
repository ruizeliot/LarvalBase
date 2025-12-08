import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from './Badge.js';

interface HeaderProps {
  projectName: string;
  phase: number;
  phaseName: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

const phaseNames: Record<number, string> = {
  1: 'Brainstorm',
  2: 'Specs',
  3: 'Bootstrap',
  4: 'Implement',
  5: 'Finalize',
};

export const Header: React.FC<HeaderProps> = ({
  projectName,
  phase,
  phaseName,
  status,
}) => {
  const statusVariant = status === 'complete' ? 'success' :
    status === 'error' ? 'error' :
    status === 'running' ? 'info' : 'warning';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">PIPELINE v7</Text>
        <Text dimColor>{projectName}</Text>
      </Box>
      <Box marginTop={1} gap={2}>
        <Box>
          <Text>Phase: </Text>
          <Text bold color="yellow">{phase}</Text>
          <Text> - {phaseName || phaseNames[phase] || 'Unknown'}</Text>
        </Box>
        <Badge variant={statusVariant}>{status}</Badge>
      </Box>
    </Box>
  );
};
