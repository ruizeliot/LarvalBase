/**
 * Dashboard Module Tests
 *
 * Tests for colors, layout, render, and input modules.
 */

'use strict';

const dashboard = require('../index.cjs');

// Sample manifest for testing
const sampleManifest = {
  version: '11.0.0',
  project: { name: 'test-project', path: '/test' },
  stack: 'desktop',
  mode: 'new',
  userMode: 'dev',
  status: 'running',
  brainstorm: {
    completed: true,
    completedAt: '2026-01-13T10:00:00.000Z',
    notesFile: 'docs/brainstorm-notes.md',
    storiesFile: 'docs/user-stories.md',
    epicCount: 3,
    storyCount: 12
  },
  currentPhase: '4',
  currentAgent: null,
  currentEpic: 2,
  phases: {
    '2': { status: 'complete', cost: 0.45 },
    '3': { status: 'complete', cost: 1.20 },
    '4': {
      status: 'running',
      currentEpic: 2,
      epicStatuses: [
        { id: 1, name: 'Authentication', status: 'complete' },
        { id: 2, name: 'Dashboard', status: 'running' },
        { id: 3, name: 'Settings', status: 'pending' }
      ]
    },
    '5': { status: 'pending' }
  },
  totalCost: 1.65,
  workers: {
    current: { pid: 12345, phase: '4' },
    supervisor: { pid: 12346 }
  },
  heartbeat: {
    enabled: true,
    intervalMs: 300000,
    lastSeen: new Date().toISOString()
  }
};

describe('Dashboard Colors', () => {
  test('colors.success returns green text', () => {
    const result = dashboard.colors.success('test');
    expect(result).toContain('\x1b[');
    expect(result).toContain('test');
    expect(result).toContain('\x1b[0m'); // Reset
  });

  test('colors.error returns red text', () => {
    const result = dashboard.colors.error('error');
    expect(result).toContain('error');
  });

  test('colors.strip removes ANSI codes', () => {
    const colored = dashboard.colors.success('test');
    const stripped = dashboard.colors.strip(colored);
    expect(stripped).toBe('test');
  });

  test('SYMBOLS has expected values', () => {
    expect(dashboard.SYMBOLS.checkmark).toBe('✓');
    expect(dashboard.SYMBOLS.cross).toBe('✗');
    expect(dashboard.SYMBOLS.arrow).toBe('▶');
    expect(dashboard.SYMBOLS.circle).toBe('○');
  });

  test('BOX has expected values', () => {
    expect(dashboard.BOX.topLeft).toBe('┌');
    expect(dashboard.BOX.horizontal).toBe('─');
    expect(dashboard.BOX.vertical).toBe('│');
  });
});

describe('Dashboard Layout', () => {
  test('getTerminalSize returns dimensions', () => {
    const size = dashboard.getTerminalSize();
    expect(size.width).toBeGreaterThanOrEqual(dashboard.MIN_WIDTH);
    expect(size.width).toBeLessThanOrEqual(dashboard.MAX_WIDTH);
    expect(size.height).toBeGreaterThan(0);
  });

  test('boxTop creates top border', () => {
    const top = dashboard.boxTop(20);
    const stripped = dashboard.colors.strip(top);
    expect(stripped).toStartWith('┌');
    expect(stripped).toEndWith('┐');
    expect(stripped.length).toBe(20);
  });

  test('boxBottom creates bottom border', () => {
    const bottom = dashboard.boxBottom(20);
    const stripped = dashboard.colors.strip(bottom);
    expect(stripped).toStartWith('└');
    expect(stripped).toEndWith('┘');
    expect(stripped.length).toBe(20);
  });

  test('boxRow creates content row', () => {
    const row = dashboard.boxRow('test', 20);
    const stripped = dashboard.colors.strip(row);
    expect(stripped).toStartWith('│');
    expect(stripped).toEndWith('│');
    expect(stripped).toContain('test');
  });

  test('pad pads string to width', () => {
    expect(dashboard.pad('test', 10)).toBe('test      ');
    expect(dashboard.pad('test', 10, 'right')).toBe('      test');
    expect(dashboard.pad('test', 10, 'center')).toBe('   test   ');
  });

  test('truncate shortens long strings', () => {
    const long = 'This is a very long string that should be truncated';
    const truncated = dashboard.truncate(long, 20);
    expect(truncated.length).toBe(20);
    expect(truncated).toEndWith('...');
  });

  test('progressBar shows progress', () => {
    const bar = dashboard.progressBar(5, 10, 10);
    const stripped = dashboard.colors.strip(bar);
    expect(stripped).toContain('50%');
  });
});

