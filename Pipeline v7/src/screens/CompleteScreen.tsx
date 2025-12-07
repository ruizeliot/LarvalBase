import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Manifest } from '../types/index.js';
import { Header } from '../components/Header.js';

interface CompleteScreenProps {
  manifest: Manifest;
  onNewProject: () => void;
  onExit: () => void;
}

export const CompleteScreen: React.FC<CompleteScreenProps> = ({
  manifest,
  onNewProject,
  onExit,
}) => {
  // SKELETON: Shows completion but stats are placeholder
  const [selectedButton, setSelectedButton] = useState<'new' | 'exit'>('new');

  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow) {
      setSelectedButton((prev) => (prev === 'new' ? 'exit' : 'new'));
    }

    if (key.return) {
      if (selectedButton === 'new') {
        onNewProject();
      } else {
        onExit();
      }
    }

    if (input === 'q') {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="green">
          ✓ PIPELINE COMPLETE
        </Text>
      </Box>

      <Box flexDirection="column" borderStyle="round" padding={1} marginBottom={1}>
        <Text>
          <Text dimColor>Project:</Text> {manifest.project.name}
        </Text>
        <Text>
          <Text dimColor>Type:</Text>{' '}
          {manifest.project.type === 'terminal' ? 'Terminal (Ink)' : 'Desktop (Tauri)'}
        </Text>
        <Text>
          <Text dimColor>Mode:</Text>{' '}
          {manifest.project.mode === 'new'
            ? 'New Project'
            : manifest.project.mode === 'feature'
            ? 'Add Feature'
            : 'Fix Bug'}
        </Text>
      </Box>

      <Box flexDirection="column" borderStyle="round" padding={1} marginBottom={1}>
        <Text bold dimColor>
          Summary
        </Text>
        <Text>
          <Text dimColor>Phases Completed:</Text> 5/5
        </Text>
        <Text>
          <Text dimColor>Epics Completed:</Text>{' '}
          {manifest.phases[4]?.epics?.length || 0}/
          {manifest.phases[4]?.epics?.length || 0}
        </Text>
        <Text>
          <Text dimColor>Total Cost:</Text>{' '}
          <Text color="yellow">${manifest.cost.total.toFixed(2)}</Text>
        </Text>
        <Text>
          <Text dimColor>Total Duration:</Text>{' '}
          {Math.floor(manifest.duration.total / 3600)}h{' '}
          {Math.floor((manifest.duration.total % 3600) / 60)}m
        </Text>
      </Box>

      <Box gap={2}>
        <Text
          inverse={selectedButton === 'new'}
          color={selectedButton === 'new' ? 'cyan' : undefined}
        >
          {' '}
          {'>'} NEW PROJECT{' '}
        </Text>
        <Text
          inverse={selectedButton === 'exit'}
          color={selectedButton === 'exit' ? 'red' : undefined}
        >
          {' '}
          x EXIT{' '}
        </Text>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>[Enter] {selectedButton === 'new' ? 'New Project' : 'Exit'} [q] Exit</Text>
      </Box>
    </Box>
  );
};
