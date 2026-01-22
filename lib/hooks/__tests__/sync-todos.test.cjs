/**
 * Tests for sync-todos hook
 *
 * @module lib/hooks/__tests__/sync-todos.test
 */

'use strict';

const path = require('path');

// Import the functions we're testing
const { getRoleFromCwd, getProjectPath } = require('../sync-todos.js');

describe('sync-todos hook', () => {
  describe('getRoleFromCwd', () => {
    it('should return "worker" when cwd is .pipeline/worker/', () => {
      const cwd = 'C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot\\.pipeline\\worker';
      expect(getRoleFromCwd(cwd)).toBe('worker');
    });

    it('should return "orchestrator" when cwd is .pipeline/orchestrator/', () => {
      const cwd = 'C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot\\.pipeline\\orchestrator';
      expect(getRoleFromCwd(cwd)).toBe('orchestrator');
    });

    it('should return "supervisor" when cwd is .pipeline/supervisor/', () => {
      const cwd = 'C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot\\.pipeline\\supervisor';
      expect(getRoleFromCwd(cwd)).toBe('supervisor');
    });

    it('should return null when cwd is not in a pipeline subdirectory', () => {
      const cwd = 'C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot';
      expect(getRoleFromCwd(cwd)).toBeNull();
    });

    it('should handle Unix-style paths', () => {
      const cwd = '/home/user/projects/myapp/.pipeline/worker';
      expect(getRoleFromCwd(cwd)).toBe('worker');
    });

    it('should return null for null cwd', () => {
      expect(getRoleFromCwd(null)).toBeNull();
    });
  });

  describe('getProjectPath', () => {
    it('should return project root when cwd is inside .pipeline/worker/', () => {
      const hookInput = {
        cwd: 'C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot\\.pipeline\\worker'
      };

      const result = getProjectPath(hookInput);

      expect(result).toBe('C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot');
    });

    it('should return project root when cwd is inside .pipeline/orchestrator/', () => {
      const hookInput = {
        cwd: 'C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot\\.pipeline\\orchestrator'
      };

      const result = getProjectPath(hookInput);

      expect(result).toBe('C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot');
    });

    it('should return project root when cwd is inside .pipeline/supervisor/', () => {
      const hookInput = {
        cwd: 'C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot\\.pipeline\\supervisor'
      };

      const result = getProjectPath(hookInput);

      expect(result).toBe('C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot');
    });

    it('should return cwd unchanged when not inside .pipeline subfolder', () => {
      const hookInput = {
        cwd: 'C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot'
      };

      const result = getProjectPath(hookInput);

      expect(result).toBe('C:\\Users\\ahunt\\Documents\\IMT Claude\\eliot');
    });

    it('should handle Unix-style paths', () => {
      const hookInput = {
        cwd: '/home/user/projects/myapp/.pipeline/worker'
      };

      const result = getProjectPath(hookInput);

      expect(result).toBe('/home/user/projects/myapp');
    });

    it('should return null when hookInput has no cwd', () => {
      const hookInput = {};

      const result = getProjectPath(hookInput);

      expect(result).toBeNull();
    });
  });
});
