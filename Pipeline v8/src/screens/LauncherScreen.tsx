/**
 * LauncherScreen
 * Pipeline v8
 *
 * US-101-107: Launcher screen
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import type { PipelineMode, RecentProject } from '../types/index.js';
import { StatusBar } from '../components/StatusBar.js';

interface LauncherScreenProps {
  initialPath?: string;
  recentProjects?: RecentProject[];
  onStart: (path: string, mode: PipelineMode) => void;
}

export const LauncherScreen: React.FC<LauncherScreenProps> = ({
  initialPath = '',
  recentProjects = [],
  onStart,
}) => {
  const [projectPath, setProjectPath] = useState(initialPath || process.cwd());
  const [mode, setMode] = useState<PipelineMode>('new');
  const [error, setError] = useState<string>('');
  const [focusedField, setFocusedField] = useState<'path' | 'mode' | 'recent'>('path');

  const modeOptions = [
    { label: 'New Project', value: 'new' as PipelineMode },
    { label: 'Add Feature', value: 'feature' as PipelineMode },
    { label: 'Fix Bug', value: 'fix' as PipelineMode },
  ];

  const handleModeSelect = (item: { value: PipelineMode }) => {
    setMode(item.value);
  };

  const handleStart = () => {
    // SKELETON: No validation, just calls onStart
    if (!projectPath) {
      setError('Please enter a project path');
      return;
    }
    onStart(projectPath, mode);
  };

  useInput((input, key) => {
    if (key.tab) {
      setFocusedField((prev) =>
        prev === 'path' ? 'mode' : prev === 'mode' ? 'recent' : 'path'
      );
    }
    if (key.return && focusedField === 'path') {
      handleStart();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          PIPELINE v8
        </Text>
      </Box>

      {/* Path Input */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>Project Path:</Text>
        <Box borderStyle="single" paddingX={1}>
          <TextInput
            value={projectPath}
            onChange={setProjectPath}
            focus={focusedField === 'path'}
            placeholder="/path/to/project"
          />
          <Text dimColor> [...]</Text>
        </Box>
        {error && <Text color="red">{error}</Text>}
      </Box>

      {/* Mode Selection */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>Mode:</Text>
        <SelectInput
          items={modeOptions}
          onSelect={handleModeSelect}
          isFocused={focusedField === 'mode'}
        />
      </Box>

      {/* Start Button */}
      <Box marginBottom={1}>
        <Box borderStyle="single" paddingX={2}>
          <Text color="cyan">&gt; START</Text>
        </Box>
      </Box>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <Box flexDirection="column">
          <Text>Recent:</Text>
          {recentProjects.slice(0, 5).map((project, i) => (
            <Box key={i}>
              <Text dimColor>
                {project.name} (Phase {project.lastPhase}, {project.lastAccess})
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Status Bar */}
      <StatusBar
        hints={[
          { key: 'Tab', label: 'Navigate' },
          { key: 'Enter', label: 'Select' },
          { key: 'q', label: 'Quit' },
          { key: '?', label: 'Help' },
        ]}
      />
    </Box>
  );
};
