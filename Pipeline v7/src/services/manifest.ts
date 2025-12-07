import * as fs from 'fs';
import * as path from 'path';
import type { Manifest, Phase, Epic } from '../types/index.js';

// SKELETON: Service structure in place but methods are stubs

export class ManifestService {
  private projectPath: string;
  private manifest: Manifest | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  get manifestPath(): string {
    return path.join(this.projectPath, '.pipeline', 'manifest.json');
  }

  exists(): boolean {
    return fs.existsSync(this.manifestPath);
  }

  read(): Manifest | null {
    // SKELETON: Would read from file
    if (!this.exists()) {
      return null;
    }
    try {
      const content = fs.readFileSync(this.manifestPath, 'utf-8');
      this.manifest = JSON.parse(content) as Manifest;
      return this.manifest;
    } catch {
      return null;
    }
  }

  write(manifest: Manifest): void {
    // SKELETON: Would use atomic write (temp + rename)
    const dir = path.dirname(this.manifestPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2));
    this.manifest = manifest;
  }

  updatePhase(phaseNum: number, updates: Partial<Phase>): void {
    // SKELETON: Would update specific phase
    if (!this.manifest) return;
    this.manifest.phases[phaseNum] = {
      ...this.manifest.phases[phaseNum],
      ...updates,
    };
    this.write(this.manifest);
  }

  advancePhase(): void {
    // SKELETON: Would advance to next phase
    if (!this.manifest) return;
    this.manifest.currentPhase++;
    this.write(this.manifest);
  }

  getEpics(): Epic[] {
    // SKELETON: Would return phase 4 epics
    return this.manifest?.phases[4]?.epics || [];
  }

  static createDefault(projectPath: string, name: string): Manifest {
    return {
      version: '7.0.0',
      project: {
        name,
        path: projectPath,
        type: 'terminal',
        mode: 'new',
      },
      currentPhase: 1,
      phases: {
        1: { status: 'pending' },
        2: { status: 'pending' },
        3: { status: 'pending' },
        4: { status: 'pending', epics: [] },
        5: { status: 'pending' },
      },
      workers: [],
      cost: { total: 0, byPhase: {} },
      duration: { total: 0, byPhase: {} },
    };
  }
}
