/**
 * CompleteScreen
 * Pipeline v8
 *
 * US-129-134: Complete screen
 */
import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Manifest } from '../types/index.js';
import { StatusBar } from '../components/StatusBar.js';

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
  useInput((input) => {
    if (input === 'n') {
      onNewProject();
    }
    if (input === 'q') {
      onExit();
    }
  });

  // SKELETON: Shows static data
  const epicCount = manifest.phases['4']?.epics?.length || 0;
  const completedEpics = manifest.phases['4']?.epics?.filter(
    (e) => e.status === 'complete'
  ).length || 0;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="green">
          ✓ PIPELINE COMPLETE
        </Text>
      </Box>

      {/* Project Info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>Project: {manifest.project.name}</Text>
        <Text>Mode: {getModeLabel(manifest.project.mode)}</Text>
      </Box>

      {/* Summary */}
      <Box flexDirection="column" borderStyle="single" paddingX={1} marginBottom={1}>
        <Text bold>Summary</Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>Phases: 5/5 complete</Text>
          <Text>Epics: {completedEpics}/{epicCount} complete</Text>
          <Text>E2E Tests: N/A</Text>
          <Text></Text>
          <Text>Total Cost: ${manifest.cost.total.toFixed(2)}</Text>
          <Text>Total Time: {formatDurationSimple(manifest.duration.total)}</Text>
          <Text></Text>
          <Text dimColor>Files Created: N/A</Text>
          <Text dimColor>Git Commits: N/A</Text>
        </Box>
      </Box>

      {/* Buttons */}
      <Box marginBottom={1}>
        <Box borderStyle="single" paddingX={2} marginRight={2}>
          <Text color="cyan">&gt; NEW PROJECT</Text>
        </Box>
        <Box borderStyle="single" paddingX={2}>
          <Text>EXIT</Text>
        </Box>
      </Box>

      {/* Status Bar */}
      <StatusBar
        hints={[
          { key: 'n', label: 'New Project' },
          { key: 'q', label: 'Exit' },
        ]}
      />
    </Box>
  );
};

function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    new: 'New Project',
    feature: 'Add Feature',
    fix: 'Fix Bug',
  };
  return labels[mode] || mode;
}

function formatDurationSimple(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