describe('Dashboard Render', () => {
  test('render returns string output', () => {
    const output = dashboard.render(sampleManifest);
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  test('render includes project name', () => {
    const output = dashboard.render(sampleManifest);
    expect(output).toContain('test-project');
  });

  test('render includes version', () => {
    const output = dashboard.render(sampleManifest);
    expect(output).toContain('11.0.0');
  });

  test('render includes cost', () => {
    const output = dashboard.render(sampleManifest);
    expect(output).toContain('$1.65');
  });

  test('render includes phase statuses', () => {
    const output = dashboard.render(sampleManifest);
    expect(output).toContain('Discovery');
    expect(output).toContain('Tests');
    expect(output).toContain('Impl');
    expect(output).toContain('Quality');
  });

  test('render shows worker status', () => {
    const output = dashboard.render(sampleManifest);
    expect(output).toContain('WORKER');
    expect(output).toContain('12345');
  });

  test('render shows epic info for phase 4', () => {
    const output = dashboard.render(sampleManifest);
    expect(output).toContain('Authentication');
    expect(output).toContain('Dashboard');
  });

  test('renderCompact returns single line', () => {
    const output = dashboard.renderCompact(sampleManifest);
    expect(output).not.toContain('\n');
    expect(output).toContain('test-project');
    expect(output).toContain('$1.65');
  });

  test('renderPhaseDetail shows phase info', () => {
    const output = dashboard.renderPhaseDetail(sampleManifest, '4', 60);
    expect(output).toContain('Phase 4');
    expect(output).toContain('Implementation');
  });

  test('getPhaseStyle returns correct symbols', () => {
    expect(dashboard.getPhaseStyle('complete').symbol).toBe('✓');
    expect(dashboard.getPhaseStyle('running').symbol).toBe('▶');
    expect(dashboard.getPhaseStyle('failed').symbol).toBe('✗');
    expect(dashboard.getPhaseStyle('pending').symbol).toBe('○');
  });

  test('formatCost formats currency', () => {
    const cost = dashboard.formatCost(1.234);
    const stripped = dashboard.colors.strip(cost);
    expect(stripped).toContain('$1.23');
  });

  test('formatDuration formats time', () => {
    expect(dashboard.formatDuration(30000)).toBe('30s');
    expect(dashboard.formatDuration(90000)).toBe('1m 30s');
    expect(dashboard.formatDuration(3660000)).toBe('61m 0s');
  });
});

describe('Dashboard Input', () => {
  test('KEYS has expected values', () => {
    expect(dashboard.KEYS.QUIT).toBe('q');
    expect(dashboard.KEYS.PAUSE).toBe('p');
    expect(dashboard.KEYS.RESUME).toBe('r');
    expect(dashboard.KEYS.KILL).toBe('k');
  });

  test('createInputHandler returns handler object', () => {
    const handler = dashboard.createInputHandler({});
    expect(typeof handler.start).toBe('function');
    expect(typeof handler.stop).toBe('function');
    expect(typeof handler.isActive).toBe('function');
    expect(handler.KEYS).toBeDefined();
  });

  test('createInputHandler isActive returns false initially', () => {
    const handler = dashboard.createInputHandler({});
    expect(handler.isActive()).toBe(false);
  });
});

describe('Dashboard Brainstorm Warning', () => {
  test('render shows warning if brainstorm incomplete', () => {
    const incomplete = {
      ...sampleManifest,
      brainstorm: { ...sampleManifest.brainstorm, completed: false }
    };
    const output = dashboard.render(incomplete);
    expect(output).toContain('Brainstorm not complete');
  });

  test('render does not show warning if brainstorm complete', () => {
    const output = dashboard.render(sampleManifest);
    expect(output).not.toContain('Brainstorm not complete');
  });
});

describe('Dashboard Controller', () => {
  test('createDashboard returns controller object', () => {
    const controller = dashboard.createDashboard();
    expect(typeof controller.start).toBe('function');
    expect(typeof controller.stop).toBe('function');
    expect(typeof controller.update).toBe('function');
    expect(typeof controller.redraw).toBe('function');
    expect(typeof controller.isRunning).toBe('function');
  });

  test('createDashboard isRunning returns false initially', () => {
    const controller = dashboard.createDashboard();
    expect(controller.isRunning()).toBe(false);
  });
});

// Custom matcher for strings starting with
expect.extend({
  toStartWith(received, expected) {
    const pass = received.startsWith(expected);
    return {
      pass,
      message: () => `expected ${received} to start with ${expected}`
    };
  },
  toEndWith(received, expected) {
    const pass = received.endsWith(expected);
    return {
      pass,
      message: () => `expected ${received} to end with ${expected}`
    };
  }
});
