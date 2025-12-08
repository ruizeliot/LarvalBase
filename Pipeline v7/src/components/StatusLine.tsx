import React from 'react';
import { Box, Text } from 'ink';

interface StatusLineProps {
  cost: string;
  duration: string;
  workerStatus: 'idle' | 'running' | 'stopped' | 'crashed';
  shortcuts?: boolean;
}

export const StatusLine: React.FC<StatusLineProps> = ({
  cost,
  duration,
  workerStatus,
  shortcuts = true,
}) => {
  const workerColor = workerStatus === 'running' ? 'green' :
    workerStatus === 'crashed' ? 'red' :
    workerStatus === 'stopped' ? 'yellow' : 'gray';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Box gap={3}>
          <Text>
            <Text dimColor>Cost:</Text> <Text color="green">{cost}</Text>
          </Text>
          <Text>
            <Text dimColor>Duration:</Text> <Text>{duration}</Text>
          </Text>
          <Text>
            <Text dimColor>Worker:</Text> <Text color={workerColor}>{workerStatus}</Text>
          </Text>
        </Box>
      </Box>
      {shortcuts && (
        <Box marginTop={1}>
          <Text dimColor>
            [s] Start  [x] Stop  [r] Restart  [f] Focus  [?] Help  [q] Quit
          </Text>
        </Box>
      )}
    </Box>
  );
};
