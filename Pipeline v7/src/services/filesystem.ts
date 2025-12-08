import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Manifest, Todo } from '../types/index.js';

export class FilesystemService {
  private watchers: Map<string, fs.FSWatcher> = new Map();

  async readManifest(projectPath: string): Promise<Manifest | null> {
    const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
    try {
      const content = await fs.promises.readFile(manifestPath, 'utf-8');
      return JSON.parse(content) as Manifest;
    } catch {
      return null;
    }
  }

  async writeManifest(projectPath: string, manifest: Manifest): Promise<void> {
    const pipelineDir = path.join(projectPath, '.pipeline');
    const manifestPath = path.join(pipelineDir, 'manifest.json');
    const tempPath = path.join(pipelineDir, 'manifest.json.tmp');

    // Ensure directory exists
    await fs.promises.mkdir(pipelineDir, { recursive: true });

    // Update timestamp
    manifest.updatedAt = new Date().toISOString();

    // Atomic write: write to temp file, then rename
    await fs.promises.writeFile(tempPath, JSON.stringify(manifest, null, 2));
    await fs.promises.rename(tempPath, manifestPath);
  }

  watchManifest(projectPath: string, callback: (manifest: Manifest) => void): () => void {
    const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
    let debounceTimer: NodeJS.Timeout | null = null;

    const watcher = fs.watch(manifestPath, async (eventType) => {
      if (eventType === 'change') {
        // Debounce rapid changes
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const content = await fs.promises.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(content) as Manifest;
            callback(manifest);
          } catch {
            // File might be in the middle of being written
          }
        }, 100);
      }
    });

    this.watchers.set(manifestPath, watcher);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher.close();
      this.watchers.delete(manifestPath);
    };
  }

  watchTodos(sessionId: string, callback: (todos: Todo[]) => void): () => void {
    const todosDir = path.join(os.homedir(), '.claude', 'todos');
    const todoFile = path.join(todosDir, `${sessionId}.json`);
    let debounceTimer: NodeJS.Timeout | null = null;

    // Try to read initially if file exists
    if (fs.existsSync(todoFile)) {
      try {
        const content = fs.readFileSync(todoFile, 'utf-8');
        const todos = JSON.parse(content) as Todo[];
        callback(todos);
      } catch {
        // Ignore initial read errors
      }
    }

    // Watch for changes
    const watcher = fs.watch(todosDir, async (eventType, filename) => {
      if (filename === `${sessionId}.json` && eventType === 'change') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const content = await fs.promises.readFile(todoFile, 'utf-8');
            const todos = JSON.parse(content) as Todo[];
            callback(todos);
          } catch {
            // File might be in the middle of being written
          }
        }, 50);
      }
    });

    this.watchers.set(todoFile, watcher);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher.close();
      this.watchers.delete(todoFile);
    };
  }

  watchTodoFile(sessionId: string, callback: (todos: Todo[]) => void): { close: () => void } {
    const stopWatching = this.watchTodos(sessionId, callback);
    return {
      close: stopWatching,
    };
  }

  async readTodoFile(sessionId: string): Promise<Todo[]> {
    const todosDir = path.join(os.homedir(), '.claude', 'todos');
    const todoFile = path.join(todosDir, `${sessionId}.json`);
    try {
      const content = await fs.promises.readFile(todoFile, 'utf-8');
      return JSON.parse(content) as Todo[];
    } catch {
      return [];
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  async writeJson(filePath: string, data: unknown): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async appendLog(logPath: string, message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    await fs.promises.appendFile(logPath, line);
  }

  resolvePath(inputPath: string): string {
    if (inputPath.startsWith('~')) {
      return path.join(os.homedir(), inputPath.slice(1));
    }
    return path.resolve(inputPath);
  }

  joinPath(...parts: string[]): string {
    return path.join(...parts);
  }

  getHomeDir(): string {
    return os.homedir();
  }

  cleanup(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}
