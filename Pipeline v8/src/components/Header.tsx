/**
 * Header Component
 * Pipeline v8
 *
 * US-116: Dashboard project info header
 */
import React from 'react';
import { Box, Text } from 'ink';
import type { PipelineMode } from '../types/index.js';

interface HeaderProps {
  projectName: string;
  mode: PipelineMode;
  workerStatus: 'running' | 'stopped';
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  mode,
  workerStatus,
}) => {
  // SKELETON: Static display, no dynamic updates
  const modeLabel =
    mode === 'new' ? 'New Project' : mode === 'feature' ? 'Add Feature' : 'Fix Bug';

  return (
    <Box
      borderStyle="single"
      paddingX={1}
      justifyContent="space-between"
      width="100%"
    >
      <Box>
        <Text bold color="cyan">
          PIPELINE v8
        </Text>
      </Box>
      <Box>
        <Text>Worker: </Text>
        <Text color={workerStatus === 'running' ? 'green' : 'red'}>
          {workerStatus === 'running' ? '● Running' : '● Stopped'}
        </Text>
      </Box>
    </Box>
  );
};
