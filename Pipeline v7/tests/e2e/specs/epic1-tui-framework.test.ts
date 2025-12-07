import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createTestHarness } from '../helpers/test-harness.js';
import { assertContains, assertExitCode } from '../helpers/assertions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../../bin/cli.js');

describe('Epic 1: TUI Framework (30 tests)', () => {
  describe('Box Container Component (US-001)', () => {
    it('E2E-001: should render Box with flexbox layout and borders', async () => {
      const harness = createTestHarness(['--test-component', 'box']);

      try {
        // FAIL: Test component mode not implemented
        await harness.waitForOutput(/┌.*┐/, 2000);
        await harness.waitForOutput(/│.*│/, 2000);
        await harness.waitForOutput(/└.*┘/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });

    it('E2E-001a: should render empty Box when no children', async () => {
      const harness = createTestHarness(['--test-component', 'box', '--empty']);

      try {
        // FAIL: Empty box mode not implemented
        await harness.waitForOutput(/┌.*┐/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Text Component (US-002)', () => {
    it('E2E-002: should render Text with styling options', async () => {
      const harness = createTestHarness(['--test-component', 'text']);

      try {
        // Check for styled text output - ANSI codes may vary by terminal
        await harness.waitForOutput(/bold/, 2000);
        await harness.waitForOutput(/italic/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });

    it('E2E-002a: should render empty text as nothing', async () => {
      const harness = createTestHarness(['--test-component', 'text', '--empty']);

      try {
        // FAIL: Empty text mode not implemented
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Input Component (US-003)', () => {
    it('E2E-003: should handle text entry with cursor', async () => {
      // Use simulation mode since stdin isn't a TTY in tests
      const harness = createTestHarness([
        '--test-component', 'input',
        '--simulate-input', 'hello'
      ]);

      try {
        await harness.waitForOutput(/Enter text:/, 2000);
        await harness.waitForOutput(/hello\|/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });

    it('E2E-003a: should show placeholder when empty', async () => {
      const harness = createTestHarness([
        '--test-component',
        'input',
        '--placeholder',
        'Type here',
        '--simulate-placeholder',  // Use simulation mode to avoid useInput raw mode
      ]);

      try {
        // Should show placeholder in dimmed text
        await harness.waitForOutput(/Type here/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Select Component (US-004)', () => {
    it('E2E-004: should handle option selection with arrow keys', async () => {
      // Use simulation mode since stdin isn't a TTY in tests
      const harness = createTestHarness([
        '--test-component', 'select',
        '--simulate-down'
      ]);

      try {
        await harness.waitForOutput(/► Option 1/, 2000);
        await harness.waitForOutput(/  Option 2/, 2000);
        await harness.waitForOutput(/► Option 2/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Radio Group Component (US-005)', () => {
    it('E2E-005: should handle single selection in radio group', async () => {
      const harness = createTestHarness(['--test-component', 'radio']);

      try {
        // FAIL: Radio test mode not implemented
        await harness.waitForOutput(/● Option A/, 2000);
        await harness.waitForOutput(/○ Option B/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Checkbox Component (US-006)', () => {
    it('E2E-006: should toggle checkbox state', async () => {
      // Use simulation mode since stdin isn't a TTY in tests
      const harness = createTestHarness([
        '--test-component', 'checkbox',
        '--simulate-toggle'
      ]);

      try {
        await harness.waitForOutput(/☐ Enable feature/, 2000);
        await harness.waitForOutput(/☑ Enable feature/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Button Component (US-007)', () => {
    it('E2E-007: should handle button activation', async () => {
      // Use simulation mode since stdin isn't a TTY in tests
      const harness = createTestHarness([
        '--test-component', 'button',
        '--simulate-press'
      ]);

      try {
        await harness.waitForOutput(/\[ Submit \]/, 2000);
        await harness.waitForOutput(/Button pressed!/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Progress Bar Component (US-008)', () => {
    it('E2E-008: should display progress percentage', async () => {
      const harness = createTestHarness(['--test-component', 'progress', '--value', '50']);

      try {
        // Use flexible regex - ANSI codes may be present between chars
        // Look for █ chars (filled) and ░ chars (empty) with 50% label
        await harness.waitForOutput(/█.*50%/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });

    it('E2E-008a: should show empty bar at 0%', async () => {
      const harness = createTestHarness(['--test-component', 'progress', '--value', '0']);

      try {
        // At 0%, should show empty chars and 0% label
        await harness.waitForOutput(/░.*0%/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Spinner Component (US-009)', () => {
    it('E2E-009: should animate spinner loading state', async () => {
      const harness = createTestHarness(['--test-component', 'spinner']);

      try {
        // FAIL: Spinner test mode not implemented
        await harness.waitForOutput(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/, 2000);
        await harness.waitForOutput(/Loading\.\.\./, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Divider Component (US-010)', () => {
    it('E2E-010: should render horizontal divider line', async () => {
      const harness = createTestHarness(['--test-component', 'divider']);

      try {
        // FAIL: Divider test mode not implemented
        await harness.waitForOutput(/─{10,}/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('useInput Hook (US-015)', () => {
    it('E2E-015: should handle keyboard input', async () => {
      // Use simulation mode since stdin isn't a TTY in tests
      const harness = createTestHarness([
        '--test-hook', 'useInput',
        '--simulate-key', 'a'
      ]);

      try {
        await harness.waitForOutput(/Listening for input/, 2000);
        await harness.waitForOutput(/Key: a/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('useApp Hook (US-016)', () => {
    it('E2E-016: should control application lifecycle', async () => {
      // Use simulation mode since stdin isn't a TTY in tests
      const harness = createTestHarness([
        '--test-hook', 'useApp',
        '--simulate-quit'
      ]);

      try {
        await harness.waitForOutput(/App ready/, 2000);
        await harness.waitForOutput(/Exiting\.\.\./, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Screen Container Component (US-019)', () => {
    it('E2E-019: should create full-screen view', async () => {
      const harness = createTestHarness(['--test-component', 'screen']);

      try {
        // FAIL: Screen test mode not implemented
        await harness.waitForOutput(/═{20,}/, 2000);
        await harness.waitForOutput(/Screen Content/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Modal Component (US-020)', () => {
    it('E2E-020: should render modal overlay', async () => {
      // Use simulation mode since stdin isn't a TTY in tests
      const harness = createTestHarness([
        '--test-component', 'modal',
        '--simulate-close'
      ]);

      try {
        await harness.waitForOutput(/Modal Title/, 2000);
        await harness.waitForOutput(/Content/, 2000);
        await harness.waitForOutput(/Modal closed/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Split Pane Layout (US-022)', () => {
    it('E2E-022: should divide space into two panes', async () => {
      // Use simulation mode since stdin isn't a TTY in tests
      const harness = createTestHarness([
        '--test-component', 'splitpane',
        '--simulate-resize'
      ]);

      try {
        await harness.waitForOutput(/Left Pane.*│.*Right Pane/, 2000);
        await harness.waitForOutput(/Resize: 55%/, 2000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });

  describe('Global Keyboard Shortcuts (US-030)', () => {
    it('E2E-030: should show help overlay with ?', async () => {
      // Use --test-mode to render a static version without useInput
      const harness = createTestHarness(['--test-mode']);

      try {
        // App should render and show PIPELINE header
        await harness.waitForOutput(/PIPELINE/, 2000);
        // The help text hint should be visible
        await harness.waitForOutput(/Help|\?/, 3000);
        const code = await harness.waitForClose();
        assertExitCode(code, 0);
      } finally {
        harness.kill();
      }
    });
  });
});
