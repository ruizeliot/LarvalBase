import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header } from '../components/Header.js';
import { Divider } from '../components/Divider.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { TodoList } from '../components/TodoList.js';
import { EpicList } from '../components/EpicList.js';
import { StatusLine } from '../components/StatusLine.js';
import { HelpOverlay } from '../components/HelpOverlay.js';
import { Modal } from '../components/Modal.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import type { Manifest, Todo, WorkerSession } from '../types/index.js';

interface SplitViewScreenProps {
  manifest: Manifest;
  todos: Todo[];
  worker: WorkerSession | null;
  elapsedSeconds: number;
  cost: number;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onFocus: () => void;
  onQuit: () => void;
}

const phaseNames: Record<string, string> = {
  '1': 'Brainstorm',
  '2': 'Specs',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize',
};

export const SplitViewScreen: React.FC<SplitViewScreenProps> = ({
  manifest,
  todos,
  worker,
  elapsedSeconds,
  cost,
  onStart,
  onStop,
  onRestart,
  onFocus,
  onQuit,
}) => {
  const { exit } = useApp();
  const [showHelp, setShowHelp] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Calculate progress
  const completedTodos = todos.filter((t) => t.status === 'completed').length;
  const progress = todos.length > 0 ? Math.round((completedTodos / todos.length) * 100) : 0;

  // Format duration
  const formatDuration = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  // Format cost
  const formatCost = (amount: number) => `$${amount.toFixed(2)}`;

  // Current phase info
  const currentPhase = parseInt(manifest.currentPhase, 10);
  const phaseName = phaseNames[manifest.currentPhase] ?? 'Unknown';
  const phaseStatus = manifest.phases[manifest.currentPhase]?.status ?? 'pending';

  // Current epic
  const currentEpic = manifest.epics.find((e) => e.status === 'in_progress');

  useKeyboard({
    onStart: () => {
      if (worker?.status !== 'running') {
        onStart();
      }
    },
    onStop: () => {
      if (worker?.status === 'running') {
        onStop();
      }
    },
    onRestart,
    onFocus,
    onHelp: () => setShowHelp(true),
    onQuit: () => setShowQuitConfirm(true),
    isActive: !showHelp && !showQuitConfirm,
  });

  const handleQuitConfirm = (confirm: boolean) => {
    setShowQuitConfirm(false);
    if (confirm) {
      onQuit();
      exit();
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Header
        projectName={manifest.project.name}
        phase={currentPhase}
        phaseName={phaseName}
        status={phaseStatus}
      />

      <Divider />

      {/* Progress */}
      <Box paddingX={1} marginY={1}>
        <Text>Progress: </Text>
        <ProgressBar value={progress} width={30} />
      </Box>

      <Divider />

      {/* Main content area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left panel - Todos */}
        <Box flexDirection="column" width="50%" paddingRight={1}>
          <TodoList todos={todos} maxItems={15} />
        </Box>

        {/* Right panel - Epics */}
        <Box flexDirection="column" width="50%" paddingLeft={1}>
          <EpicList
            epics={manifest.epics}
            currentEpic={currentEpic?.id}
          />
        </Box>
      </Box>

      <Divider />

      {/* Status line */}
      <StatusLine
        cost={formatCost(cost)}
        duration={formatDuration(elapsedSeconds)}
        workerStatus={worker?.status ?? 'idle'}
      />

      {/* Help overlay */}
      {showHelp && (
        <Box position="absolute" marginLeft={10} marginTop={5}>
          <HelpOverlay onClose={() => setShowHelp(false)} />
        </Box>
      )}

      {/* Quit confirmation */}
      {showQuitConfirm && (
        <Box position="absolute" marginLeft={15} marginTop={8}>
          <Modal title="Quit?" onClose={() => setShowQuitConfirm(false)} width={40}>
            <Box flexDirection="column">
              <Text>Are you sure you want to quit?</Text>
              {worker?.status === 'running' && (
                <Text color="yellow">Worker is still running!</Text>
              )}
              <Box marginTop={1} gap={2}>
                <Text
                  color="green"
                  inverse
                  onPress={() => handleQuitConfirm(true)}
                >
                  {' [y] Yes '}
                </Text>
                <Text
                  color="red"
                  inverse
                  onPress={() => handleQuitConfirm(false)}
                >
                  {' [n] No '}
                </Text>
              </Box>
            </Box>
          </Modal>
        </Box>
      )}
    </Box>
  );
};
