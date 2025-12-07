import { useState, useCallback } from 'react';
import type { Project, PipelineType, PipelineMode } from '../types/index.js';

interface Config {
  recentProjects: string[];
  defaultType: PipelineType;
  defaultMode: PipelineMode;
  splitRatio: number;
}

const defaultConfig: Config = {
  recentProjects: [],
  defaultType: 'terminal',
  defaultMode: 'new',
  splitRatio: 50,
};

export function useConfig() {
  // SKELETON: In-memory config, no persistence yet
  const [config, setConfig] = useState<Config>(defaultConfig);

  const addRecentProject = useCallback((path: string) => {
    setConfig((prev) => ({
      ...prev,
      recentProjects: [path, ...prev.recentProjects.filter((p) => p !== path)].slice(0, 5),
    }));
  }, []);

  const setSplitRatio = useCallback((ratio: number) => {
    setConfig((prev) => ({
      ...prev,
      splitRatio: Math.max(20, Math.min(80, ratio)),
    }));
  }, []);

  const setDefaultType = useCallback((type: PipelineType) => {
    setConfig((prev) => ({ ...prev, defaultType: type }));
  }, []);

  const setDefaultMode = useCallback((mode: PipelineMode) => {
    setConfig((prev) => ({ ...prev, defaultMode: mode }));
  }, []);

  return {
    config,
    addRecentProject,
    setSplitRatio,
    setDefaultType,
    setDefaultMode,
  };
}
