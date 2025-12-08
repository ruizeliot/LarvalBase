import type { Manifest, Epic, Phase, Todo, WorkerSession } from '../types/index.js';

export class ManifestService {
  createDefaultManifest(projectName: string, projectPath: string): Manifest {
    return {
      version: '7.0.0',
      project: {
        name: projectName,
        path: projectPath,
      },
      pipeline: {
        type: 'terminal-tui',
        version: '6.0',
        architecture: 'two-window',
      },
      currentPhase: '1',
      phases: {
        '1': { status: 'pending' },
        '2': { status: 'pending' },
        '3': { status: 'pending' },
        '4': { status: 'pending', loops: [] },
        '5': { status: 'pending' },
      },
      epics: [],
      tests: {
        total: 0,
        passing: 0,
        coverage: 0,
      },
      cost: {
        total: 0,
        byPhase: {},
      },
      duration: {
        total: 0,
        byPhase: {},
      },
      workers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  updatePhaseStatus(manifest: Manifest, phase: string, status: Phase['status']): Manifest {
    return {
      ...manifest,
      phases: {
        ...manifest.phases,
        [phase]: {
          ...manifest.phases[phase],
          status,
          ...(status === 'complete' ? { completedAt: new Date().toISOString() } : {}),
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  advancePhase(manifest: Manifest): Manifest {
    const currentPhase = parseInt(manifest.currentPhase, 10);
    const nextPhase = currentPhase + 1;

    if (nextPhase > 5) {
      return manifest;
    }

    return {
      ...manifest,
      currentPhase: String(nextPhase),
      phases: {
        ...manifest.phases,
        [String(currentPhase)]: {
          ...manifest.phases[String(currentPhase)],
          status: 'complete',
          completedAt: new Date().toISOString(),
        },
        [String(nextPhase)]: {
          ...manifest.phases[String(nextPhase)],
          status: 'running',
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  updateEpicStatus(manifest: Manifest, epicId: number, status: Epic['status']): Manifest {
    return {
      ...manifest,
      epics: manifest.epics.map((epic) =>
        epic.id === epicId ? { ...epic, status } : epic
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  addWorker(manifest: Manifest, worker: WorkerSession): Manifest {
    return {
      ...manifest,
      workers: [...manifest.workers, worker],
      updatedAt: new Date().toISOString(),
    };
  }

  updateWorkerStatus(manifest: Manifest, sessionId: string, status: WorkerSession['status']): Manifest {
    return {
      ...manifest,
      workers: manifest.workers.map((w) =>
        w.sessionId === sessionId ? { ...w, status } : w
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  updateCost(manifest: Manifest, cost: number, phase?: string): Manifest {
    const byPhase = { ...manifest.cost.byPhase };
    if (phase) {
      byPhase[phase] = (byPhase[phase] ?? 0) + cost;
    }

    return {
      ...manifest,
      cost: {
        total: manifest.cost.total + cost,
        byPhase,
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  updateDuration(manifest: Manifest, seconds: number, phase?: string): Manifest {
    const byPhase = { ...manifest.duration.byPhase };
    if (phase) {
      byPhase[phase] = (byPhase[phase] ?? 0) + seconds;
    }

    return {
      ...manifest,
      duration: {
        total: manifest.duration.total + seconds,
        byPhase,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  calculateProgress(todos: Todo[]): number {
    if (todos.length === 0) return 0;
    const completed = todos.filter((t) => t.status === 'completed').length;
    return Math.round((completed / todos.length) * 100);
  }

  isPhaseComplete(todos: Todo[]): boolean {
    return todos.length > 0 && todos.every((t) => t.status === 'completed');
  }

  getCurrentEpic(manifest: Manifest): Epic | null {
    return manifest.epics.find((e) => e.status === 'in_progress') ?? null;
  }

  getNextPendingEpic(manifest: Manifest): Epic | null {
    return manifest.epics.find((e) => e.status === 'pending') ?? null;
  }
}
