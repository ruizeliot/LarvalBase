import React from 'react';
import { Box, Text } from 'ink';
import { Modal } from './Modal.js';

interface HelpOverlayProps {
  onClose: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => {
  return (
    <Modal title="KEYBOARD SHORTCUTS" onClose={onClose}>
      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column">
          <Text bold dimColor>
            Navigation
          </Text>
          <Text>Tab        Next field</Text>
          <Text>Shift+Tab  Previous field</Text>
          <Text>↑/↓        Navigate lists</Text>
          <Text>Enter      Select/Confirm</Text>
          <Text>Esc        Back/Cancel</Text>
        </Box>
        <Box flexDirection="column">
          <Text bold dimColor>
            Pipeline Control
          </Text>
          <Text>p          Pause pipeline</Text>
          <Text>r          Resume (when paused)</Text>
          <Text>Ctrl+C     Emergency stop</Text>
        </Box>
      </Box>
      <Box marginTop={1} flexDirection="row" gap={4}>
        <Box flexDirection="column">
          <Text bold dimColor>
            Global
          </Text>
          <Text>q          Quit</Text>
          <Text>?          Show this help</Text>
          <Text>Ctrl+L     Clear screen</Text>
        </Box>
        <Box flexDirection="column">
          <Text bold dimColor>
            View
          </Text>
          <Text>f/F11      Fullscreen worker</Text>
          <Text>←/→        Resize panes</Text>
          <Text>l          Toggle log view</Text>
        </Box>
      </Box>
    </Modal>
  );
};
