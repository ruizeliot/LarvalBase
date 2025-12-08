/**
 * Store Hooks
 * Pipeline v8
 *
 * React hooks for state management
 */
import { useState, useCallback } from 'react';
import type {
  ScreenName,
  PipelineMode,
  PipelineState,
  TodoItem,
  EpicInfo,
  Manifest,
} from '../types/index.js';

/**
 * US-006: Screen router hook
 */
export function useRouter() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('launcher');

  const navigate = useCallback((screen: ScreenName) => {
    // SKELETON: Basic navigation, no validation
    setCurrentScreen(screen);
  }, []);

  return { currentScreen, navigate };
}

/**
 * US-016: Project config store hook
 */
export function useProjectConfig() {
  const [projectPath, setProjectPath] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [mode, setMode] = useState<PipelineMode>('new');

  return {
    projectPath,
    setProjectPath,
    projectName,
    setProjectName,
    mode,
    setMode,
  };
}

/**
 * US-034: Worker session store hook
 */
export function useWorkerSession() {
  const [sessionId, setSessionId] = useState<string>('');
  const [pid, setPid] = useState<number>(0);
  const [status, setStatus] = useState<'running' | 'stopped'>('stopped');

  return {
    sessionId,
    setSessionId,
    pid,
    setPid,
    status,
    setStatus,
  };
}

/**
 * US-052: Todo store hook
 */
export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const updateTodos = useCallback((newTodos: TodoItem[]) => {
    setTodos(newTodos);
  }, []);

  return { todos, updateTodos };
}

/**
 * US-072: Pipeline state hook
 */
export function usePipelineState() {
  const [state, setState] = useState<PipelineState>('idle');
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [currentEpic, setCurrentEpic] = useState<number>(1);
  const [epics, setEpics] = useState<EpicInfo[]>([]);

  return {
    state,
    setState,
    currentPhase,
    setCurrentPhase,
    currentEpic,
    setCurrentEpic,
    epics,
    setEpics,
  };
}

/**
 * US-064-065: Cost and duration hook
 */
export function useCostDuration() {
  const [cost, setCost] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  return { cost, setCost, duration, setDuration };
}

/**
 * US-053: Progress calculation hook
 */
export function useProgress(todos: TodoItem[]) {
  // SKELETON: Returns 0, not implemented
  return 0;
}
