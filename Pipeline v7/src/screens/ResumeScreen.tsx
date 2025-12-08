import React from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { Divider } from '../components/Divider.js';
import { Badge } from '../components/Badge.js';
import type { Manifest } from '../types/index.js';

interface ResumeScreenProps {
  manifest: Manifest;
  onResume: () => void;
  onNew: () => void;
  onQuit: () => void;
}

const phaseNames: Record<string, string> = {
  '1': 'Brainstorm',
  '2': 'Specs',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize',
};

export const ResumeScreen: React.FC<ResumeScreenProps> = ({
  manifest,
  onResume,
  onNew,
  onQuit,
}) => {
  useInput((input) => {
    if (input === 'q') {
      onQuit();
    }
  });

  const currentPhase = manifest.currentPhase;
  const phaseName = phaseNames[currentPhase] ?? 'Unknown';
  const phaseStatus = manifest.phases[currentPhase]?.status ?? 'pending';

  // Calculate overall progress
  const completedPhases = Object.values(manifest.phases).filter(
    (p) => p.status === 'complete'
  ).length;
  const progress = Math.round((completedPhases / 5) * 100);

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">PIPELINE v7</Text>
        <Text> - Resume</Text>
      </Box>

      <Divider />

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Project Found</Text>
        <Box flexDirection="column" marginTop={1} paddingLeft={2}>
          <Text>Name: <Text color="cyan">{manifest.project.name}</Text></Text>
          <Text>Path: <Text dimColor>{manifest.project.path}</Text></Text>
          <Text>
            Phase: <Text color="yellow">{currentPhase}</Text> - {phaseName}{' '}
            <Badge variant={phaseStatus === 'complete' ? 'success' : phaseStatus === 'running' ? 'info' : 'warning'}>
              {phaseStatus}
            </Badge>
          </Text>
          <Text>Progress: <Text color="green">{progress}%</Text></Text>
          <Text>Cost: <Text color="green">${manifest.cost.total.toFixed(2)}</Text></Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text bold>What would you like to do?</Text>
      </Box>

      <Box marginTop={1}>
        <SelectInput
          items={[
            { label: 'Resume Pipeline', value: 'resume' },
            { label: 'Start Fresh', value: 'new' },
            { label: 'Quit', value: 'quit' },
          ]}
          onSelect={(item) => {
            if (item.value === 'resume') onResume();
            else if (item.value === 'new') onNew();
            else onQuit();
          }}
        />
      </Box>

      <Box marginTop={2}>
        <Text dimColor>[q] Quit</Text>
      </Box>
    </Box>
  );
};
