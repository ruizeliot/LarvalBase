import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { LauncherScreen } from './screens/LauncherScreen.js';
import { ResumeScreen } from './screens/ResumeScreen.js';
import { SplitViewScreen } from './screens/SplitViewScreen.js';
import { CompleteScreen } from './screens/CompleteScreen.js';
import { useConfig } from './hooks/useConfig.js';
import { Orchestrator } from './services/orchestrator.js';
import { FilesystemService } from './services/filesystem.js';
import type { Manifest, Todo, WorkerSession, ScreenName } from './types/index.js';

interface AppProps {
  projectPath?: string;
  testComponent?: string;
  testHook?: string;
  testFocus?: string;
}

export const App: React.FC<AppProps> = ({ projectPath: initialPath, testComponent, testHook, testFocus }) => {
  const { exit } = useApp();
  const { config, addRecentProject } = useConfig();

  const [screen, setScreen] = useState<ScreenName>(initialPath ? 'dashboard' : 'launcher');
  const [projectPath, setProjectPath] = useState<string>(initialPath ?? '');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [worker, setWorker] = useState<WorkerSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cost, setCost] = useState(0);
  const [orchestrator, setOrchestrator] = useState<Orchestrator | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle test modes for component testing
  if (testComponent || testHook || testFocus) {
    return <TestMode component={testComponent} hook={testHook} focus={testFocus} />;
  }

  // Initialize orchestrator when project path is set
  useEffect(() => {
    if (!projectPath) return;

    const init = async () => {
      try {
        const fs = new FilesystemService();
        const existingManifest = await fs.readManifest(projectPath);

        if (existingManifest) {
          setManifest(existingManifest);
          setScreen('resume');
        } else {
          // No existing manifest, proceed to launcher to set up
          setScreen('launcher');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      }
    };

    init();
  }, [projectPath]);

  // Initialize orchestrator when starting dashboard
  const initOrchestrator = useCallback(async (path: string) => {
    try {
      const orch = new Orchestrator(path);
      await orch.initialize();

      orch.on('manifest:updated', (m: Manifest) => setManifest(m));
      orch.on('TODO_UPDATE', (t: Todo[]) => setTodos(t));
      orch.on('duration:update', (s: number) => setElapsedSeconds(s));
      orch.on('worker:started', (w: WorkerSession) => setWorker(w));
      orch.on('worker:stopped', () => setWorker(null));
      orch.on('PHASE_COMPLETE', async () => {
        const newCost = await orch.recalculateCost();
        setCost(newCost);
      });

      setOrchestrator(orch);
      setManifest(orch.getManifest());
      setScreen('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
    }
  }, []);

  // Handle launcher start
  const handleLauncherStart = useCallback(async (path: string, type: string, mode: string) => {
    setProjectPath(path);
    addRecentProject(path);

    // Check if project exists
    const fs = new FilesystemService();
    const existingManifest = await fs.readManifest(path);

    if (existingManifest) {
      setManifest(existingManifest);
      setScreen('resume');
    } else {
      // Create new manifest
      const manifestService = await import('./services/manifest.js');
      const service = new manifestService.ManifestService();
      const newManifest = service.createDefaultManifest(
        path.split(/[/\\]/).pop() ?? 'project',
        path
      );
      await fs.writeManifest(path, newManifest);
      setManifest(newManifest);
      await initOrchestrator(path);
    }
  }, [addRecentProject, initOrchestrator]);

  // Handle resume
  const handleResume = useCallback(async () => {
    await initOrchestrator(projectPath);
  }, [projectPath, initOrchestrator]);

  // Handle start new from resume
  const handleStartNew = useCallback(() => {
    setManifest(null);
    setProjectPath('');
    setScreen('launcher');
  }, []);

  // Dashboard actions
  const handleStart = useCallback(async () => {
    if (orchestrator) {
      await orchestrator.startWorker();
      setWorker(orchestrator.getWorker());
    }
  }, [orchestrator]);

  const handleStop = useCallback(async () => {
    if (orchestrator) {
      await orchestrator.stopWorker();
      setWorker(null);
    }
  }, [orchestrator]);

  const handleRestart = useCallback(async () => {
    if (orchestrator) {
      await orchestrator.restartWorker();
      setWorker(orchestrator.getWorker());
    }
  }, [orchestrator]);

  const handleFocus = useCallback(async () => {
    if (orchestrator) {
      await orchestrator.focusWorker();
    }
  }, [orchestrator]);

  const handleQuit = useCallback(() => {
    orchestrator?.cleanup();
    exit();
  }, [orchestrator, exit]);

  // Check for completion
  useEffect(() => {
    if (manifest && manifest.phases['5']?.status === 'complete') {
      setScreen('complete');
    }
  }, [manifest]);

  // Render error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error</Text>
        <Text color="red">{error}</Text>
        <Text dimColor>Press any key to exit</Text>
      </Box>
    );
  }

  // Render screens
  switch (screen) {
    case 'launcher':
      return (
        <LauncherScreen
          recentProjects={config.recentProjects}
          onStart={handleLauncherStart}
          onQuit={handleQuit}
        />
      );

    case 'resume':
      return manifest ? (
        <ResumeScreen
          manifest={manifest}
          onResume={handleResume}
          onNew={handleStartNew}
          onQuit={handleQuit}
        />
      ) : null;

    case 'dashboard':
      return manifest ? (
        <SplitViewScreen
          manifest={manifest}
          todos={todos}
          worker={worker}
          elapsedSeconds={elapsedSeconds}
          cost={cost}
          onStart={handleStart}
          onStop={handleStop}
          onRestart={handleRestart}
          onFocus={handleFocus}
          onQuit={handleQuit}
        />
      ) : null;

    case 'complete':
      return manifest ? (
        <CompleteScreen
          manifest={manifest}
          onNew={handleStartNew}
          onQuit={handleQuit}
        />
      ) : null;

    default:
      return <Text>Unknown screen: {screen}</Text>;
  }
};

// Test mode component for E2E testing individual components/hooks
const TestMode: React.FC<{ component?: string; hook?: string; focus?: string }> = ({
  component,
  hook,
  focus,
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text>Test Mode</Text>
      {component && <Text>Component: {component}</Text>}
      {hook && <Text>Hook: {hook}</Text>}
      {focus && <Text>Focus: {focus}</Text>}
    </Box>
  );
};
