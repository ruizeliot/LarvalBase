/**
 * Worker Monitor Handler
 *
 * Handles worker heartbeat monitoring and todo watching.
 *
 * @module lib/orchestrator/handlers/worker-monitor
 * @version 11.0.0
 */

'use strict';

/**
 * Default monitoring configuration
 */
const DEFAULT_CONFIG = {
  heartbeatIntervalMs: 30000,      // Check every 30 seconds
  heartbeatTimeoutMs: 300000,      // 5 minutes timeout
  todoCheckIntervalMs: 10000,      // Check todos every 10 seconds
  maxMissedHeartbeats: 3           // Max missed heartbeats before timeout
};

/**
 * Worker monitor class
 */
class WorkerMonitor {
  /**
   * Create worker monitor
   * @param {Object} options - Monitor options
   */
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.lastHeartbeat = null;
    this.missedHeartbeats = 0;
    this.lastTodos = null;
    this.heartbeatInterval = null;
    this.todoCheckInterval = null;
    this.isRunning = false;
    this.callbacks = {
      onHeartbeat: null,
      onHeartbeatTimeout: null,
      onTodoUpdate: null,
      onPhaseComplete: null
    };
  }

  /**
   * Register callbacks
   * @param {Object} callbacks - Callback functions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Start monitoring
   * @param {Object} context - Monitor context
   */
  start(context = {}) {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
    this.context = context;

    // Start heartbeat check
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeat();
    }, this.config.heartbeatIntervalMs);

    // Start todo check
    if (context.checkTodos) {
      this.todoCheckInterval = setInterval(() => {
        this.checkTodos();
      }, this.config.todoCheckIntervalMs);
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.todoCheckInterval) {
      clearInterval(this.todoCheckInterval);
      this.todoCheckInterval = null;
    }
  }

  /**
   * Record heartbeat
   */
  recordHeartbeat() {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;

    if (this.callbacks.onHeartbeat) {
      this.callbacks.onHeartbeat({ timestamp: this.lastHeartbeat });
    }
  }

  /**
   * Check heartbeat status
   */
  checkHeartbeat() {
    const now = Date.now();
    const elapsed = now - this.lastHeartbeat;

    if (elapsed > this.config.heartbeatIntervalMs) {
      this.missedHeartbeats++;

      if (this.missedHeartbeats >= this.config.maxMissedHeartbeats ||
          elapsed > this.config.heartbeatTimeoutMs) {
        if (this.callbacks.onHeartbeatTimeout) {
          this.callbacks.onHeartbeatTimeout({
            lastHeartbeat: this.lastHeartbeat,
            elapsed,
            missedCount: this.missedHeartbeats
          });
        }
      }
    }
  }

  /**
   * Check and update todos
   */
  async checkTodos() {
    if (!this.context?.checkTodos) {
      return;
    }

    try {
      const todos = await this.context.checkTodos();
      const update = this.detectTodoChanges(todos);

      if (update.changed) {
        this.lastTodos = todos;

        if (this.callbacks.onTodoUpdate) {
          this.callbacks.onTodoUpdate(update);
        }

        // Check for phase completion
        if (update.allComplete && this.callbacks.onPhaseComplete) {
          this.callbacks.onPhaseComplete({
            todos,
            completedAt: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Todo check error:', error);
    }
  }

  /**
   * Detect changes in todos
   * @param {Object[]} newTodos - New todo list
   * @returns {Object} Change detection result
   */
  detectTodoChanges(newTodos) {
    if (!this.lastTodos) {
      return {
        changed: true,
        newlyCompleted: [],
        progress: this.calculateProgress(newTodos),
        allComplete: this.isAllComplete(newTodos)
      };
    }

    const newlyCompleted = [];
    let changed = false;

    // Check for newly completed todos
    for (let i = 0; i < newTodos.length; i++) {
      const oldTodo = this.lastTodos[i];
      const newTodo = newTodos[i];

      if (oldTodo && newTodo) {
        if (oldTodo.status !== 'completed' && newTodo.status === 'completed') {
          newlyCompleted.push(newTodo);
          changed = true;
        }
        if (oldTodo.status !== newTodo.status) {
          changed = true;
        }
      }
    }

    return {
      changed,
      newlyCompleted,
      progress: this.calculateProgress(newTodos),
      allComplete: this.isAllComplete(newTodos)
    };
  }

  /**
   * Calculate progress percentage
   * @param {Object[]} todos - Todo list
   * @returns {number} Progress percentage (0-100)
   */
  calculateProgress(todos) {
    if (!todos || todos.length === 0) {
      return 0;
    }

    const completed = todos.filter(t => t.status === 'completed').length;
    return Math.round((completed / todos.length) * 100);
  }

  /**
   * Check if all todos are complete
   * @param {Object[]} todos - Todo list
   * @returns {boolean}
   */
  isAllComplete(todos) {
    if (!todos || todos.length === 0) {
      return false;
    }

    return todos.every(t => t.status === 'completed');
  }

  /**
   * Get current status
   * @returns {Object} Monitor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastHeartbeat: this.lastHeartbeat,
      missedHeartbeats: this.missedHeartbeats,
      lastTodos: this.lastTodos,
      progress: this.lastTodos ? this.calculateProgress(this.lastTodos) : 0
    };
  }
}

/**
 * Parse todos from various sources
 * @param {*} input - Todo input (array, string, or object)
 * @returns {Object[]} Normalized todo array
 */
function parseTodos(input) {
  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return [];
    }
  }

  if (input && typeof input === 'object' && input.todos) {
    return input.todos;
  }

  return [];
}

/**
 * Format todo for display
 * @param {Object} todo - Todo object
 * @returns {string} Formatted string
 */
function formatTodo(todo) {
  const statusIcon = {
    'pending': '○',
    'in_progress': '▶',
    'completed': '✓'
  };

  const icon = statusIcon[todo.status] || '?';
  return `${icon} ${todo.content || todo.activeForm || 'Unknown task'}`;
}

/**
 * Format progress bar
 * @param {number} progress - Progress percentage (0-100)
 * @param {number} [width=20] - Bar width
 * @returns {string} Progress bar string
 */
function formatProgressBar(progress, width = 20) {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${progress}%`;
}

module.exports = {
  DEFAULT_CONFIG,
  WorkerMonitor,
  parseTodos,
  formatTodo,
  formatProgressBar
};
