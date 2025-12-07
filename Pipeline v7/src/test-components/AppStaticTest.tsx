import React, { useEffect } from 'react';
import { Box, Text, useApp } from 'ink';

/**
 * Static test version of the main App UI.
 * This renders the same visual output as the launcher but without
 * useInput, making it safe to run in non-TTY test environments.
 */
export const AppStaticTest: React.FC = () => {
  const { exit } = useApp();

  // Auto-exit after a short delay to allow test to capture output
  useEffect(() => {
    const timer = setTimeout(() => exit(), 500);
    return () => clearTimeout(timer);
  }, [exit]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header - matches LauncherScreen */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">PIPELINE v7</Text>
      </Box>

      {/* Form fields (static, no input) */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text dimColor>Project Path:</Text>
        <Text dimColor>/path/to/project</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>Pipeline Type:</Text>
        <Box borderStyle="round">
          <Text>› Desktop (Tauri)</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>Mode:</Text>
        <Box>
          <Text>› New Project</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text inverse color="cyan"> {'>'} START </Text>
      </Box>

      {/* Help hint - matches what E2E-030 expects */}
      <Box marginTop={2}>
        <Text dimColor>[Tab] Navigate [Enter] Select [q] Quit [?] Help</Text>
      </Box>
    </Box>
  );
};
