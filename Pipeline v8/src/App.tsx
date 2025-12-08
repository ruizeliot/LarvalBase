/**
 * App Component
 * Pipeline v8
 *
 * Root application component with screen routing
 */
import React, { useState, useCallback } from 'react';
import { Box, useApp } from 'ink';
import type { PipelineMode, ScreenName, Manifest, TodoItem, EpicInfo, PipelineState } from './types/index.js';
import { useGlobalKeyboard } from './hooks/useKeyboard.js';
import { LauncherScreen } from './screens/LauncherScreen.js';
import { ResumeScreen } from './screens/ResumeScreen.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { CompleteScreen } from './screens/CompleteScreen.js';
import { QuitDialog } from './components/Dialog.js';
import { HelpOverlay } from './components/HelpOverlay.js';

interface AppProps {
  initialPath?: string;
}

export const App: React.FC<AppProps> = ({ initialPath }) => {
  const { exit } = useApp();

  // Screen router
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('launcher');

  // Global keyboard state
  const { showQuitDialog, setShowQuitDialog, showHelp, setShowHelp } =
    useGlobalKeyboard();

  // Manifest state (skeleton - empty defaults)
  const [manifest, setManifest] = useState<Manifest>({
    version: '8.0.0',
    project: { name: '', path: '', mode: 'new' },
    currentPhase: 1,
    phases: {},
    cost: { total: 0, byPhase: {} },
    duration: { total: 0, byPhase: {} },
  });

  // Pipeline state
  const [state, setState] = useState<PipelineState>('idle');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [epics, setEpics] = useState<EpicInfo[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [pid, setPid] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Navigation
  const navigate = useCallback((screen: ScreenName) => {
    setCurrentScreen(screen);
  }, []);

  // Launcher handlers
  const handleStart = useCallback(
    (path: string, mode: PipelineMode) => {
      // SKELETON: Just navigate to dashboard, no actual spawning
      setManifest((prev) => ({
        ...prev,
        project: { name: path.split(/[/\\]/).pop() || 'project', path, mode },
      }));
      navigate('dashboard');
    },
    [navigate]
  );

  // Resume handlers
  const handleResume = useCallback(() => {
    // SKELETON: Just navigate to dashboard
    navigate('dashboard');
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate('launcher');
  }, [navigate]);

  const handleDelete = useCallback(() => {
    // SKELETON: Just navigate back
    navigate('launcher');
  }, [navigate]);

  // Dashboard handlers
  const handlePause = useCallback(() => {
    setState('paused');
  }, []);

  const handleResumePipeline = useCallback(() => {
    setState('running');
  }, []);

  const handleAdvance = useCallback(() => {
    // SKELETON: Not implemented
  }, []);

  const handleFocusWorker = useCallback(() => {
    // SKELETON: Not implemented
  }, []);

  // Complete handlers
  const handleNewProject = useCallback(() => {
    navigate('launcher');
  }, [navigate]);

  const handleExit = useCallback(() => {
    exit();
  }, [exit]);

  // Quit dialog handlers
  const handleQuitConfirm = useCallback(() => {
    exit();
  }, [exit]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitDialog(false);
  }, [setShowQuitDialog]);

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'launcher':
        return (
          <LauncherScreen
            initialPath={initialPath}
            onStart={handleStart}
          />
        );
      case 'resume':
        return (
          <ResumeScreen
            manifest={manifest}
            onResume={handleResume}
            onCancel={handleCancel}
            onDelete={handleDelete}
          />
        );
      case 'dashboard':
        return (
          <DashboardScreen
            manifest={manifest}
            todos={todos}
            epics={epics}
            state={state}
            sessionId={sessionId}
            pid={pid}
            progress={progress}
            cost={cost}
            duration={duration}
            onPause={handlePause}
            onResume={handleResumePipeline}
            onAdvance={handleAdvance}
            onFocusWorker={handleFocusWorker}
          />
        );
      case 'complete':
        return (
          <CompleteScreen
            manifest={manifest}
            onNewProject={handleNewProject}
            onExit={handleExit}
          />
        );
      default:
        return <LauncherScreen onStart={handleStart} />;
    }
  };

  return (
    <Box flexDirection="column">
      {renderScreen()}

      {/* Quit Dialog Overlay */}
      {showQuitDialog && (
        <Box position="absolute" marginTop={5} marginLeft={10}>
          <QuitDialog onConfirm={handleQuitConfirm} onCancel={handleQuitCancel} />
        </Box>
      )}

      {/* Help Overlay */}
      {showHelp && (
        <Box position="absolute" marginTop={3} marginLeft={5}>
          <HelpOverlay
            context={currentScreen === 'dashboard' ? 'dashboard' : currentScreen === 'complete' ? 'complete' : 'launcher'}
            onClose={() => setShowHelp(false)}
          />
        </Box>
      )}
    </Box>
  );
};
