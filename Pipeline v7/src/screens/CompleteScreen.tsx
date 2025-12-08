import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { Divider } from '../components/Divider.js';
import { Badge } from '../components/Badge.js';
import type { Manifest } from '../types/index.js';

interface CompleteScreenProps {
  manifest: Manifest;
  onNew: () => void;
  onQuit: () => void;
}

export const CompleteScreen: React.FC<CompleteScreenProps> = ({
  manifest,
  onNew,
  onQuit,
}) => {
  // Calculate stats
  const completedEpics = manifest.epics.filter((e) => e.status === 'complete').length;
  const totalEpics = manifest.epics.length;
  const completedPhases = Object.values(manifest.phases).filter((p) => p.status === 'complete').length;

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="green">PIPELINE COMPLETE!</Text>
      </Box>

      <Divider />

      <Box flexDirection="column" marginTop={1}>
        <Box justifyContent="center">
          <Badge variant="success">SUCCESS</Badge>
        </Box>

        <Box flexDirection="column" marginTop={2} paddingX={2}>
          <Text bold>Summary</Text>
          <Box flexDirection="column" marginTop={1} paddingLeft={2}>
            <Text>Project: <Text color="cyan">{manifest.project.name}</Text></Text>
            <Text>Phases: <Text color="green">{completedPhases}/5</Text> complete</Text>
            <Text>Epics: <Text color="green">{completedEpics}/{totalEpics}</Text> complete</Text>
            <Text>Tests: <Text color="green">{manifest.tests.passing}/{manifest.tests.total}</Text> passing</Text>
            <Text>Coverage: <Text color={manifest.tests.coverage >= 80 ? 'green' : 'yellow'}>{manifest.tests.coverage}%</Text></Text>
            <Text>Total Cost: <Text color="green">${manifest.cost.total.toFixed(2)}</Text></Text>
            <Text>Total Duration: <Text>{formatDuration(manifest.duration.total)}</Text></Text>
          </Box>
        </Box>

        <Box marginTop={2}>
          <Text bold>Phase Breakdown</Text>
        </Box>
        <Box flexDirection="column" marginTop={1} paddingLeft={2}>
          {Object.entries(manifest.phases).map(([phase, data]) => (
            <Text key={phase}>
              Phase {phase}:{' '}
              <Badge variant={data.status === 'complete' ? 'success' : 'warning'}>
                {data.status}
              </Badge>
              {manifest.cost.byPhase[phase] && (
                <Text dimColor> (${manifest.cost.byPhase[phase].toFixed(2)})</Text>
              )}
            </Text>
          ))}
        </Box>
      </Box>

      <Divider />

      <Box marginTop={1}>
        <SelectInput
          items={[
            { label: 'Start New Pipeline', value: 'new' },
            { label: 'Exit', value: 'quit' },
          ]}
          onSelect={(item) => {
            if (item.value === 'new') onNew();
            else onQuit();
          }}
        />
      </Box>
    </Box>
  );
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
