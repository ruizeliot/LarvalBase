import React from 'react';
import { Box, Text } from 'ink';
import { Modal } from './Modal.js';

interface HelpOverlayProps {
  onClose: () => void;
}

const shortcuts = [
  { key: 's', description: 'Start worker' },
  { key: 'x', description: 'Stop worker' },
  { key: 'r', description: 'Restart worker' },
  { key: 'f', description: 'Focus worker window' },
  { key: '?', description: 'Show this help' },
  { key: 'q', description: 'Quit application' },
  { key: 'Ctrl+L', description: 'Clear screen' },
  { key: 'Tab', description: 'Next element' },
  { key: 'Esc', description: 'Close modal / Go back' },
];

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => {
  return (
    <Modal title="Keyboard Shortcuts" onClose={onClose} width={45}>
      <Box flexDirection="column" gap={0}>
        {shortcuts.map(({ key, description }) => (
          <Box key={key} gap={2}>
            <Box width={10}>
              <Text color="yellow">[{key}]</Text>
            </Box>
            <Text>{description}</Text>
          </Box>
        ))}
      </Box>
    </Modal>
  );
};
