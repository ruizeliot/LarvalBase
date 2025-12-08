/**
 * DashboardScreen
 * Pipeline v8
 *
 * US-115-128: Dashboard screen
 */
import React from 'react';
import { Box, Text } from 'ink';
import type { Manifest, TodoItem, EpicInfo, PipelineState } from '../types/index.js';
import { Header } from '../components/Header.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { TodoList } from '../components/TodoList.js';
import { EpicList } from '../components/EpicList.js';
import { StatusBar } from '../components/StatusBar.js';
import { useDashboardKeyboard } from '../hooks/useKeyboard.js';

interface DashboardScreenProps {
  manifest: Manifest;
  todos: TodoItem[];
  epics: EpicInfo[];
  state: PipelineState;
  sessionId: string;
  pid: number;
  progress: number;
  cost: number;
  duration: number;
  onPause: () => void;
  onResume: () => void;
  onAdvance: () => void;
  onFocusWorker: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  manifest,
  todos,
  epics,
  state,
  sessionId,
  pid,
  progress,
  cost,
  duration,
  onPause,
  onResume,
  onAdvance,
  onFocusWorker,
}) => {
  useDashboardKeyboard({
    onPause,
    onResume,
    onAdvance,
    onFocusWorker,
  });

  const phaseName = getPhaseDisplayName(manifest.currentPhase);
  const currentEpic = manifest.phases['4']?.currentEpic;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Header
        projectName={manifest.project.name}
        mode={manifest.project.mode}
        workerStatus={state === 'running' ? 'running' : 'stopped'}
      />

      {/* Project Info */}
      <Box marginY={1}>
        <Box flexDirection="column" flexGrow={1}>
          <Text>Project: {manifest.project.name}</Text>
          <Text>Mode: {getModeLabel(manifest.project.mode)}</Text>
          <Text>
            Phase: {manifest.currentPhase} - {phaseName}
            {currentEpic && ` (Epic ${currentEpic}/${epics.length})`}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text>Cost: ${cost.toFixed(2)}</Text>
          <Text>Time: {formatDurationSimple(duration)}</Text>
        </Box>
      </Box>

      {/* Progress Bar */}
      <ProgressBar percent={progress} label="Overall" />

      {/* Paused Indicator */}
      {state === 'paused' && (
        <Box justifyContent="center" marginY={1}>
          <Text bold color="yellow">
            ⏸ PAUSED - Press 'r' to resume
          </Text>
        </Box>
      )}

      {/* Main Content */}
      <Box marginY={1}>
        {/* Epics */}
        <Box flexGrow={1} marginRight={1}>
          <EpicList epics={epics} currentEpic={currentEpic} />
        </Box>

        {/* Todos */}
        <Box flexGrow={2}>
          <TodoList todos={todos} />
        </Box>
      </Box>

      {/* Footer */}
      <Box>
        <Text dimColor>
          Session: {sessionId.slice(0, 8)}  PID: {pid}
        </Text>
      </Box>

      {/* Status Bar */}
      <StatusBar
        hints={
          state === 'paused'
            ? [
                { key: 'r', label: 'Resume' },
                { key: 'q', label: 'Quit' },
                { key: '?', label: 'Help' },
              ]
            : [
                { key: 'p', label: 'Pause' },
                { key: 'a', label: 'Advance' },
                { key: 'w', label: 'Focus Worker' },
                { key: 'q', label: 'Quit' },
                { key: '?', label: 'Help' },
              ]
        }
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
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
