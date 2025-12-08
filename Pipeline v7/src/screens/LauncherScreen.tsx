import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { Divider } from '../components/Divider.js';

interface LauncherScreenProps {
  recentProjects: string[];
  onStart: (projectPath: string, type: string, mode: string) => void;
  onQuit: () => void;
}

type Step = 'path' | 'type' | 'mode' | 'confirm';

const typeOptions = [
  { label: 'Terminal/TUI (Ink)', value: 'terminal-tui' },
  { label: 'Desktop (Tauri)', value: 'desktop' },
];

const modeOptions = [
  { label: 'New Project', value: 'new' },
  { label: 'Add Feature', value: 'feature' },
  { label: 'Fix Bug', value: 'fix' },
];

export const LauncherScreen: React.FC<LauncherScreenProps> = ({
  recentProjects,
  onStart,
  onQuit,
}) => {
  const [step, setStep] = useState<Step>('path');
  const [projectPath, setProjectPath] = useState('');
  const [projectType, setProjectType] = useState('terminal-tui');
  const [projectMode, setProjectMode] = useState('new');

  useInput((input, key) => {
    if (input === 'q' && step === 'path') {
      onQuit();
    }
    if (key.escape) {
      if (step === 'type') setStep('path');
      else if (step === 'mode') setStep('type');
      else if (step === 'confirm') setStep('mode');
    }
  });

  const handlePathSubmit = () => {
    if (projectPath.trim()) {
      setStep('type');
    }
  };

  const handleTypeSelect = (item: { value: string }) => {
    setProjectType(item.value);
    setStep('mode');
  };

  const handleModeSelect = (item: { value: string }) => {
    setProjectMode(item.value);
    setStep('confirm');
  };

  const handleConfirm = () => {
    onStart(projectPath, projectType, projectMode);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">PIPELINE v7</Text>
      </Box>

      <Divider />

      {step === 'path' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Project Path</Text>
          <Box marginTop={1}>
            <Text dimColor>{'> '}</Text>
            <TextInput
              value={projectPath}
              onChange={setProjectPath}
              onSubmit={handlePathSubmit}
              placeholder="Enter path or press Tab for recent"
            />
          </Box>

          {recentProjects.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>Recent Projects:</Text>
              {recentProjects.map((path, i) => (
                <Text key={i} dimColor>  {i + 1}. {path}</Text>
              ))}
            </Box>
          )}

          <Box marginTop={2}>
            <Text dimColor>[Enter] Continue  [q] Quit</Text>
          </Box>
        </Box>
      )}

      {step === 'type' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Pipeline Type</Text>
          <Box marginTop={1}>
            <SelectInput items={typeOptions} onSelect={handleTypeSelect} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>[Esc] Back</Text>
          </Box>
        </Box>
      )}

      {step === 'mode' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Pipeline Mode</Text>
          <Box marginTop={1}>
            <SelectInput items={modeOptions} onSelect={handleModeSelect} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>[Esc] Back</Text>
          </Box>
        </Box>
      )}

      {step === 'confirm' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Confirm</Text>
          <Box flexDirection="column" marginTop={1} paddingLeft={2}>
            <Text>Path: <Text color="cyan">{projectPath}</Text></Text>
            <Text>Type: <Text color="yellow">{projectType}</Text></Text>
            <Text>Mode: <Text color="green">{projectMode}</Text></Text>
          </Box>
          <Box marginTop={2}>
            <SelectInput
              items={[
                { label: 'Start Pipeline', value: 'start' },
                { label: 'Go Back', value: 'back' },
              ]}
              onSelect={(item) => {
                if (item.value === 'start') handleConfirm();
                else setStep('mode');
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};
