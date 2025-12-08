import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as os from 'node:os';

export interface SessionCost {
  totalCost: number;
  duration: number;
  tokensIn?: number;
  tokensOut?: number;
}

export interface CostResult {
  total: number;
  sessions?: Array<{ id: string; cost: number; duration: number }>;
}

export interface DurationResult {
  total: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// Claude API pricing (approximate)
const INPUT_TOKEN_COST = 0.000015; // $15 per million input tokens
const OUTPUT_TOKEN_COST = 0.000075; // $75 per million output tokens

export class CostService {
  private ccusageAvailable: boolean | null = null;
  private phaseCosts: Record<number, number> = {};
  private phaseStartCosts: Record<number, number> = {};
  private currentCost: number = 0;
  private currentDuration: number = 0;

  private checkCcusageSync(): boolean {
    if (this.ccusageAvailable !== null) {
      return this.ccusageAvailable;
    }

    try {
      execSync('ccusage --version', { stdio: 'pipe' });
      this.ccusageAvailable = true;
    } catch {
      this.ccusageAvailable = false;
    }

    return this.ccusageAvailable;
  }

  async calculateCost(): Promise<CostResult> {
    if (!this.checkCcusageSync()) {
      return { total: 0 };
    }

    try {
      const stdout = execSync('ccusage --json', { encoding: 'utf-8' });
      const data = JSON.parse(stdout);
      this.currentCost = data.totalCost ?? 0;
      return {
        total: data.totalCost ?? 0,
        sessions: data.sessions,
      };
    } catch {
      return { total: 0 };
    }
  }

  async calculateCostBySession(sessionId: string): Promise<number> {
    if (!this.checkCcusageSync()) {
      return 0;
    }

    try {
      const stdout = execSync('ccusage --json', { encoding: 'utf-8' });
      const data = JSON.parse(stdout);
      const session = data.sessions?.find((s: { id: string }) => s.id === sessionId);
      return session?.cost ?? 0;
    } catch {
      return 0;
    }
  }

  async calculateDuration(): Promise<DurationResult> {
    if (!this.checkCcusageSync()) {
      return { total: 0 };
    }

    try {
      const stdout = execSync('ccusage --json', { encoding: 'utf-8' });
      const data = JSON.parse(stdout);
      this.currentDuration = data.totalDuration ?? 0;
      return { total: data.totalDuration ?? 0 };
    } catch {
      return { total: 0 };
    }
  }

  async recordPhaseStart(phase: number): Promise<void> {
    const cost = await this.calculateCost();
    this.phaseStartCosts[phase] = cost.total;
  }

  async recordPhaseEnd(phase: number): Promise<void> {
    const cost = await this.calculateCost();
    const startCost = this.phaseStartCosts[phase] ?? 0;
    this.phaseCosts[phase] = cost.total - startCost;
  }

  getPhaseCosts(): Record<number, number> {
    return { ...this.phaseCosts };
  }

  getPhaseCost(phase: number): number {
    return this.phaseCosts[phase] ?? 0;
  }

  estimateCost(usage: TokenUsage): number {
    if (usage.inputTokens === 0 && usage.outputTokens === 0) {
      return 0;
    }
    return (usage.inputTokens * INPUT_TOKEN_COST) + (usage.outputTokens * OUTPUT_TOKEN_COST);
  }

  getCurrentCost(): number {
    return this.currentCost;
  }

  getCurrentDuration(): number {
    return this.currentDuration;
  }

  async getSessionCost(sessionId: string): Promise<SessionCost> {
    const cost = await this.calculateCostBySession(sessionId);
    return { totalCost: cost, duration: 0 };
  }

  async getProjectCost(projectPath: string): Promise<SessionCost> {
    if (!this.checkCcusageSync()) {
      return { totalCost: 0, duration: 0 };
    }

    try {
      const stdout = execSync(`ccusage --cwd "${projectPath}" --json`, { encoding: 'utf-8' });
      const data = JSON.parse(stdout);
      return {
        totalCost: data.totalCost ?? 0,
        duration: data.duration ?? 0,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
      };
    } catch {
      return { totalCost: 0, duration: 0 };
    }
  }

  async recalculateCost(projectPath: string): Promise<number> {
    const cost = await this.getProjectCost(projectPath);
    return cost.totalCost;
  }

  formatCost(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getCcusageDir(): string {
    // ccusage typically stores data in ~/.ccusage
    return path.join(os.homedir(), '.ccusage');
  }
}
