import React from 'react';
import { Box, Text } from 'ink';

interface StatusLineProps {
  cost?: number;
  duration?: number;
  phase?: number;
  epic?: number;
}

export const StatusLine: React.FC<StatusLineProps> = ({
  cost = 0,
  duration = 0,
  phase,
  epic,
}) => {
  // SKELETON: Shows placeholder values
  const formatCost = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <Box gap={2}>
      {phase !== undefined && (
        <Text>
          <Text dimColor>Phase:</Text> {phase}
        </Text>
      )}
      {epic !== undefined && (
        <Text>
          <Text dimColor>Epic:</Text> {epic}
        </Text>
      )}
      <Text>
        <Text dimColor>Cost:</Text> <Text color="yellow">{formatCost(cost)}</Text>
      </Text>
      <Text>
        <Text dimColor>Duration:</Text> {formatDuration(duration)}
      </Text>
    </Box>
  );
};
