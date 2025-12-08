/**
 * Dialog Component
 * Pipeline v8
 *
 * US-008: Quit confirmation dialog
 * US-138: Error dialog
 */
import React from 'react';
import { Box, Text } from 'ink';

interface DialogProps {
  title: string;
  message: string;
  buttons?: { label: string; action: () => void }[];
  onClose?: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
  title,
  message,
  buttons = [],
  onClose,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      width={50}
    >
      <Text bold color="yellow">
        {title}
      </Text>
      <Box marginY={1}>
        <Text>{message}</Text>
      </Box>
      <Box justifyContent="center">
        {buttons.map((button, i) => (
          <Box key={i} marginX={1}>
            <Text color="cyan">[{button.label}]</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[Enter] Confirm  [Esc] Cancel</Text>
      </Box>
    </Box>
  );
};

/**
 * US-008: Quit confirmation dialog
 */
export const QuitDialog: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  return (
    <Dialog
      title="Quit Pipeline?"
      message="Are you sure you want to quit? Any unsaved progress will be lost."
      buttons={[
        { label: 'Yes, Quit', action: onConfirm },
        { label: 'Cancel', action: onCancel },
      ]}
      onClose={onCancel}
    />
  );
};

/**
 * US-138: Error dialog
 */
export const ErrorDialog: React.FC<{
  error: string;
  onRetry?: () => void;
  onSkip?: () => void;
  onAbort?: () => void;
}> = ({ error, onRetry, onSkip, onAbort }) => {
  const buttons = [];
  if (onRetry) buttons.push({ label: 'Retry', action: onRetry });
  if (onSkip) buttons.push({ label: 'Skip', action: onSkip });
  if (onAbort) buttons.push({ label: 'Abort', action: onAbort });

  return (
    <Dialog title="Error" message={error} buttons={buttons} />
  );
};
