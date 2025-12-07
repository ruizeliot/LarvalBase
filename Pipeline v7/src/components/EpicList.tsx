import React from 'react';
import { Box, Text } from 'ink';
import type { Epic } from '../types/index.js';

interface EpicListProps {
  epics: Epic[];
  currentEpic?: number;
}

export const EpicList: React.FC<EpicListProps> = ({ epics, currentEpic }) => {
  // SKELETON: Renders epics but not connected to real data
  const getStatusIcon = (status: Epic['status']): string => {
    switch (status) {
      case 'complete':
        return '✓';
      case 'in-progress':
        return '●';
      case 'pending':
        return '○';
      default:
        return '?';
    }
  };

  const getStatusColor = (status: Epic['status']): string => {
    switch (status) {
      case 'complete':
        return 'green';
      case 'in-progress':
        return 'yellow';
      case 'pending':
        return 'gray';
      default:
        return 'white';
    }
  };

  if (epics.length === 0) {
    return (
      <Box>
        <Text dimColor>No epics</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold dimColor>
        Epics:
      </Text>
      {epics.map((epic) => (
        <Box key={epic.id}>
          <Text color={getStatusColor(epic.status)}>
            {getStatusIcon(epic.status)}{' '}
          </Text>
          <Text
            bold={epic.id === currentEpic}
            color={epic.id === currentEpic ? 'cyan' : undefined}
          >
            {epic.id}. {epic.name}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
