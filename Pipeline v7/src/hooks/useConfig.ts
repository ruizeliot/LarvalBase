import { useState, useEffect } from 'react';
import Conf from 'conf';

interface AppConfig {
  recentProjects: string[];
  defaultType: 'terminal-tui' | 'desktop';
  defaultMode: 'new' | 'feature' | 'fix';
  confirmQuit: boolean;
}

const defaultConfig: AppConfig = {
  recentProjects: [],
  defaultType: 'terminal-tui',
  defaultMode: 'new',
  confirmQuit: true,
};

const config = new Conf<AppConfig>({
  projectName: 'pipeline-v7',
  defaults: defaultConfig,
});

export function useConfig() {
  const [appConfig, setAppConfig] = useState<AppConfig>(() => ({
    recentProjects: config.get('recentProjects') ?? [],
    defaultType: config.get('defaultType') ?? 'terminal-tui',
    defaultMode: config.get('defaultMode') ?? 'new',
    confirmQuit: config.get('confirmQuit') ?? true,
  }));

  const updateConfig = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    config.set(key, value);
    setAppConfig((prev) => ({ ...prev, [key]: value }));
  };

  const addRecentProject = (projectPath: string) => {
    const recent = appConfig.recentProjects.filter((p) => p !== projectPath);
    const updated = [projectPath, ...recent].slice(0, 5);
    updateConfig('recentProjects', updated);
  };

  return {
    config: appConfig,
    updateConfig,
    addRecentProject,
  };
}
