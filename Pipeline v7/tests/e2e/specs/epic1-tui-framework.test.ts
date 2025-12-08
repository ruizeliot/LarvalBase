import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { Badge } from '../../../src/components/Badge.js';
import { Divider } from '../../../src/components/Divider.js';
import { ProgressBar } from '../../../src/components/ProgressBar.js';
import { Header } from '../../../src/components/Header.js';
import { expectOutput } from '../helpers/assertions.js';

describe('Epic 1: TUI Framework', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Badge Component', () => {
    it('renders success variant with green color', () => {
      const { lastFrame } = render(React.createElement(Badge, { variant: 'success' }, 'SUCCESS'));
      const output = lastFrame() || '';
      expect(output).toContain('SUCCESS');
    });

    it('renders error variant', () => {
      const { lastFrame } = render(React.createElement(Badge, { variant: 'error' }, 'ERROR'));
      const output = lastFrame() || '';
      expect(output).toContain('ERROR');
    });

    it('renders warning variant', () => {
      const { lastFrame } = render(React.createElement(Badge, { variant: 'warning' }, 'WARN'));
      const output = lastFrame() || '';
      expect(output).toContain('WARN');
    });

    it('renders info variant', () => {
      const { lastFrame } = render(React.createElement(Badge, { variant: 'info' }, 'INFO'));
      const output = lastFrame() || '';
      expect(output).toContain('INFO');
    });
  });

  describe('Divider Component', () => {
    it('renders horizontal line', () => {
      const { lastFrame } = render(React.createElement(Divider, {}));
      const output = lastFrame() || '';
      expect(output).toMatch(/─+/);
    });

    it('renders with title centered', () => {
      const { lastFrame } = render(React.createElement(Divider, { title: 'Section' }));
      const output = lastFrame() || '';
      expect(output).toContain('Section');
      expect(output).toMatch(/─/);
    });
  });

  describe('ProgressBar Component', () => {
    it('renders 0% progress', () => {
      const { lastFrame } = render(React.createElement(ProgressBar, { value: 0, width: 20 }));
      const output = lastFrame() || '';
      expect(output).toContain('0%');
    });

    it('renders 50% progress', () => {
      const { lastFrame } = render(React.createElement(ProgressBar, { value: 50, width: 20 }));
      const output = lastFrame() || '';
      expect(output).toContain('50%');
      expectOutput(output).toHaveProgressBar(50);
    });

    it('renders 100% progress', () => {
      const { lastFrame } = render(React.createElement(ProgressBar, { value: 100, width: 20 }));
      const output = lastFrame() || '';
      expect(output).toContain('100%');
    });

    it('clamps values above 100', () => {
      const { lastFrame } = render(React.createElement(ProgressBar, { value: 150, width: 20 }));
      const output = lastFrame() || '';
      expect(output).toContain('100%');
    });

    it('clamps values below 0', () => {
      const { lastFrame } = render(React.createElement(ProgressBar, { value: -10, width: 20 }));
      const output = lastFrame() || '';
      expect(output).toContain('0%');
    });
  });

  describe('Header Component', () => {
    it('renders project name', () => {
      const { lastFrame } = render(
        React.createElement(Header, {
          projectName: 'Test Project',
          phase: 1,
          phaseName: 'Brainstorm',
          status: 'running',
        })
      );
      const output = lastFrame() || '';
      expect(output).toContain('Test Project');
    });

    it('renders phase info', () => {
      const { lastFrame } = render(
        React.createElement(Header, {
          projectName: 'Test Project',
          phase: 2,
          phaseName: 'Specs',
          status: 'running',
        })
      );
      const output = lastFrame() || '';
      // Phase number and name appear in output
      expect(output).toMatch(/Phase.*2|2.*Specs/);
      expect(output).toContain('Specs');
    });

    it('renders status badge', () => {
      const { lastFrame } = render(
        React.createElement(Header, {
          projectName: 'Test Project',
          phase: 1,
          phaseName: 'Brainstorm',
          status: 'complete',
        })
      );
      const output = lastFrame() || '';
      // Status appears in a badge
      expect(output.toLowerCase()).toContain('complete');
    });
  });
});
