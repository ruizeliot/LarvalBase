/**
 * ResumeScreen
 * Pipeline v8
 *
 * US-108-114: Resume screen
 */
import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Manifest } from '../types/index.js';
import { StatusBar } from '../components/StatusBar.js';

interface ResumeScreenProps {
  manifest: Manifest;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export const ResumeScreen: React.FC<ResumeScreenProps> = ({
  manifest,
  onResume,
  onCancel,
  onDelete,
}) => {
  useInput((input, key) => {
    if (key.return) {
      onResume();
    }
    if (key.escape) {
      onCancel();
    }
    if (input === 'd') {
      onDelete();
    }
  });

  // SKELETON: Shows static data, no real cost/duration calculation
  const phaseName = getPhaseDisplayName(manifest.currentPhase);
  const currentEpic = manifest.phases['4']?.currentEpic;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          RESUME PIPELINE
        </Text>
      </Box>

      {/* Project Info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>Project: {manifest.project.name}</Text>
        <Text dimColor>Path: {manifest.project.path}</Text>
      </Box>

      {/* Last State */}
      <Box flexDirection="column" borderStyle="single" paddingX={1} marginBottom={1}>
        <Text bold>Last State</Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>Phase: {manifest.currentPhase} - {phaseName}</Text>
          {currentEpic && (
            <Text>Epic: {currentEpic}/{manifest.phases['4']?.epics?.length || 0}</Text>
          )}
          <Text>Progress: {calculateProgress(manifest)}%</Text>
          <Text dimColor>Last Activity: N/A</Text>
          <Text></Text>
          <Text>Cost: ${manifest.cost.total.toFixed(2)}</Text>
          <Text>Duration: {formatDurationSimple(manifest.duration.total)}</Text>
        </Box>
      </Box>

      {/* Buttons */}
      <Box marginBottom={1}>
        <Box borderStyle="single" paddingX={2} marginRight={2}>
          <Text color="cyan">&gt; RESUME</Text>
        </Box>
        <Box borderStyle="single" paddingX={2}>
          <Text>CANCEL</Text>
        </Box>
      </Box>

      {/* Status Bar */}
      <StatusBar
        hints={[
          { key: 'Enter', label: 'Resume' },
          { key: 'Esc', label: 'Cancel' },
          { key: 'd', label: 'Delete & Start Fresh' },
        ]}
      />
    </Box>
  );
};

function getPhaseDisplayName(phase: number): string {
  const names: Record<number, string> = {
    1: 'Brainstorm',
    2: 'E2E Specs',
    3: 'Bootstrap',
    4: 'Implement',
    5: 'Finalize',
  };
  return names[phase] || 'Unknown';
}

function calculateProgress(manifest: Manifest): number {
  // SKELETON: Returns 0
  return 0;
}

function formatDurationSimple(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
