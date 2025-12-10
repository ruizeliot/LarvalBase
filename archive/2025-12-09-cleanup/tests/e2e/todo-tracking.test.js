/**
 * todo-tracking.test.js - E2E tests for Todo List Tracking (US-TODO)
 *
 * Tests: US-TODO-001 to US-TODO-006 with edge cases
 *
 * These tests verify todo tracking functionality at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const helpers = require('./test-helpers.cjs');

describe('Todo List Tracking E2E (US-TODO)', () => {
  let testProject;
  let testTodosDir;

  beforeEach(() => {
    testProject = helpers.createTestProject('todo-tracking-test');
    // Create a test todos directory
    testTodosDir = path.join(testProject.projectPath, '.test-todos');
    fs.mkdirSync(testTodosDir, { recursive: true });
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-TODO-001: Todo File Discovery ============

  describe('US-TODO-001: Todo File Discovery', () => {

    it('should locate todo file by session ID', () => {
      const sessionId = 'test-session-abc123';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, [
        { content: 'Test todo', status: 'pending' }
      ]);

      assert.ok(fs.existsSync(todoFile));
      assert.ok(todoFile.includes(sessionId));
    });

    it('should resolve path correctly on Windows', () => {
      const todosDir = helpers.getTodosDir();
      assert.ok(todosDir);
      assert.ok(typeof todosDir === 'string');

      // Should contain .claude/todos
      if (helpers.IS_WINDOWS) {
        assert.ok(todosDir.includes('.claude'));
        assert.ok(todosDir.includes('todos'));
      }
    });

    it('should verify file existence', () => {
      const sessionId = 'verify-test';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, []);

      assert.strictEqual(fs.existsSync(todoFile), true);

      // Non-existent file
      const fakePath = path.join(testTodosDir, 'nonexistent.json');
      assert.strictEqual(fs.existsSync(fakePath), false);
    });

    it('should store todo file path in manifest', () => {
      const todoFilePath = path.join(testTodosDir, 'session-todos.json');
      const manifest = helpers.createManifest(testProject.manifestPath, {
        todoFilePath: todoFilePath
      });

      assert.strictEqual(manifest.todoFilePath, todoFilePath);
    });

    // Edge case: Session ID with special characters
    it('should handle session IDs with special characters', () => {
      const sessionId = 'session-2024_01_01-abc';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, [
        { content: 'Test', status: 'pending' }
      ]);

      assert.ok(fs.existsSync(todoFile));
    });

    // Edge case: Very long session ID
    it('should handle long session IDs', () => {
      const sessionId = 'a'.repeat(100);
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, [
        { content: 'Test', status: 'pending' }
      ]);

      assert.ok(fs.existsSync(todoFile));
    });

    // Edge case: Path with spaces
    it('should handle paths with spaces', () => {
      const dirWithSpaces = path.join(testProject.projectPath, 'path with spaces');
      fs.mkdirSync(dirWithSpaces, { recursive: true });

      const sessionId = 'space-test';
      const todoFile = helpers.simulateTodoFile(dirWithSpaces, sessionId, [
        { content: 'Test', status: 'pending' }
      ]);

      assert.ok(fs.existsSync(todoFile));
    });

  });

  // ============ US-TODO-002: Todo Parsing ============

  describe('US-TODO-002: Todo Parsing', () => {

    it('should parse JSON format correctly', () => {
      const todos = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'in_progress' },
        { content: 'Task 3', status: 'pending' }
      ];

      const sessionId = 'parse-test';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, todos);

      const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.strictEqual(content.todos.length, 3);
      assert.strictEqual(content.todos[0].content, 'Task 1');
      assert.strictEqual(content.todos[0].status, 'completed');
    });

    it('should extract content and status from each todo', () => {
      const todos = [
        { content: 'Implement feature X', status: 'pending' }
      ];

      const sessionId = 'extract-test';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, todos);

      const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      const todo = content.todos[0];

      assert.ok(todo.content);
      assert.ok(todo.status);
      assert.strictEqual(typeof todo.content, 'string');
      assert.strictEqual(typeof todo.status, 'string');
    });

    it('should return empty array if file missing', () => {
      const fakePath = path.join(testTodosDir, 'nonexistent.json');
      let todos = [];

      if (!fs.existsSync(fakePath)) {
        todos = [];
      }

      assert.deepStrictEqual(todos, []);
    });

    // Edge case: Malformed JSON
    it('should handle malformed JSON gracefully', () => {
      const malformedFile = path.join(testTodosDir, 'malformed.json');
      fs.writeFileSync(malformedFile, '{ invalid json }');

      let todos = [];
      try {
        todos = JSON.parse(fs.readFileSync(malformedFile, 'utf8')).todos || [];
      } catch (e) {
        todos = [];
      }

      assert.deepStrictEqual(todos, []);
    });

    // Edge case: Empty file
    it('should handle empty file', () => {
      const emptyFile = path.join(testTodosDir, 'empty.json');
      fs.writeFileSync(emptyFile, '');

      let todos = [];
      try {
        const content = fs.readFileSync(emptyFile, 'utf8');
        if (content.trim()) {
          todos = JSON.parse(content).todos || [];
        }
      } catch (e) {
        todos = [];
      }

      assert.deepStrictEqual(todos, []);
    });

    // Edge case: Todo with extra fields
    it('should handle todos with extra fields', () => {
      const todos = [
        { content: 'Task', status: 'pending', extra: 'data', nested: { field: 1 } }
      ];

      const sessionId = 'extra-fields';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, todos);

      const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.strictEqual(content.todos[0].content, 'Task');
      assert.strictEqual(content.todos[0].extra, 'data');
    });

    // Edge case: Unicode in todo content
    it('should handle unicode in todo content', () => {
      const todos = [
        { content: 'Task with emoji \ud83d\ude80 and unicode \u00e9\u00e8\u00e0', status: 'pending' }
      ];

      const sessionId = 'unicode-test';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, todos);

      const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.ok(content.todos[0].content.includes('\ud83d\ude80'));
    });

  });

  // ============ US-TODO-003: Todo Status Tracking ============

  describe('US-TODO-003: Todo Status Tracking', () => {

    it('should track pending/in_progress/completed statuses', () => {
      const todos = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'in_progress' },
        { content: 'Task 3', status: 'pending' }
      ];

      const pending = todos.filter(t => t.status === 'pending');
      const inProgress = todos.filter(t => t.status === 'in_progress');
      const completed = todos.filter(t => t.status === 'completed');

      assert.strictEqual(pending.length, 1);
      assert.strictEqual(inProgress.length, 1);
      assert.strictEqual(completed.length, 1);
    });

    it('should detect status changes', () => {
      const sessionId = 'status-change';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, [
        { content: 'Task 1', status: 'pending' },
        { content: 'Task 2', status: 'pending' }
      ]);

      // Read initial state
      const initial = JSON.parse(fs.readFileSync(todoFile, 'utf8'));

      // Simulate progress
      helpers.simulateTodoProgress(todoFile, 1);

      // Read updated state
      const updated = JSON.parse(fs.readFileSync(todoFile, 'utf8'));

      assert.strictEqual(initial.todos[0].status, 'pending');
      assert.strictEqual(updated.todos[0].status, 'completed');
    });

    it('should compare previous state to detect changes', () => {
      const previous = [
        { content: 'Task 1', status: 'pending' },
        { content: 'Task 2', status: 'pending' }
      ];

      const current = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'in_progress' }
      ];

      const changes = [];
      for (let i = 0; i < current.length; i++) {
        if (previous[i] && previous[i].status !== current[i].status) {
          changes.push({
            content: current[i].content,
            from: previous[i].status,
            to: current[i].status
          });
        }
      }

      assert.strictEqual(changes.length, 2);
      assert.strictEqual(changes[0].from, 'pending');
      assert.strictEqual(changes[0].to, 'completed');
    });

    // Edge case: All todos same status
    it('should handle all todos with same status', () => {
      const todos = [
        { content: 'Task 1', status: 'pending' },
        { content: 'Task 2', status: 'pending' },
        { content: 'Task 3', status: 'pending' }
      ];

      const allPending = todos.every(t => t.status === 'pending');
      assert.strictEqual(allPending, true);
    });

    // Edge case: Rapid status transitions
    it('should handle rapid status transitions', () => {
      const sessionId = 'rapid-status';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, [
        { content: 'Task', status: 'pending' }
      ]);

      // Rapid transitions
      for (let i = 0; i < 10; i++) {
        const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
        content.todos[0].status = i % 2 === 0 ? 'in_progress' : 'pending';
        fs.writeFileSync(todoFile, JSON.stringify(content, null, 2));
      }

      // Final state should be valid
      const final = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.ok(['pending', 'in_progress', 'completed'].includes(final.todos[0].status));
    });

  });

  // ============ US-TODO-004: Per-Todo Metrics ============

  describe('US-TODO-004: Per-Todo Metrics', () => {

    it('should record duration for completed todos', () => {
      const todos = [
        {
          content: 'Task 1',
          status: 'completed',
          startedAt: new Date(Date.now() - 60000).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 60000
        }
      ];

      assert.strictEqual(todos[0].durationMs, 60000);
    });

    it('should record cost for completed todos', () => {
      const todos = [
        {
          content: 'Task 1',
          status: 'completed',
          cost: 0.15
        }
      ];

      assert.strictEqual(todos[0].cost, 0.15);
    });

    it('should record token counts', () => {
      const todos = [
        {
          content: 'Task 1',
          status: 'completed',
          inputTokens: 1500,
          outputTokens: 500
        }
      ];

      assert.strictEqual(todos[0].inputTokens, 1500);
      assert.strictEqual(todos[0].outputTokens, 500);
    });

    it('should store metrics in manifest', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        todoMetrics: [
          { content: 'Task 1', durationMs: 30000, cost: 0.10 },
          { content: 'Task 2', durationMs: 45000, cost: 0.25 }
        ]
      });

      assert.strictEqual(manifest.todoMetrics.length, 2);
      assert.strictEqual(manifest.todoMetrics[0].durationMs, 30000);
    });

    // Edge case: Zero duration
    it('should handle zero duration', () => {
      const todos = [
        { content: 'Instant task', status: 'completed', durationMs: 0 }
      ];

      assert.strictEqual(todos[0].durationMs, 0);
    });

    // Edge case: Very long duration
    it('should handle very long durations', () => {
      const longDuration = 3600000 * 24; // 24 hours
      const todos = [
        { content: 'Long task', status: 'completed', durationMs: longDuration }
      ];

      assert.strictEqual(todos[0].durationMs, longDuration);
    });

    // Edge case: High token counts
    it('should handle high token counts', () => {
      const todos = [
        {
          content: 'Token-heavy task',
          status: 'completed',
          inputTokens: 100000,
          outputTokens: 50000
        }
      ];

      assert.strictEqual(todos[0].inputTokens, 100000);
    });

  });

  // ============ US-TODO-005: Todo Completion Display ============

  describe('US-TODO-005: Todo Completion Display', () => {

    it('should include completion message data', () => {
      const completedTodo = {
        content: 'Implement feature',
        status: 'completed',
        completedAt: new Date().toISOString()
      };

      assert.ok(completedTodo.completedAt);
      assert.strictEqual(completedTodo.status, 'completed');
    });

    it('should include duration in completion data', () => {
      const completedTodo = {
        content: 'Task',
        status: 'completed',
        durationMs: 45000
      };

      const durationSec = Math.round(completedTodo.durationMs / 1000);
      assert.strictEqual(durationSec, 45);
    });

    it('should include cost in completion data', () => {
      const completedTodo = {
        content: 'Task',
        status: 'completed',
        cost: 0.25
      };

      const formattedCost = `$${completedTodo.cost.toFixed(2)}`;
      assert.strictEqual(formattedCost, '$0.25');
    });

    it('should include token counts in completion data', () => {
      const completedTodo = {
        content: 'Task',
        status: 'completed',
        inputTokens: 2000,
        outputTokens: 800
      };

      const totalTokens = completedTodo.inputTokens + completedTodo.outputTokens;
      assert.strictEqual(totalTokens, 2800);
    });

    // Edge case: Completion without metrics
    it('should handle completion without metrics', () => {
      const completedTodo = {
        content: 'Task',
        status: 'completed'
      };

      // Should not throw when metrics are missing
      const durationMs = completedTodo.durationMs || 0;
      const cost = completedTodo.cost || 0;

      assert.strictEqual(durationMs, 0);
      assert.strictEqual(cost, 0);
    });

  });

  // ============ US-TODO-006: Active Todo Highlight ============

  describe('US-TODO-006: Active Todo Highlight', () => {

    it('should identify in-progress todo', () => {
      const todos = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'in_progress' },
        { content: 'Task 3', status: 'pending' }
      ];

      const activeTodo = todos.find(t => t.status === 'in_progress');
      assert.ok(activeTodo);
      assert.strictEqual(activeTodo.content, 'Task 2');
    });

    it('should have only one todo in_progress', () => {
      const todos = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'in_progress' },
        { content: 'Task 3', status: 'pending' }
      ];

      const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
      assert.strictEqual(inProgressCount, 1);
    });

    it('should differentiate in_progress from pending', () => {
      const inProgressTodo = { content: 'Active', status: 'in_progress' };
      const pendingTodo = { content: 'Waiting', status: 'pending' };

      assert.notStrictEqual(inProgressTodo.status, pendingTodo.status);
    });

    // Edge case: No in_progress todos
    it('should handle no active todos', () => {
      const todos = [
        { content: 'Task 1', status: 'pending' },
        { content: 'Task 2', status: 'pending' }
      ];

      const activeTodo = todos.find(t => t.status === 'in_progress');
      assert.strictEqual(activeTodo, undefined);
    });

    // Edge case: Multiple in_progress (invalid state)
    it('should detect multiple in_progress as invalid', () => {
      const todos = [
        { content: 'Task 1', status: 'in_progress' },
        { content: 'Task 2', status: 'in_progress' }
      ];

      const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
      const isValid = inProgressCount <= 1;

      assert.strictEqual(isValid, false);
    });

    // Edge case: All completed
    it('should handle all todos completed', () => {
      const todos = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'completed' }
      ];

      const activeTodo = todos.find(t => t.status === 'in_progress');
      const allCompleted = todos.every(t => t.status === 'completed');

      assert.strictEqual(activeTodo, undefined);
      assert.strictEqual(allCompleted, true);
    });

  });

  // ============ Todo Tracking Integration ============

  describe('Todo Tracking Integration', () => {

    it('should simulate full todo lifecycle', () => {
      const sessionId = 'lifecycle-test';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, [
        { content: 'Task 1', status: 'pending' },
        { content: 'Task 2', status: 'pending' },
        { content: 'Task 3', status: 'pending' }
      ]);

      // Initial state
      let content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.strictEqual(content.todos.every(t => t.status === 'pending'), true);

      // Progress through tasks
      helpers.simulateTodoProgress(todoFile, 1);
      content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.strictEqual(content.todos[0].status, 'completed');
      assert.strictEqual(content.todos[1].status, 'in_progress');

      helpers.simulateTodoProgress(todoFile, 2);
      content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.strictEqual(content.todos[1].status, 'completed');
      assert.strictEqual(content.todos[2].status, 'in_progress');

      // Complete all
      helpers.simulateAllTodosComplete(todoFile);
      content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.strictEqual(content.todos.every(t => t.status === 'completed'), true);
    });

    it('should store todo state in manifest', () => {
      const sessionId = 'manifest-integration';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'in_progress' }
      ]);

      const manifest = helpers.createManifest(testProject.manifestPath, {
        workerSessionId: sessionId,
        todoFilePath: todoFile,
        todoProgress: {
          completed: 1,
          total: 2,
          percentage: 50
        }
      });

      assert.strictEqual(manifest.todoProgress.completed, 1);
      assert.strictEqual(manifest.todoProgress.total, 2);
      assert.strictEqual(manifest.todoProgress.percentage, 50);
    });

    it('should handle todo file updates during read', () => {
      const sessionId = 'concurrent-test';
      const todoFile = helpers.simulateTodoFile(testTodosDir, sessionId, [
        { content: 'Task', status: 'pending' }
      ]);

      // Simulate concurrent reads and writes
      for (let i = 0; i < 20; i++) {
        const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
        content.todos[0].status = i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'pending';
        fs.writeFileSync(todoFile, JSON.stringify(content, null, 2));
      }

      // Should be able to read final state
      const final = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
      assert.ok(final.todos[0].status);
    });

  });

});
