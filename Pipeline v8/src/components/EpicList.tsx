/**
 * EpicList Component
 * Pipeline v8
 *
 * US-119: Dashboard epic list
 */
import React from 'react';
import { Box, Text } from 'ink';
import type { EpicInfo } from '../types/index.js';

interface EpicListProps {
  epics: EpicInfo[];
  currentEpic?: number;
  title?: string;
}

export const EpicList: React.FC<EpicListProps> = ({
  epics,
  currentEpic,
  title = 'Epics',
}) => {
  const getStatusIcon = (status: EpicInfo['status'], id: number) => {
    if (status === 'complete') return '✓';
    if (id === currentEpic) return '▶';
    return ' ';
  };

  const getStatusColor = (status: EpicInfo['status'], id: number) => {
    if (status === 'complete') return 'green';
    if (id === currentEpic) return 'yellow';
    return 'gray';
  };

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold>─ {title} ─</Text>
      {epics.length === 0 ? (
        <Text dimColor>No epics</Text>
      ) : (
        epics.map((epic) => (
          <Box key={epic.id}>
            <Text color={getStatusColor(epic.status, epic.id)}>
              [{getStatusIcon(epic.status, epic.id)}]
            </Text>
            <Text
              color={epic.id === currentEpic ? 'white' : 'gray'}
              bold={epic.id === currentEpic}
            >
              {' '}
              {epic.id}. {epic.name}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
};
