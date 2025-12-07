import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Manifest } from '../types/index.js';
import { Header } from '../components/Header.js';
import { ProgressBar } from '../components/ProgressBar.js';

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
  // SKELETON: Shows manifest data but resume not implemented
  const [selectedButton, setSelectedButton] = useState<'resume' | 'cancel'>('resume');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useInput((input, key) => {
    if (showDeleteConfirm) {
      if (input === 'y' || input === 'Y') {
        onDelete();
      } else {
        setShowDeleteConfirm(false);
      }
      return;
    }

    if (key.leftArrow || key.rightArrow) {
      setSelectedButton((prev) => (prev === 'resume' ? 'cancel' : 'resume'));
    }

    if (key.return) {
      if (selectedButton === 'resume') {
        onResume();
      } else {
        onCancel();
      }
    }

    if (input === 'd') {
      setShowDeleteConfirm(true);
    }
  });

  const currentPhase = manifest.currentPhase;
  const progress = ((currentPhase - 1) / 5) * 100;

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="RESUME PIPELINE" />

      <Box flexDirection="column" borderStyle="round" padding={1} marginBottom={1}>
        <Text>
          <Text dimColor>Project:</Text> {manifest.project.name}
        </Text>
        <Text>
          <Text dimColor>Path:</Text> {manifest.project.path}
        </Text>
      </Box>

      <Box flexDirection="column" borderStyle="round" padding={1} marginBottom={1}>
        <Text bold dimColor>
          Last State
        </Text>
        <Text>
          <Text dimColor>Phase:</Text> {currentPhase} -{' '}
          {['Brainstorm', 'Specs', 'Bootstrap', 'Implement', 'Finalize'][
            currentPhase - 1
          ] || 'Unknown'}
        </Text>
        {manifest.currentEpic && (
          <Text>
            <Text dimColor>Epic:</Text> {manifest.currentEpic}
          </Text>
        )}
        <Box marginTop={1}>
          <ProgressBar percent={progress} label="Progress" />
        </Box>
        <Box marginTop={1}>
          <Text>
            <Text dimColor>Cost:</Text>{' '}
            <Text color="yellow">${manifest.cost.total.toFixed(2)}</Text>
          </Text>
        </Box>
        <Text>
          <Text dimColor>Duration:</Text>{' '}
          {Math.floor(manifest.duration.total / 60)}m {manifest.duration.total % 60}s
        </Text>
      </Box>

      {showDeleteConfirm ? (
        <Box>
          <Text color="red">Delete and start fresh? [y/n]</Text>
        </Box>
      ) : (
        <Box gap={2}>
          <Text
            inverse={selectedButton === 'resume'}
            color={selectedButton === 'resume' ? 'green' : undefined}
          >
            {' '}
            {'>'} RESUME{' '}
          </Text>
          <Text
            inverse={selectedButton === 'cancel'}
            color={selectedButton === 'cancel' ? 'red' : undefined}
          >
            {' '}
            x CANCEL{' '}
          </Text>
        </Box>
      )}

      <Box marginTop={2}>
        <Text dimColor>
          [Enter] {selectedButton === 'resume' ? 'Resume' : 'Cancel'} [d] Delete &
          Start Fresh [Esc] Back
        </Text>
      </Box>
    </Box>
  );
};
