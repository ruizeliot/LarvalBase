import chokidar from 'chokidar';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

interface NotesWatchState {
  lastContent: string;
  lastAiWrite: number;  // Timestamp of last AI write
}

const AI_WRITE_GRACE_PERIOD = 1000;  // 1 second to ignore changes after AI write

let notesWatcher: chokidar.FSWatcher | null = null;
const watchState: NotesWatchState = {
  lastContent: '',
  lastAiWrite: 0
};

export function markAiWrite(): void {
  watchState.lastAiWrite = Date.now();
}

export function watchNotesFile(
  filePath: string,
  onExternalEdit: (newContent: string, addedLines: string[]) => void
): () => void {
  if (notesWatcher) {
    notesWatcher.close();
  }

  if (!existsSync(filePath)) {
    console.error('[Edits] Notes file does not exist yet:', filePath);
    return () => {};
  }

  notesWatcher = chokidar.watch(filePath, {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  // Initialize with current content
  readFile(filePath, 'utf-8').then(content => {
    watchState.lastContent = content;
  }).catch(() => {});

  notesWatcher.on('change', async (path: string) => {
    // Skip if this is likely our own write
    if (Date.now() - watchState.lastAiWrite < AI_WRITE_GRACE_PERIOD) {
      console.error('[Edits] Ignoring change within AI write grace period');
      return;
    }

    try {
      const content = await readFile(path, 'utf-8');
      if (content !== watchState.lastContent) {
        // Find added lines
        const oldLines = watchState.lastContent.split('\n');
        const newLines = content.split('\n');
        const addedLines = findAddedLines(oldLines, newLines);

        watchState.lastContent = content;
        onExternalEdit(content, addedLines);
      }
    } catch (err) {
      console.error('[Edits] Error reading notes file:', err);
    }
  });

  console.error('[Edits] Watching notes file:', filePath);

  return () => {
    if (notesWatcher) {
      notesWatcher.close();
      notesWatcher = null;
    }
  };
}

function findAddedLines(oldLines: string[], newLines: string[]): string[] {
  const oldSet = new Set(oldLines);
  return newLines.filter(line => !oldSet.has(line) && line.trim().length > 0);
}

// Track AI-generated element IDs for canvas edit attribution
let aiElementIds: Set<string> = new Set();

export function registerAiElements(ids: string[]): void {
  ids.forEach(id => aiElementIds.add(id));
}

export function isAiElement(id: string): boolean {
  return aiElementIds.has(id);
}

export function clearAiElements(): void {
  aiElementIds.clear();
}

// Pending user edits for AI to process
interface PendingEdit {
  timestamp: number;
  source: 'canvas' | 'notes';
  description: string;
  content?: string;
}

const pendingUserEdits: PendingEdit[] = [];

export function addPendingEdit(edit: PendingEdit): void {
  pendingUserEdits.push(edit);
}

export function getPendingEdits(): PendingEdit[] {
  const edits = [...pendingUserEdits];
  pendingUserEdits.length = 0;  // Clear after reading
  return edits;
}
