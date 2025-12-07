import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { Screen, Manifest, Todo, PipelineType, PipelineMode } from './types/index.js';
import { LauncherScreen } from './screens/LauncherScreen.js';
import { ResumeScreen } from './screens/ResumeScreen.js';
import { SplitViewScreen } from './screens/SplitViewScreen.js';
import { CompleteScreen } from './screens/CompleteScreen.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { ManifestService } from './services/manifest.js';
import { Orchestrator } from './services/orchestrator.js';

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

  // State management connected to real Orchestrator
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
  const orchestratorRef = useRef<Orchestrator | null>(null);

  // Setup orchestrator event handlers
  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    const handleTodoUpdate = (newTodos: Todo[]) => {
      setTodos(newTodos);
    };

    const handleStateChange = (state: string) => {
      if (state === 'complete') {
        setScreen('complete');
      } else if (state === 'paused') {
        setIsPaused(true);
      } else if (state === 'running') {
        setIsPaused(false);
      }
    };

    const handleWorkerSpawn = () => {
      // Worker spawned - output will come through orchestrator events
    };

    orchestrator.on('todo:update', handleTodoUpdate);
    orchestrator.on('state:change', handleStateChange);
    orchestrator.on('worker:spawn', handleWorkerSpawn);

    // Listen for worker output
    const handleProgress = (progress: { message?: string }) => {
      if (progress.message) {
        setWorkerOutput((prev) => [...prev.slice(-99), progress.message!]);
      }
    };
    orchestrator.on('progress', handleProgress);

    return () => {
      orchestrator.off('todo:update', handleTodoUpdate);
      orchestrator.off('state:change', handleStateChange);
      orchestrator.off('worker:spawn', handleWorkerSpawn);
      orchestrator.off('progress', handleProgress);
    };
  }, [orchestratorRef.current]);

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

    // Quit shortcut - works on all screens (not just launcher)
    if (input === 'q' && !showQuitConfirm && !showHelp) {
      setShowQuitConfirm(true);
      return;
    }

    // Resume shortcut - works when paused
    if ((input === 'r' || input === 'R') && isPaused) {
      setIsPaused(false);
      if (orchestratorRef.current) {
        orchestratorRef.current.resumeFromPause();
      }
      return;
    }

    if (showQuitConfirm) {
      if (input === 'y' || input === 'Y') {
        // Cleanup orchestrator before exit
        if (orchestratorRef.current) {
          orchestratorRef.current.cleanup();
        }
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
    async (path: string, type: PipelineType, mode: PipelineMode) => {
      setProjectPath(path);

      // Create orchestrator instance
      const orchestrator = new Orchestrator({
        projectPath: path,
        pipelineType: type === 'desktop' ? 'desktop' : 'terminal',
        pipelineMode: mode,
      });
      orchestratorRef.current = orchestrator;

      // Initialize and get manifest
      const projectName = path.split(/[/\\]/).pop() || 'project';
      const newManifest = await orchestrator.initialize(projectName);
      setManifest(newManifest);
      setScreen('splitview');

      // Start the pipeline
      try {
        await orchestrator.start();
      } catch (err) {
        // Handle error - orchestrator will emit error events
        console.error('Pipeline start error:', err);
      }
    },
    []
  );

  const handleResume = useCallback(async () => {
    if (!projectPath || !manifest) return;

    // Create orchestrator for existing project
    const orchestrator = new Orchestrator({
      projectPath,
      pipelineType: manifest.project.type === 'desktop' ? 'desktop' : 'terminal',
      pipelineMode: manifest.project.mode || 'new',
    });
    orchestratorRef.current = orchestrator;

    setScreen('splitview');

    // Resume the pipeline from saved state
    try {
      await orchestrator.resume();
    } catch (err) {
      console.error('Pipeline resume error:', err);
    }
  }, [projectPath, manifest]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    if (orchestratorRef.current) {
      orchestratorRef.current.pause();
    }
  }, []);

  const handleComplete = useCallback(() => {
    setScreen('complete');
  }, []);

  const handleNewProject = useCallback(() => {
    // Cleanup existing orchestrator
    if (orchestratorRef.current) {
      orchestratorRef.current.cleanup();
      orchestratorRef.current = null;
    }
    setManifest(null);
    setTodos([]);
    setWorkerOutput([]);
    setProjectPath('');
    setIsPaused(false);
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
