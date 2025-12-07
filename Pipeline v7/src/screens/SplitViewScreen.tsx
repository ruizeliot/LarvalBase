import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Manifest, Todo } from '../types/index.js';
import { Header } from '../components/Header.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { TodoList } from '../components/TodoList.js';
import { EpicList } from '../components/EpicList.js';
import { StatusLine } from '../components/StatusLine.js';

interface SplitViewScreenProps {
  manifest: Manifest;
  todos: Todo[];
  workerOutput: string[];
  onPause: () => void;
  onFullscreen: () => void;
  isPaused: boolean;
}

export const SplitViewScreen: React.FC<SplitViewScreenProps> = ({
  manifest,
  todos,
  workerOutput,
  onPause,
  onFullscreen,
  isPaused,
}) => {
  // SKELETON: Split view renders but worker output is static
  const [splitRatio, setSplitRatio] = useState(50);
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  useInput((input, key) => {
    if (key.leftArrow) {
      setSplitRatio((prev) => Math.max(20, prev - 5));
    }
    if (key.rightArrow) {
      setSplitRatio((prev) => Math.min(80, prev + 5));
    }
    if (input === 'f' || input === 'F') {
      onFullscreen();
    }
    if (input === 'p') {
      onPause();
    }
  });

  const leftWidth = Math.floor((terminalWidth * splitRatio) / 100);
  const rightWidth = terminalWidth - leftWidth - 3; // Account for divider

  const completedTodos = todos.filter((t) => t.status === 'completed').length;
  const totalTodos = todos.length;
  const progress = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  const currentPhase = manifest.currentPhase;
  const epics = manifest.phases[4]?.epics || [];

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderBottom={false}>
        <Box width={leftWidth}>
          <Text bold color="cyan">
            {' '}
            ORCHESTRATOR{' '}
          </Text>
        </Box>
        <Text>│</Text>
        <Box width={rightWidth}>
          <Text bold color="cyan">
            {' '}
            WORKER{' '}
          </Text>
        </Box>
      </Box>

      {/* Main content */}
      <Box flexGrow={1} borderStyle="single" borderTop={false} borderBottom={false}>
        {/* Left pane - Orchestrator */}
        <Box width={leftWidth} flexDirection="column" paddingX={1}>
          <Text>
            <Text dimColor>Project:</Text> {manifest.project.name}
          </Text>
          <Text>
            <Text dimColor>Phase:</Text> {currentPhase} -{' '}
            {['Brainstorm', 'Specs', 'Bootstrap', 'Implement', 'Finalize'][
              currentPhase - 1
            ] || 'Unknown'}
          </Text>
          {manifest.currentEpic && (
            <Text>
              <Text dimColor>Epic:</Text> {manifest.currentEpic}/{epics.length}
            </Text>
          )}

          <Box marginY={1}>
            <ProgressBar percent={progress} width={leftWidth - 8} />
          </Box>

          <TodoList todos={todos} maxVisible={5} />

          {currentPhase === 4 && epics.length > 0 && (
            <Box marginTop={1}>
              <EpicList epics={epics} currentEpic={manifest.currentEpic} />
            </Box>
          )}

          <Box marginTop={1}>
            <StatusLine
              cost={manifest.cost.total}
              duration={manifest.duration.total}
            />
          </Box>
        </Box>

        {/* Divider */}
        <Box flexDirection="column">
          <Text>│</Text>
        </Box>

        {/* Right pane - Worker */}
        <Box width={rightWidth} flexDirection="column" paddingX={1} overflowY="hidden">
          {workerOutput.length === 0 ? (
            <Text dimColor>Waiting for worker output...</Text>
          ) : (
            workerOutput.slice(-10).map((line, i) => (
              <Text key={i} wrap="truncate">
                {line}
              </Text>
            ))
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <Box borderStyle="single" borderTop={false} paddingX={1}>
        {isPaused ? (
          <Text color="yellow"> PAUSED - Press [r] to resume </Text>
        ) : (
          <Text dimColor>
            [p] Pause [f] Fullscreen [←→] Resize [q] Quit [?] Help
          </Text>
        )}
      </Box>
    </Box>
  );
};
