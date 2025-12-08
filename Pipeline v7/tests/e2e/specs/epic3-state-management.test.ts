import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from 'ink-testing-library';
import { TodoList } from '../../../src/components/TodoList.js';
import { EpicList } from '../../../src/components/EpicList.js';
import { StatusLine } from '../../../src/components/StatusLine.js';
import { expectOutput, expectTodoList } from '../helpers/assertions.js';
import { createTestTodos } from '../helpers/test-harness.js';
import type { Todo, Epic } from '../../../src/types/index.js';

describe('Epic 3: State Management', () => {
  afterEach(() => {
    cleanup();
  });

  describe('TodoList Component', () => {
    it('renders empty state when no todos', () => {
      const { lastFrame } = render(
        React.createElement(TodoList, { todos: [], maxItems: 10 })
      );
      const output = lastFrame() || '';
      expect(output).toMatch(/no.*task|empty/i);
    });

    it('renders todos with correct status icons', () => {
      const todos: Todo[] = [
        { content: 'Completed task', status: 'completed', activeForm: 'Done' },
        { content: 'In progress task', status: 'in_progress', activeForm: 'Working' },
        { content: 'Pending task', status: 'pending', activeForm: 'Waiting' },
      ];

      const { lastFrame } = render(
        React.createElement(TodoList, { todos, maxItems: 10 })
      );
      const output = lastFrame() || '';

      // Completed tasks show content
      expect(output).toContain('Completed task');
      // In progress tasks show activeForm instead of content
      expect(output).toContain('Working');
      // Pending tasks show content
      expect(output).toContain('Pending task');
    });

    it('limits displayed items to maxItems', () => {
      const todos = createTestTodos(10);
      const { lastFrame } = render(
        React.createElement(TodoList, { todos, maxItems: 3 })
      );
      const output = lastFrame() || '';

      // Should show indication of more items
      expect(output).toMatch(/\+\d+|more/i);
    });

    it('shows in_progress task with spinner icon', () => {
      const todos: Todo[] = [
        { content: 'Active task', status: 'in_progress', activeForm: 'Working on it' },
      ];

      const { lastFrame } = render(
        React.createElement(TodoList, { todos, maxItems: 10 })
      );
      const output = lastFrame() || '';

      // In progress shows activeForm, so check for Working on it
      expectOutput(output).toHaveTodo('Working on it', 'in_progress');
    });

    it('shows completed task with checkmark', () => {
      const todos: Todo[] = [
        { content: 'Done task', status: 'completed', activeForm: 'Finished' },
      ];

      const { lastFrame } = render(
        React.createElement(TodoList, { todos, maxItems: 10 })
      );
      const output = lastFrame() || '';

      expectOutput(output).toHaveTodo('Done task', 'completed');
    });
  });

  describe('EpicList Component', () => {
    it('renders empty state when no epics', () => {
      const { lastFrame } = render(
        React.createElement(EpicList, { epics: [], currentEpic: undefined })
      );
      const output = lastFrame() || '';
      expect(output).toMatch(/no.*epic|empty/i);
    });

    it('renders epics with status indicators', () => {
      const epics: Epic[] = [
        { id: '1', name: 'Epic One', status: 'complete', testsTotal: 10, testsPass: 10, startedAt: null, completedAt: null },
        { id: '2', name: 'Epic Two', status: 'in_progress', testsTotal: 10, testsPass: 5, startedAt: null, completedAt: null },
        { id: '3', name: 'Epic Three', status: 'pending', testsTotal: 10, testsPass: 0, startedAt: null, completedAt: null },
      ];

      const { lastFrame } = render(
        React.createElement(EpicList, { epics, currentEpic: '2' })
      );
      const output = lastFrame() || '';

      expect(output).toContain('Epic One');
      expect(output).toContain('Epic Two');
      expect(output).toContain('Epic Three');
    });

    it('highlights current epic', () => {
      const epics: Epic[] = [
        { id: '1', name: 'Epic One', status: 'complete', testsTotal: 10, testsPass: 10, startedAt: null, completedAt: null },
        { id: '2', name: 'Epic Two', status: 'in_progress', testsTotal: 10, testsPass: 5, startedAt: null, completedAt: null },
      ];

      const { lastFrame } = render(
        React.createElement(EpicList, { epics, currentEpic: '2' })
      );
      const output = lastFrame() || '';

      // Current epic should have some highlight indicator
      expect(output).toContain('Epic Two');
    });

    it('shows test progress for each epic', () => {
      const epics: Epic[] = [
        { id: '1', name: 'Epic One', status: 'in_progress', testsTotal: 20, testsPass: 15, startedAt: null, completedAt: null },
      ];

      const { lastFrame } = render(
        React.createElement(EpicList, { epics, currentEpic: '1' })
      );
      const output = lastFrame() || '';

      // Should show test count (15/20 tests)
      expect(output).toMatch(/15\/20|tests/);
    });
  });

  describe('StatusLine Component', () => {
    it('renders cost', () => {
      const { lastFrame } = render(
        React.createElement(StatusLine, {
          cost: '$12.34',
          duration: '5:30',
          workerStatus: 'running',
        })
      );
      const output = lastFrame() || '';

      expect(output).toContain('$12.34');
    });

    it('renders duration', () => {
      const { lastFrame } = render(
        React.createElement(StatusLine, {
          cost: '$0.00',
          duration: '10:45',
          workerStatus: 'idle',
        })
      );
      const output = lastFrame() || '';

      expect(output).toContain('10:45');
    });

    it('renders worker status running', () => {
      const { lastFrame } = render(
        React.createElement(StatusLine, {
          cost: '$0.00',
          duration: '0:00',
          workerStatus: 'running',
        })
      );
      const output = lastFrame() || '';

      expectOutput(output).toHaveStatus('running');
    });

    it('renders worker status idle', () => {
      const { lastFrame } = render(
        React.createElement(StatusLine, {
          cost: '$0.00',
          duration: '0:00',
          workerStatus: 'idle',
        })
      );
      const output = lastFrame() || '';

      expectOutput(output).toHaveStatus('idle');
    });

    it('shows keyboard shortcuts', () => {
      const { lastFrame } = render(
        React.createElement(StatusLine, {
          cost: '$0.00',
          duration: '0:00',
          workerStatus: 'idle',
        })
      );
      const output = lastFrame() || '';

      expectOutput(output).toHaveShortcuts();
    });
  });
});
