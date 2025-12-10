/**
 * todo.test.js - Unit tests for todo tracking functions
 *
 * Tests: US-TODO-001 to US-TODO-006
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const {
  parseTodoStats,
  areTodosComplete,
  getCompletionPercentage,
  getWorkerTodoFilePath
} = require('../../lib/dashboard-core.cjs');

// Load fixture
const sampleTodos = require('../fixtures/sample-todos.json');

describe('Todo List Tracking (US-TODO)', () => {

  // US-TODO-001: Todo File Discovery
  describe('US-TODO-001: Todo File Discovery', () => {
    it('should generate correct todo file path', () => {
      const sessionId = 'abc-123-def';
      const todosDir = '/home/user/.claude/todos';
      const result = getWorkerTodoFilePath(sessionId, todosDir);
      assert.strictEqual(result, path.join(todosDir, 'abc-123-def-agent-abc-123-def.json'));
    });

    it('should return null for missing session ID', () => {
      const result = getWorkerTodoFilePath(null, '/some/path');
      assert.strictEqual(result, null);
    });

    it('should return null for missing todos dir', () => {
      const result = getWorkerTodoFilePath('session-id', null);
      assert.strictEqual(result, null);
    });
  });

  // US-TODO-002: Todo Parsing
  describe('US-TODO-002: Todo Parsing', () => {
    it('should parse todo stats correctly', () => {
      const stats = parseTodoStats(sampleTodos);
      assert.strictEqual(stats.total, 5);
      assert.strictEqual(stats.completed, 2);
      assert.strictEqual(stats.inProgress, 1);
      assert.strictEqual(stats.pending, 2);
    });

    it('should return items with content and status', () => {
      const stats = parseTodoStats(sampleTodos);
      assert.strictEqual(stats.items.length, 5);
      assert.strictEqual(stats.items[0].content, 'Set up project structure');
      assert.strictEqual(stats.items[0].status, 'completed');
    });

    it('should handle empty array', () => {
      const stats = parseTodoStats([]);
      assert.strictEqual(stats.total, 0);
      assert.strictEqual(stats.completed, 0);
      assert.strictEqual(stats.items.length, 0);
    });

    it('should handle null/undefined', () => {
      const stats1 = parseTodoStats(null);
      assert.strictEqual(stats1.total, 0);

      const stats2 = parseTodoStats(undefined);
      assert.strictEqual(stats2.total, 0);
    });

    it('should handle malformed items gracefully', () => {
      const malformed = [
        { content: 'Valid', status: 'pending' },
        { status: 'completed' }, // Missing content
        { content: 'No status' }, // Missing status
        null,
        undefined
      ];
      const stats = parseTodoStats(malformed);
      assert.strictEqual(stats.total, 5);
      assert.strictEqual(stats.items.length, 5);
    });
  });

  // US-TODO-003: Todo Status Tracking
  describe('US-TODO-003: Status Tracking', () => {
    it('should correctly count pending items', () => {
      const todos = [
        { content: 'A', status: 'pending' },
        { content: 'B', status: 'pending' },
        { content: 'C', status: 'completed' }
      ];
      const stats = parseTodoStats(todos);
      assert.strictEqual(stats.pending, 2);
    });

    it('should correctly count in_progress items', () => {
      const todos = [
        { content: 'A', status: 'in_progress' },
        { content: 'B', status: 'completed' }
      ];
      const stats = parseTodoStats(todos);
      assert.strictEqual(stats.inProgress, 1);
    });

    it('should correctly count completed items', () => {
      const todos = [
        { content: 'A', status: 'completed' },
        { content: 'B', status: 'completed' },
        { content: 'C', status: 'pending' }
      ];
      const stats = parseTodoStats(todos);
      assert.strictEqual(stats.completed, 2);
    });
  });

  // US-TODO-004: Completion Detection
  describe('US-TODO-004: Completion Detection', () => {
    it('should detect when all todos are complete', () => {
      const todos = [
        { content: 'A', status: 'completed' },
        { content: 'B', status: 'completed' }
      ];
      const stats = parseTodoStats(todos);
      assert.strictEqual(areTodosComplete(stats), true);
    });

    it('should detect when not all todos are complete', () => {
      const todos = [
        { content: 'A', status: 'completed' },
        { content: 'B', status: 'pending' }
      ];
      const stats = parseTodoStats(todos);
      assert.strictEqual(areTodosComplete(stats), false);
    });

    it('should return false for empty todos', () => {
      const stats = parseTodoStats([]);
      assert.strictEqual(areTodosComplete(stats), false);
    });
  });

  // US-TODO-005: Completion Percentage
  describe('US-TODO-005: Completion Percentage', () => {
    it('should calculate 0% for no completed todos', () => {
      const stats = { total: 5, completed: 0 };
      assert.strictEqual(getCompletionPercentage(stats), 0);
    });

    it('should calculate 100% for all completed todos', () => {
      const stats = { total: 5, completed: 5 };
      assert.strictEqual(getCompletionPercentage(stats), 100);
    });

    it('should calculate 50% for half completed', () => {
      const stats = { total: 10, completed: 5 };
      assert.strictEqual(getCompletionPercentage(stats), 50);
    });

    it('should round to nearest integer', () => {
      const stats = { total: 3, completed: 1 };
      assert.strictEqual(getCompletionPercentage(stats), 33); // 33.33% -> 33%
    });

    it('should return 0 for empty todos', () => {
      const stats = { total: 0, completed: 0 };
      assert.strictEqual(getCompletionPercentage(stats), 0);
    });
  });

  // US-TODO-006: Sample Fixture Test
  describe('US-TODO-006: Fixture Integration', () => {
    it('should correctly process sample-todos.json fixture', () => {
      const stats = parseTodoStats(sampleTodos);

      // Expected from fixture:
      // - 2 completed
      // - 1 in_progress
      // - 2 pending
      assert.strictEqual(stats.completed, 2);
      assert.strictEqual(stats.inProgress, 1);
      assert.strictEqual(stats.pending, 2);
      assert.strictEqual(getCompletionPercentage(stats), 40); // 2/5 = 40%
    });
  });

});
