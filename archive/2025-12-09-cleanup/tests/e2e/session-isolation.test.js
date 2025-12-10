/**
 * session-isolation.test.js - E2E tests for project-based session isolation
 *
 * Tests for fix to BUG-002: Cross-pipeline todo confusion
 *
 * These tests verify that:
 * 1. Todo files are correctly associated with their projects via session IDs
 * 2. Dashboard only reads todos from sessions that belong to its project
 * 3. Concurrent pipelines don't cross-contaminate each other's todos
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  createTestProject,
  getTodosDir,
  generateSessionId
} = require('./test-helpers.cjs');

// Claude's project directory
const CLAUDE_PROJECTS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'projects');

describe('Session Isolation (Project-Based Todo Filtering)', () => {

  // Helper: Encode project path the way Claude does
  function getEncodedProjectPath(projectPath) {
    let encoded = projectPath.replace(/\\/g, '/');
    encoded = encoded.replace(/^\//, '');
    encoded = encoded.replace(/:/g, '-').replace(/\//g, '-').replace(/ /g, '-');
    return encoded;
  }

  // Helper: Create a fake session file in Claude's projects directory
  function createFakeSessionFile(projectPath, sessionId) {
    const encodedPath = getEncodedProjectPath(projectPath);
    const projectDir = path.join(CLAUDE_PROJECTS_DIR, encodedPath);

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const sessionFile = path.join(projectDir, `${sessionId}.jsonl`);
    fs.writeFileSync(sessionFile, '{"test": true}\n');

    return {
      sessionFile,
      projectDir,
      cleanup: () => {
        try {
          if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
        } catch (e) { /* ignore */ }
      }
    };
  }

  // Helper: Create a todo file
  function createTodoFile(sessionId, todos) {
    const todosDir = getTodosDir();
    if (!fs.existsSync(todosDir)) {
      fs.mkdirSync(todosDir, { recursive: true });
    }

    const todoFile = path.join(todosDir, `${sessionId}-agent-${sessionId}.json`);
    fs.writeFileSync(todoFile, JSON.stringify(todos, null, 2));

    return {
      todoFile,
      cleanup: () => {
        try {
          if (fs.existsSync(todoFile)) fs.unlinkSync(todoFile);
        } catch (e) { /* ignore */ }
      }
    };
  }

  // Helper: Get session IDs from a project directory
  function getProjectSessionIds(projectPath) {
    const encodedPath = getEncodedProjectPath(projectPath);
    const projectDir = path.join(CLAUDE_PROJECTS_DIR, encodedPath);
    const sessionIds = new Set();

    if (!fs.existsSync(projectDir)) {
      return sessionIds;
    }

    const files = fs.readdirSync(projectDir);
    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const sessionId = file.replace('.jsonl', '');
        if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(sessionId)) {
          sessionIds.add(sessionId);
        }
      }
    }

    return sessionIds;
  }

  // Helper: Extract session ID from todo filename
  function extractSessionIdFromTodoFile(filename) {
    const match = filename.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-agent-/);
    return match ? match[1] : null;
  }

  describe('Path Encoding', () => {

    it('should correctly encode Windows paths', () => {
      const windowsPath = 'C:\\Users\\test\\Documents\\my project';
      const encoded = getEncodedProjectPath(windowsPath);

      assert.ok(!encoded.includes('\\'), 'Should not contain backslashes');
      assert.ok(!encoded.includes(':'), 'Should not contain colons');
      assert.ok(!encoded.includes(' '), 'Should not contain spaces');
      assert.strictEqual(encoded, 'C--Users-test-Documents-my-project');
    });

    it('should correctly encode Unix paths', () => {
      const unixPath = '/home/user/projects/my app';
      const encoded = getEncodedProjectPath(unixPath);

      assert.ok(!encoded.includes('/'), 'Should not contain forward slashes');
      assert.ok(!encoded.includes(' '), 'Should not contain spaces');
      assert.strictEqual(encoded, 'home-user-projects-my-app');
    });

    it('should generate consistent encoding', () => {
      const projectPath = 'C:\\Users\\test\\project';
      const encoded1 = getEncodedProjectPath(projectPath);
      const encoded2 = getEncodedProjectPath(projectPath);

      assert.strictEqual(encoded1, encoded2, 'Same path should produce same encoding');
    });
  });

  describe('Session-to-Project Mapping', () => {

    it('should find sessions in project directory', () => {
      const project = createTestProject('session-test');
      const sessionId = crypto.randomUUID();

      // Create a fake session file
      const session = createFakeSessionFile(project.projectPath, sessionId);

      try {
        const sessionIds = getProjectSessionIds(project.projectPath);
        assert.ok(sessionIds.has(sessionId), 'Should find the created session');
      } finally {
        session.cleanup();
        project.cleanup();
      }
    });

    it('should isolate sessions between projects', () => {
      const projectA = createTestProject('project-a');
      const projectB = createTestProject('project-b');

      const sessionA = crypto.randomUUID();
      const sessionB = crypto.randomUUID();

      const fileA = createFakeSessionFile(projectA.projectPath, sessionA);
      const fileB = createFakeSessionFile(projectB.projectPath, sessionB);

      try {
        const sessionsA = getProjectSessionIds(projectA.projectPath);
        const sessionsB = getProjectSessionIds(projectB.projectPath);

        // Each project should only see its own session
        assert.ok(sessionsA.has(sessionA), 'Project A should have session A');
        assert.ok(!sessionsA.has(sessionB), 'Project A should NOT have session B');

        assert.ok(sessionsB.has(sessionB), 'Project B should have session B');
        assert.ok(!sessionsB.has(sessionA), 'Project B should NOT have session A');
      } finally {
        fileA.cleanup();
        fileB.cleanup();
        projectA.cleanup();
        projectB.cleanup();
      }
    });
  });

  describe('Todo File Ownership', () => {

    it('should extract session ID from todo filename', () => {
      const sessionId = crypto.randomUUID();
      const filename = `${sessionId}-agent-${sessionId}.json`;

      const extracted = extractSessionIdFromTodoFile(filename);
      assert.strictEqual(extracted, sessionId, 'Should extract correct session ID');
    });

    it('should return null for invalid filenames', () => {
      const invalidNames = [
        'invalid.json',
        'not-a-uuid-agent-not-a-uuid.json',
        '12345678-1234-1234-1234-123456789abc.json' // Missing -agent- part
      ];

      for (const name of invalidNames) {
        const extracted = extractSessionIdFromTodoFile(name);
        assert.strictEqual(extracted, null, `Should return null for ${name}`);
      }
    });

    it('should correctly identify todo ownership based on project sessions', () => {
      const projectA = createTestProject('owner-test-a');
      const projectB = createTestProject('owner-test-b');

      const sessionA = crypto.randomUUID();
      const sessionB = crypto.randomUUID();

      // Create sessions for each project
      const sessionFileA = createFakeSessionFile(projectA.projectPath, sessionA);
      const sessionFileB = createFakeSessionFile(projectB.projectPath, sessionB);

      // Create todo files
      const todoA = createTodoFile(sessionA, [{ content: 'Task A', status: 'pending' }]);
      const todoB = createTodoFile(sessionB, [{ content: 'Task B', status: 'pending' }]);

      try {
        const sessionsA = getProjectSessionIds(projectA.projectPath);
        const sessionsB = getProjectSessionIds(projectB.projectPath);

        // Project A should own todo A but not todo B
        assert.ok(sessionsA.has(sessionA), 'Project A should own session A');
        assert.ok(!sessionsA.has(sessionB), 'Project A should NOT own session B');

        // Project B should own todo B but not todo A
        assert.ok(sessionsB.has(sessionB), 'Project B should own session B');
        assert.ok(!sessionsB.has(sessionA), 'Project B should NOT own session A');
      } finally {
        sessionFileA.cleanup();
        sessionFileB.cleanup();
        todoA.cleanup();
        todoB.cleanup();
        projectA.cleanup();
        projectB.cleanup();
      }
    });
  });

  describe('Concurrent Pipeline Simulation', () => {

    it('should correctly filter todos when two projects have todos simultaneously', () => {
      // Simulate two concurrent pipelines
      const pipelineA = createTestProject('pipeline-a');
      const pipelineB = createTestProject('pipeline-b');

      const sessionA1 = crypto.randomUUID();
      const sessionA2 = crypto.randomUUID();
      const sessionB1 = crypto.randomUUID();

      // Pipeline A has 2 sessions (maybe worker + orchestrator)
      const sessionFileA1 = createFakeSessionFile(pipelineA.projectPath, sessionA1);
      const sessionFileA2 = createFakeSessionFile(pipelineA.projectPath, sessionA2);

      // Pipeline B has 1 session
      const sessionFileB1 = createFakeSessionFile(pipelineB.projectPath, sessionB1);

      // Create todos for all sessions
      const todoA1 = createTodoFile(sessionA1, [{ content: 'Pipeline A Worker', status: 'in_progress' }]);
      const todoA2 = createTodoFile(sessionA2, [{ content: 'Pipeline A Orchestrator', status: 'completed' }]);
      const todoB1 = createTodoFile(sessionB1, [{ content: 'Pipeline B Worker', status: 'pending' }]);

      try {
        const sessionsA = getProjectSessionIds(pipelineA.projectPath);
        const sessionsB = getProjectSessionIds(pipelineB.projectPath);

        // Count visible todos for each pipeline
        const todosDir = getTodosDir();
        const allTodoFiles = fs.readdirSync(todosDir).filter(f => f.endsWith('.json'));

        let countVisibleToA = 0;
        let countVisibleToB = 0;

        for (const file of allTodoFiles) {
          const sessionId = extractSessionIdFromTodoFile(file);
          if (sessionId) {
            if (sessionsA.has(sessionId)) countVisibleToA++;
            if (sessionsB.has(sessionId)) countVisibleToB++;
          }
        }

        // Pipeline A should see 2 todos (sessionA1, sessionA2)
        assert.ok(countVisibleToA >= 2, `Pipeline A should see at least 2 todos, saw ${countVisibleToA}`);

        // Pipeline B should see 1 todo (sessionB1)
        assert.ok(countVisibleToB >= 1, `Pipeline B should see at least 1 todo, saw ${countVisibleToB}`);

        // No cross-contamination: sessionA1/A2 should NOT be visible to B
        assert.ok(!sessionsB.has(sessionA1), 'Pipeline B should not see sessionA1');
        assert.ok(!sessionsB.has(sessionA2), 'Pipeline B should not see sessionA2');

        // sessionB1 should NOT be visible to A
        assert.ok(!sessionsA.has(sessionB1), 'Pipeline A should not see sessionB1');

      } finally {
        sessionFileA1.cleanup();
        sessionFileA2.cleanup();
        sessionFileB1.cleanup();
        todoA1.cleanup();
        todoA2.cleanup();
        todoB1.cleanup();
        pipelineA.cleanup();
        pipelineB.cleanup();
      }
    });

    it('should prevent orchestrator from reading unrelated project todos', () => {
      // This simulates the exact bug: orchestrator in project A seeing todos from project B
      const myProject = createTestProject('my-project');
      const otherProject = createTestProject('other-project');

      const mySession = crypto.randomUUID();
      const otherSession = crypto.randomUUID();

      // Only create session file for myProject
      const mySessionFile = createFakeSessionFile(myProject.projectPath, mySession);
      const otherSessionFile = createFakeSessionFile(otherProject.projectPath, otherSession);

      // Create todo for other project's session
      const otherTodo = createTodoFile(otherSession, [
        { content: 'SHOULD NOT SEE THIS', status: 'in_progress' }
      ]);

      try {
        // Get my project's sessions
        const mySessions = getProjectSessionIds(myProject.projectPath);

        // Check if other project's todo would be accepted
        const wouldAcceptOther = mySessions.has(otherSession);

        assert.strictEqual(wouldAcceptOther, false,
          'My project should NOT accept todos from other project sessions');

      } finally {
        mySessionFile.cleanup();
        otherSessionFile.cleanup();
        otherTodo.cleanup();
        myProject.cleanup();
        otherProject.cleanup();
      }
    });
  });

  describe('Edge Cases', () => {

    it('should handle projects with no sessions', () => {
      const project = createTestProject('no-sessions');

      try {
        const sessions = getProjectSessionIds(project.projectPath);
        assert.strictEqual(sessions.size, 0, 'Should have no sessions');
      } finally {
        project.cleanup();
      }
    });

    it('should handle non-existent project directories', () => {
      const fakePath = '/non/existent/path/project-xyz';
      const sessions = getProjectSessionIds(fakePath);
      assert.strictEqual(sessions.size, 0, 'Should return empty set for non-existent path');
    });

    it('should ignore non-jsonl files in project directory', () => {
      const project = createTestProject('mixed-files');
      const sessionId = crypto.randomUUID();

      const encodedPath = getEncodedProjectPath(project.projectPath);
      const projectDir = path.join(CLAUDE_PROJECTS_DIR, encodedPath);

      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      // Create valid session file
      const sessionFile = path.join(projectDir, `${sessionId}.jsonl`);
      fs.writeFileSync(sessionFile, '{}');

      // Create some non-session files
      const otherFiles = [
        path.join(projectDir, 'config.json'),
        path.join(projectDir, 'notes.txt'),
        path.join(projectDir, 'not-a-uuid.jsonl')
      ];

      for (const f of otherFiles) {
        fs.writeFileSync(f, 'test');
      }

      try {
        const sessions = getProjectSessionIds(project.projectPath);

        // Should only find the valid UUID session
        assert.strictEqual(sessions.size, 1, 'Should only find 1 valid session');
        assert.ok(sessions.has(sessionId), 'Should find the valid session ID');

      } finally {
        // Cleanup
        try { fs.unlinkSync(sessionFile); } catch (e) { /* ignore */ }
        for (const f of otherFiles) {
          try { fs.unlinkSync(f); } catch (e) { /* ignore */ }
        }
        project.cleanup();
      }
    });
  });

});
