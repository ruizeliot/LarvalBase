import Conf from 'conf';
import type { PipelineType, PipelineMode } from '../types/index.js';

// SKELETON: Service structure in place but persistence is basic

interface AppConfig {
  recentProjects: string[];
  defaultType: PipelineType;
  defaultMode: PipelineMode;
  splitRatio: number;
  theme: 'default' | 'minimal';
}

const defaultConfig: AppConfig = {
  recentProjects: [],
  defaultType: 'terminal',
  defaultMode: 'new',
  splitRatio: 50,
  theme: 'default',
};

export class ConfigService {
  private store: Conf<AppConfig>;

  constructor() {
    this.store = new Conf<AppConfig>({
      projectName: 'pipeline-v7',
      defaults: defaultConfig,
    });
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value);
  }

  addRecentProject(path: string): void {
    const recent = this.get('recentProjects');
    const updated = [path, ...recent.filter((p) => p !== path)].slice(0, 10);
    this.set('recentProjects', updated);
  }

  getRecentProjects(): string[] {
    return this.get('recentProjects');
  }

  getSplitRatio(): number {
    return this.get('splitRatio');
  }

  setSplitRatio(ratio: number): void {
    this.set('splitRatio', Math.max(20, Math.min(80, ratio)));
  }

  reset(): void {
    this.store.clear();
  }
}
