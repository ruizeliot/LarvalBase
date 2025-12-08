import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Text as InkText } from 'ink';
import { ResumeScreen } from '../../../src/screens/ResumeScreen.js';
import { CompleteScreen } from '../../../src/screens/CompleteScreen.js';
import { HelpOverlay } from '../../../src/components/HelpOverlay.js';
import { Modal } from '../../../src/components/Modal.js';
import { createDefaultManifest, createManifestWithEpics } from '../helpers/test-harness.js';
import { expectOutput } from '../helpers/assertions.js';

describe('Epic 8: UI Screens', () => {
  afterEach(() => {
    cleanup();
  });

  describe('ResumeScreen', () => {
    it('displays project information', () => {
      const manifest = createDefaultManifest('Test Project', '/test/path');

      const { lastFrame } = render(
        React.createElement(ResumeScreen, {
          manifest,
          onResume: () => {},
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output).toContain('Test Project');
    });

    it('shows current phase', () => {
      const manifest = createDefaultManifest('Test', '/test');
      manifest.currentPhase = '3';

      const { lastFrame } = render(
        React.createElement(ResumeScreen, {
          manifest,
          onResume: () => {},
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output).toContain('3');
    });

    it('shows progress percentage', () => {
      const manifest = createDefaultManifest('Test', '/test');
      manifest.phases['1'].status = 'complete';
      manifest.phases['2'].status = 'complete';

      const { lastFrame } = render(
        React.createElement(ResumeScreen, {
          manifest,
          onResume: () => {},
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output).toMatch(/\d+%/);
    });

    it('shows cost', () => {
      const manifest = createDefaultManifest('Test', '/test');
      manifest.cost.total = 5.25;

      const { lastFrame } = render(
        React.createElement(ResumeScreen, {
          manifest,
          onResume: () => {},
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output).toContain('$5.25');
    });

    it('shows resume option', () => {
      const manifest = createDefaultManifest('Test', '/test');

      const { lastFrame } = render(
        React.createElement(ResumeScreen, {
          manifest,
          onResume: () => {},
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output.toLowerCase()).toContain('resume');
    });

    it('shows start fresh option', () => {
      const manifest = createDefaultManifest('Test', '/test');

      const { lastFrame } = render(
        React.createElement(ResumeScreen, {
          manifest,
          onResume: () => {},
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output.toLowerCase()).toMatch(/new|fresh|start/);
    });
  });

  describe('CompleteScreen', () => {
    it('displays success message', () => {
      const manifest = createManifestWithEpics('Test', '/test', 3);
      manifest.phases['5'].status = 'complete';

      const { lastFrame } = render(
        React.createElement(CompleteScreen, {
          manifest,
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output.toLowerCase()).toMatch(/complete|success/);
    });

    it('shows project summary', () => {
      const manifest = createManifestWithEpics('Test Project', '/test', 3);

      const { lastFrame } = render(
        React.createElement(CompleteScreen, {
          manifest,
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output).toContain('Test Project');
    });

    it('shows completed phases count', () => {
      const manifest = createDefaultManifest('Test', '/test');
      manifest.phases['1'].status = 'complete';
      manifest.phases['2'].status = 'complete';
      manifest.phases['3'].status = 'complete';

      const { lastFrame } = render(
        React.createElement(CompleteScreen, {
          manifest,
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output).toMatch(/3.*5|3\/5/);
    });

    it('shows total cost', () => {
      const manifest = createDefaultManifest('Test', '/test');
      manifest.cost.total = 12.50;

      const { lastFrame } = render(
        React.createElement(CompleteScreen, {
          manifest,
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output).toContain('$12.50');
    });

    it('shows test results', () => {
      const manifest = createDefaultManifest('Test', '/test');
      manifest.tests.total = 100;
      manifest.tests.passing = 95;
      manifest.tests.coverage = 85;

      const { lastFrame } = render(
        React.createElement(CompleteScreen, {
          manifest,
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output).toMatch(/95|100/);
    });

    it('shows start new option', () => {
      const manifest = createDefaultManifest('Test', '/test');

      const { lastFrame } = render(
        React.createElement(CompleteScreen, {
          manifest,
          onNew: () => {},
          onQuit: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output.toLowerCase()).toMatch(/new|start/);
    });
  });

  describe('HelpOverlay', () => {
    it('displays keyboard shortcuts', () => {
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          onClose: () => {},
        })
      );
      const output = lastFrame() || '';

      // Should show some shortcuts
      expect(output).toMatch(/\[.\]/);
    });

    it('shows start shortcut', () => {
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          onClose: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output.toLowerCase()).toMatch(/start|s/);
    });

    it('shows stop shortcut', () => {
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          onClose: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output.toLowerCase()).toMatch(/stop|x/);
    });

    it('shows quit shortcut', () => {
      const { lastFrame } = render(
        React.createElement(HelpOverlay, {
          onClose: () => {},
        })
      );
      const output = lastFrame() || '';

      expect(output.toLowerCase()).toMatch(/quit|q/);
    });
  });

  describe('Modal Component', () => {
    it('renders with title', () => {
      const { lastFrame } = render(
        React.createElement(Modal, {
          title: 'Test Modal',
          onClose: () => {},
          width: 40,
        },
          React.createElement(InkText, null, 'Modal content')
        )
      );
      const output = lastFrame() || '';

      expect(output).toContain('Test Modal');
    });

    it('renders children content', () => {
      const { lastFrame } = render(
        React.createElement(Modal, {
          title: 'Test',
          onClose: () => {},
          width: 40,
        },
          React.createElement(InkText, null, 'Inner content here')
        )
      );
      const output = lastFrame() || '';

      expect(output).toContain('Inner content');
    });

    it('has borders', () => {
      const { lastFrame } = render(
        React.createElement(Modal, {
          title: 'Test',
          onClose: () => {},
          width: 40,
        },
          React.createElement(InkText, null, 'Content')
        )
      );
      const output = lastFrame() || '';

      expectOutput(output).toHaveModal();
    });
  });
});
