import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Manifest, Todo } from '../types/index.js';

/**
 * FilesystemService - Centralized filesystem operations for Pipeline v7
 *
 * Epic 4 Implementation:
 * - US-060: Project existence check
 * - US-061: Project directory creation
 * - US-062: Manifest file I/O
 * - US-063: Todo file watching
 * - US-064: Docs directory reading
 * - US-065: Atomic write pattern
 * - US-066: File path resolution
 * - US-067: Cross-platform path handling
 * - US-068: Todo directory management
 * - US-069: Error handling
 */

export interface FileWatcher {
  close: () => void;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  hasManifest: boolean;
  hasDocs: boolean;
}

export class FilesystemService {
  private watchers: Map<string, fs.FSWatcher> = new Map();

  // US-060: Project Existence Check
  projectExists(projectPath: string): boolean {
    const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
    return fs.existsSync(manifestPath);
  }

  // US-061: Project Directory Creation
  createProjectStructure(projectPath: string): void {
    const dirs = ['docs', 'src', 'tests', '.pipeline'];
    for (const dir of dirs) {
      const dirPath = path.join(projectPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  // US-062: Manifest File I/O
  readManifest(projectPath: string): Manifest | null {
    const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
    try {
      if (!fs.existsSync(manifestPath)) {
        return null;
      }
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content) as Manifest;
    } catch {
      return null;
    }
  }

  writeManifest(projectPath: string, manifest: Manifest): void {
    const pipelineDir = path.join(projectPath, '.pipeline');
    if (!fs.existsSync(pipelineDir)) {
      fs.mkdirSync(pipelineDir, { recursive: true });
    }
    const manifestPath = path.join(pipelineDir, 'manifest.json');
    // Use atomic write (temp + rename) for safety
    this.atomicWrite(manifestPath, JSON.stringify(manifest, null, 2));
  }

  // US-063: Todo File Watching
  watchTodoFile(
    todoPath: string,
    callback: (todos: Todo[]) => void
  ): FileWatcher {
    const dir = path.dirname(todoPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize file if it doesn't exist
    if (!fs.existsSync(todoPath)) {
      fs.writeFileSync(todoPath, JSON.stringify([]));
    }

    const watcher = fs.watch(todoPath, () => {
      try {
        const content = fs.readFileSync(todoPath, 'utf-8');
        const todos = JSON.parse(content) as Todo[];
        callback(todos);
      } catch {
        // Ignore parse errors during write
      }
    });

    this.watchers.set(todoPath, watcher);

    return {
      close: () => {
        watcher.close();
        this.watchers.delete(todoPath);
      },
    };
  }

  // US-064: Docs Directory Reading
  readDocsDirectory(projectPath: string): string[] {
    const docsDir = path.join(projectPath, 'docs');
    if (!fs.existsSync(docsDir)) {
      return [];
    }
    return fs.readdirSync(docsDir);
  }

  readDocFile(projectPath: string, filename: string): string | null {
    const filePath = path.join(projectPath, 'docs', filename);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  // US-065: Atomic Write Pattern
  atomicWrite(targetPath: string, content: string): void {
    const tempPath = targetPath + '.tmp';
    const dir = path.dirname(targetPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to temp file first
    fs.writeFileSync(tempPath, content);

    // Rename to final destination (atomic on most filesystems)
    fs.renameSync(tempPath, targetPath);
  }

  // US-066: File Path Resolution
  resolvePath(basePath: string, relativePath: string): string {
    return path.resolve(basePath, relativePath);
  }

  isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  // US-067: Cross-Platform Path Handling
  normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  joinPaths(...paths: string[]): string {
    return path.join(...paths);
  }

  getBasename(filePath: string): string {
    return path.basename(filePath);
  }

  getDirname(filePath: string): string {
    return path.dirname(filePath);
  }

  // US-068: Todo Directory Management
  getTodoDirectory(): string {
    return path.join(os.homedir(), '.claude', 'todos');
  }

  ensureTodoDirectory(): void {
    const todoDir = this.getTodoDirectory();
    if (!fs.existsSync(todoDir)) {
      fs.mkdirSync(todoDir, { recursive: true });
    }
  }

  cleanStaleTodoFiles(sessionId?: string): number {
    const todoDir = this.getTodoDirectory();
    if (!fs.existsSync(todoDir)) {
      return 0;
    }

    const files = fs.readdirSync(todoDir);
    let cleaned = 0;

    for (const file of files) {
      // If sessionId provided, only clean files matching that session
      // Otherwise, clean all .json files
      if (!sessionId || file.includes(sessionId)) {
        try {
          fs.unlinkSync(path.join(todoDir, file));
          cleaned++;
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    return cleaned;
  }

  listTodoFiles(): string[] {
    const todoDir = this.getTodoDirectory();
    if (!fs.existsSync(todoDir)) {
      return [];
    }
    return fs.readdirSync(todoDir).filter((f) => f.endsWith('.json'));
  }

  // US-069: Error Handling
  safeRead(filePath: string): { content: string | null; error: Error | null } {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { content, error: null };
    } catch (err) {
      return { content: null, error: err as Error };
    }
  }

  safeWrite(
    filePath: string,
    content: string
  ): { success: boolean; error: Error | null } {
    try {
      this.atomicWrite(filePath, content);
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  }

  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  isDirectory(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch {
      return false;
    }
  }

  isFile(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  // Validation helpers
  validateProjectPath(projectPath: string): ValidationResult {
    if (!projectPath) {
      return { valid: false, error: 'Project path is required' };
    }

    if (!path.isAbsolute(projectPath)) {
      return { valid: false, error: 'Project path must be absolute' };
    }

    try {
      const stat = fs.statSync(projectPath);
      if (!stat.isDirectory()) {
        return { valid: false, error: 'Project path must be a directory' };
      }
    } catch {
      // Directory doesn't exist, which is okay for new projects
      return { valid: true };
    }

    return { valid: true };
  }

  // Project discovery
  discoverProject(projectPath: string): ProjectInfo | null {
    const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    try {
      const manifest = this.readManifest(projectPath);
      if (!manifest) {
        return null;
      }

      return {
        name: manifest.project?.name || path.basename(projectPath),
        path: projectPath,
        hasManifest: true,
        hasDocs: fs.existsSync(path.join(projectPath, 'docs')),
      };
    } catch {
      return null;
    }
  }

  // Cleanup
  closeAllWatchers(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}
