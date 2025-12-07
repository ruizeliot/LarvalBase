import React from 'react';
import { Box, Text, useInput } from 'ink';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => {
  // SKELETON: Modal renders but focus trap not implemented
  useInput((input, key) => {
    if (key.escape && onClose) {
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {title}
        </Text>
      </Box>
      <Box flexDirection="column">{children}</Box>
      <Box marginTop={1}>
        <Text dimColor>[Esc] Close</Text>
      </Box>
    </Box>
  );
};
