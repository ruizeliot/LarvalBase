import React from 'react';
import { Box, Text } from 'ink';
import type { Epic } from '../types/index.js';

interface EpicListProps {
  epics: Epic[];
  currentEpic?: string;
}

const statusIcons: Record<string, string> = {
  complete: '✓',
  in_progress: '▶',
  pending: '○',
  error: '✗',
};

const statusColors: Record<string, string> = {
  complete: 'green',
  in_progress: 'cyan',
  pending: 'gray',
  error: 'red',
};

export const EpicList: React.FC<EpicListProps> = ({ epics, currentEpic }) => {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Epics</Text>
      <Box flexDirection="column" marginTop={1}>
        {epics.length === 0 ? (
          <Text dimColor>No epics defined</Text>
        ) : (
          epics.map((epic, index) => {
            const isCurrent = epic.id === currentEpic;
            return (
              <Box key={epic.id} gap={1}>
                <Text color={statusColors[epic.status]}>
                  {statusIcons[epic.status] || '?'}
                </Text>
                <Text
                  bold={isCurrent}
                  color={isCurrent ? 'cyan' : undefined}
                  dimColor={epic.status === 'pending'}
                >
                  {index + 1}. {epic.name}
                </Text>
                <Text dimColor>({epic.testsPass}/{epic.testsTotal} tests)</Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};
