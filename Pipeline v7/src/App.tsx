import React, { useState, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { Screen, Manifest, Todo, PipelineType, PipelineMode } from './types/index.js';
import { LauncherScreen } from './screens/LauncherScreen.js';
import { ResumeScreen } from './screens/ResumeScreen.js';
import { SplitViewScreen } from './screens/SplitViewScreen.js';
import { CompleteScreen } from './screens/CompleteScreen.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { ManifestService } from './services/manifest.js';

interface AppProps {
  initialPath?: string;
  resume?: boolean;
}

export const App: React.FC<AppProps> = ({ initialPath, resume }) => {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>(
    resume && initialPath ? 'resume' : 'launcher'
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // SKELETON: State management in place but not connected to real data
  const [manifest, setManifest] = useState<Manifest | null>(() => {
    if (initialPath) {
      const service = new ManifestService(initialPath);
      return service.read();
    }
    return null;
  });
  const [todos, setTodos] = useState<Todo[]>([]);
  const [workerOutput, setWorkerOutput] = useState<string[]>([]);
  const [projectPath, setProjectPath] = useState<string>(initialPath || '');

  useInput((input, key) => {
    // Global shortcuts (always active)
    if (input === '?' && !showQuitConfirm) {
      setShowHelp((prev) => !prev);
      return;
    }

    if (key.escape) {
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      if (showQuitConfirm) {
        setShowQuitConfirm(false);
        return;
      }
      if (isFullscreen) {
        setIsFullscreen(false);
        return;
      }
    }

    if (input === 'q' && screen === 'launcher' && !showQuitConfirm) {
      setShowQuitConfirm(true);
      return;
    }

    if (showQuitConfirm) {
      if (input === 'y' || input === 'Y') {
        exit();
        return;
      }
      if (input === 'n' || input === 'N') {
        setShowQuitConfirm(false);
        return;
      }
    }
  });

  const handleStart = useCallback(
    (path: string, type: PipelineType, mode: PipelineMode) => {
      // SKELETON: Would start pipeline here
      setProjectPath(path);
      const newManifest = ManifestService.createDefault(path, path.split('/').pop() || 'project');
      newManifest.project.type = type;
      newManifest.project.mode = mode;
      setManifest(newManifest);
      setScreen('splitview');
    },
    []
  );

  const handleResume = useCallback(() => {
    // SKELETON: Would resume pipeline here
    setScreen('splitview');
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleComplete = useCallback(() => {
    setScreen('complete');
  }, []);

  const handleNewProject = useCallback(() => {
    setManifest(null);
    setTodos([]);
    setWorkerOutput([]);
    setProjectPath('');
    setScreen('launcher');
  }, []);

  // Show help overlay if active
  if (showHelp) {
    return <HelpOverlay onClose={() => setShowHelp(false)} />;
  }

  // Show quit confirmation if active
  if (showQuitConfirm) {
    return (
      <Box padding={1}>
        <Text color="yellow">Quit Pipeline? [y/n]</Text>
      </Box>
    );
  }

  // Render current screen
  switch (screen) {
    case 'launcher':
      return <LauncherScreen onStart={handleStart} />;

    case 'resume':
      if (!manifest) {
        setScreen('launcher');
        return null;
      }
      return (
        <ResumeScreen
          manifest={manifest}
          onResume={handleResume}
          onCancel={() => setScreen('launcher')}
          onDelete={handleNewProject}
        />
      );

    case 'splitview':
      if (!manifest) {
        setScreen('launcher');
        return null;
      }
      return (
        <SplitViewScreen
          manifest={manifest}
          todos={todos}
          workerOutput={workerOutput}
          onPause={handlePause}
          onFullscreen={() => setIsFullscreen(true)}
          isPaused={isPaused}
        />
      );

    case 'complete':
      if (!manifest) {
        setScreen('launcher');
        return null;
      }
      return (
        <CompleteScreen
          manifest={manifest}
          onNewProject={handleNewProject}
          onExit={() => exit()}
        />
      );

    default:
      return <LauncherScreen onStart={handleStart} />;
  }
};
