import React from 'react';
import { Box, Text, useInput } from 'ink';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  children,
  onClose,
  width = 50,
}) => {
  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  const contentWidth = width - 4;
  const horizontalLine = '─'.repeat(contentWidth);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
    >
      <Box justifyContent="center">
        <Text bold color="cyan">{title}</Text>
      </Box>
      <Text dimColor>{horizontalLine}</Text>
      <Box flexDirection="column" paddingY={1}>
        {children}
      </Box>
      <Text dimColor>{horizontalLine}</Text>
      <Box justifyContent="center">
        <Text dimColor>[Esc] Close</Text>
      </Box>
    </Box>
  );
};
