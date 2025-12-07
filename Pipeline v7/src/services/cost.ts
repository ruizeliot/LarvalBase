import { execSync } from 'child_process';
import type { Cost, Duration } from '../types/index.js';

// SKELETON: Service structure in place but methods are stubs

export interface SessionCost {
  sessionId: string;
  cost: number;
  duration: number;
  startTime: string;
  endTime: string;
}

export class CostService {
  private sessionIds: string[] = [];

  addSession(sessionId: string): void {
    this.sessionIds.push(sessionId);
  }

  getCurrentCost(): Cost {
    // SKELETON: Would query ccusage for actual costs
    return {
      total: 0,
      byPhase: {},
    };
  }

  getCurrentDuration(): Duration {
    // SKELETON: Would calculate from session timestamps
    return {
      total: 0,
      byPhase: {},
    };
  }

  recalculateFromCCUsage(): { cost: Cost; duration: Duration } {
    // SKELETON: Would run ccusage and parse output
    // On resume, this recalculates from stored sessions
    try {
      // In production:
      // const output = execSync('ccusage --json').toString();
      // Parse and sum costs for our session IDs

      return {
        cost: { total: 0, byPhase: {} },
        duration: { total: 0, byPhase: {} },
      };
    } catch {
      return {
        cost: { total: 0, byPhase: {} },
        duration: { total: 0, byPhase: {} },
      };
    }
  }

  getSessionCost(sessionId: string): SessionCost | null {
    // SKELETON: Would query ccusage for specific session
    return null;
  }

  formatCost(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
}
