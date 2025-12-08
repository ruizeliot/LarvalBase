import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CostService } from '../../../src/services/cost.js';

// Mock child_process with all needed exports
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: vi.fn().mockImplementation((cmd: string) => {
      if (cmd.includes('ccusage')) {
        return Buffer.from(JSON.stringify({
          totalCost: 5.25,
          totalDuration: 3600,
          sessions: [
            { id: 'session-1', cost: 2.50, duration: 1800 },
            { id: 'session-2', cost: 2.75, duration: 1800 },
          ],
        }));
      }
      return Buffer.from('');
    }),
    spawn: vi.fn(),
    exec: vi.fn((cmd, opts, callback) => {
      if (callback) callback(null, 'mock output', '');
      return { pid: 12345 };
    }),
  };
});

describe('Epic 6: Cost Service', () => {
  let costService: CostService;

  beforeEach(() => {
    costService = new CostService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cost Calculation', () => {
    it('calculates total cost from ccusage', async () => {
      const result = await costService.calculateCost();
      expect(result.total).toBeDefined();
      expect(typeof result.total).toBe('number');
    });

    it('returns zero when ccusage not available', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('ccusage not found');
      });

      const result = await costService.calculateCost();
      expect(result.total).toBe(0);
    });

    it('calculates cost by session', async () => {
      const result = await costService.calculateCostBySession('session-1');
      expect(typeof result).toBe('number');
    });
  });

  describe('Duration Tracking', () => {
    it('calculates total duration', async () => {
      const result = await costService.calculateDuration();
      expect(result.total).toBeDefined();
      expect(typeof result.total).toBe('number');
    });

    it('returns duration in seconds', async () => {
      const result = await costService.calculateDuration();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Phase Cost Attribution', () => {
    it('tracks cost by phase', async () => {
      await costService.recordPhaseStart(1);
      await costService.recordPhaseEnd(1);

      const phaseCosts = costService.getPhaseCosts();
      expect(phaseCosts).toHaveProperty('1');
    });

    it('accumulates cost across phases', async () => {
      await costService.recordPhaseStart(1);
      await costService.recordPhaseEnd(1);
      await costService.recordPhaseStart(2);
      await costService.recordPhaseEnd(2);

      const phaseCosts = costService.getPhaseCosts();
      expect(Object.keys(phaseCosts).length).toBeGreaterThanOrEqual(2);
    });

    it('handles phase with no cost', async () => {
      const cost = costService.getPhaseCost(99);
      expect(cost).toBe(0);
    });
  });

  describe('Cost Formatting', () => {
    it('formats cost as currency string', () => {
      const formatted = costService.formatCost(12.5);
      expect(formatted).toBe('$12.50');
    });

    it('formats zero cost', () => {
      const formatted = costService.formatCost(0);
      expect(formatted).toBe('$0.00');
    });

    it('formats large cost with commas', () => {
      const formatted = costService.formatCost(1234.56);
      expect(formatted).toContain('1');
      expect(formatted).toContain('234');
    });

    it('rounds to 2 decimal places', () => {
      const formatted = costService.formatCost(1.999);
      expect(formatted).toBe('$2.00');
    });
  });

  describe('Duration Formatting', () => {
    it('formats duration as MM:SS', () => {
      const formatted = costService.formatDuration(90);
      expect(formatted).toBe('1:30');
    });

    it('formats duration as HH:MM:SS for long durations', () => {
      const formatted = costService.formatDuration(3661);
      expect(formatted).toBe('1:01:01');
    });

    it('formats zero duration', () => {
      const formatted = costService.formatDuration(0);
      expect(formatted).toBe('0:00');
    });

    it('pads seconds with leading zero', () => {
      const formatted = costService.formatDuration(65);
      expect(formatted).toBe('1:05');
    });
  });

  describe('Cost Estimation', () => {
    it('estimates cost based on token usage', () => {
      const estimate = costService.estimateCost({
        inputTokens: 1000,
        outputTokens: 500,
      });
      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThan(0);
    });

    it('returns zero for zero tokens', () => {
      const estimate = costService.estimateCost({
        inputTokens: 0,
        outputTokens: 0,
      });
      expect(estimate).toBe(0);
    });
  });

  describe('Real-time Updates', () => {
    it('provides current cost', () => {
      const current = costService.getCurrentCost();
      expect(typeof current).toBe('number');
    });

    it('provides current duration', () => {
      const current = costService.getCurrentDuration();
      expect(typeof current).toBe('number');
    });
  });
});
