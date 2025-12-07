import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import type { PipelineType, PipelineMode } from '../types/index.js';
import { Header } from '../components/Header.js';

interface LauncherScreenProps {
  onStart: (path: string, type: PipelineType, mode: PipelineMode) => void;
  onResume?: (path: string) => void;
  recentProjects?: string[];
}

export const LauncherScreen: React.FC<LauncherScreenProps> = ({
  onStart,
  onResume,
  recentProjects = [],
}) => {
  // SKELETON: Form works but doesn't actually start pipeline
  const [projectPath, setProjectPath] = useState('');
  const [pipelineType, setPipelineType] = useState<PipelineType>('terminal');
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>('new');
  const [activeField, setActiveField] = useState<'path' | 'type' | 'mode' | 'start'>(
    'path'
  );

  const typeOptions = [
    { label: 'Desktop (Tauri)', value: 'desktop' as const },
    { label: 'Terminal (Ink)', value: 'terminal' as const },
  ];

  const modeOptions = [
    { label: 'New Project', value: 'new' as const },
    { label: 'Add Feature', value: 'feature' as const },
    { label: 'Fix Bug', value: 'fix' as const },
  ];

  useInput((input, key) => {
    if (key.tab && !key.shift) {
      const fields = ['path', 'type', 'mode', 'start'] as const;
      const currentIndex = fields.indexOf(activeField);
      const nextIndex = (currentIndex + 1) % fields.length;
      setActiveField(fields[nextIndex]);
    }
    if (key.tab && key.shift) {
      const fields = ['path', 'type', 'mode', 'start'] as const;
      const currentIndex = fields.indexOf(activeField);
      const prevIndex = (currentIndex - 1 + fields.length) % fields.length;
      setActiveField(fields[prevIndex]);
    }
    if (key.return && activeField === 'start') {
      if (projectPath.trim()) {
        onStart(projectPath.trim(), pipelineType, pipelineMode);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="PIPELINE v7" />

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={activeField === 'path' ? 'cyan' : undefined}
        paddingX={1}
        marginBottom={1}
      >
        <Text dimColor>Project Path:</Text>
        <TextInput
          value={projectPath}
          onChange={setProjectPath}
          placeholder="/path/to/project"
          focus={activeField === 'path'}
        />
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>Pipeline Type:</Text>
        <Box
          borderStyle={activeField === 'type' ? 'round' : undefined}
          borderColor={activeField === 'type' ? 'cyan' : undefined}
        >
          <SelectInput
            items={typeOptions}
            onSelect={(item) => setPipelineType(item.value)}
            isFocused={activeField === 'type'}
          />
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>Mode:</Text>
        <Box
          borderStyle={activeField === 'mode' ? 'round' : undefined}
          borderColor={activeField === 'mode' ? 'cyan' : undefined}
        >
          <SelectInput
            items={modeOptions}
            onSelect={(item) => setPipelineMode(item.value)}
            isFocused={activeField === 'mode'}
          />
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text
          inverse={activeField === 'start'}
          color={activeField === 'start' ? 'cyan' : undefined}
        >
          {' '}
          {'>'} START{' '}
        </Text>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>[Tab] Navigate [Enter] Select [q] Quit [?] Help</Text>
      </Box>
    </Box>
  );
};
