/**
 * Orchestrator Module Tests
 *
 * Tests for the v11 orchestrator system.
 *
 * @jest-environment node
 */

'use strict';

const path = require('path');

// Import all components
const {
  // Events
  EVENTS,
  EventEmitter,
  EventHistory,

  // State Machine
  STATES,
  TRANSITIONS,
  StateMachine,

  // Handlers
  startup,
  phaseTransition,
  WorkerMonitor,
  parseTodos,
  formatTodo,
  formatProgressBar,

  // Error handling
  ERROR_SEVERITY,
  ERROR_PATTERNS,
  RECOVERY_STRATEGIES,
  classifyError,
  ErrorContext,
  handleError,
  formatError,

  // Shutdown
  shutdown,

  // Runner
  DEFAULT_CONFIG,
  OrchestratorRunner,
  createOrchestrator
} = require('../index.cjs');

// ============================================================================
// Events Tests
// ============================================================================

describe('Events', () => {
  describe('EVENTS constants', () => {
    test('should define all required events', () => {
      expect(EVENTS.START).toBe('START');
      expect(EVENTS.SHUTDOWN).toBe('SHUTDOWN');
      expect(EVENTS.FILES_VALID).toBe('FILES_VALID');
      expect(EVENTS.FILES_INVALID).toBe('FILES_INVALID');
      expect(EVENTS.QUESTIONS_ANSWERED).toBe('QUESTIONS_ANSWERED');
      expect(EVENTS.MANIFEST_CREATED).toBe('MANIFEST_CREATED');
      expect(EVENTS.DASHBOARD_READY).toBe('DASHBOARD_READY');
      expect(EVENTS.WORKER_READY).toBe('WORKER_READY');
      expect(EVENTS.SUPERVISOR_READY).toBe('SUPERVISOR_READY');
      expect(EVENTS.HEARTBEAT).toBe('HEARTBEAT');
      expect(EVENTS.PHASE_COMPLETE).toBe('PHASE_COMPLETE');
      expect(EVENTS.PIPELINE_COMPLETE).toBe('PIPELINE_COMPLETE');
      expect(EVENTS.ERROR).toBe('ERROR');
      expect(EVENTS.FATAL_ERROR).toBe('FATAL_ERROR');
    });
  });

  describe('EventEmitter', () => {
    let emitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    test('should emit and receive events using valid EVENTS', () => {
      const handler = jest.fn();
      emitter.on(EVENTS.START, handler);
      emitter.emit(EVENTS.START, { data: 'value' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.START,
          payload: { data: 'value' }
        })
      );
    });

    test('should handle multiple listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on(EVENTS.HEARTBEAT, handler1);
      emitter.on(EVENTS.HEARTBEAT, handler2);
      emitter.emit(EVENTS.HEARTBEAT);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('should support once listeners', () => {
      const handler = jest.fn();
      emitter.once(EVENTS.PHASE_COMPLETE, handler);

      emitter.emit(EVENTS.PHASE_COMPLETE);
      emitter.emit(EVENTS.PHASE_COMPLETE);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should support wildcard listener', () => {
      const handler = jest.fn();
      emitter.on('*', handler);

      emitter.emit(EVENTS.START);
      emitter.emit(EVENTS.SHUTDOWN);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    test('should remove listeners with off', () => {
      const handler = jest.fn();
      emitter.on(EVENTS.ERROR, handler);
      emitter.off(EVENTS.ERROR, handler);
      emitter.emit(EVENTS.ERROR);

      expect(handler).not.toHaveBeenCalled();
    });

    test('should wait for event with waitFor', async () => {
      const promise = emitter.waitFor(EVENTS.WORKER_READY, 1000);

      setTimeout(() => {
        emitter.emit(EVENTS.WORKER_READY, { value: 42 });
      }, 10);

      const event = await promise;
      expect(event.payload.value).toBe(42);
    });

    test('should timeout on waitFor', async () => {
      await expect(emitter.waitFor(EVENTS.WORKER_READY, 50)).rejects.toThrow('Timeout');
    });
  });

  describe('EventHistory', () => {
    let history;

    beforeEach(() => {
      history = new EventHistory();
    });

    test('should add events', () => {
      history.add({ type: EVENTS.START, payload: {} });
      expect(history.getAll()).toHaveLength(1);
    });

    test('should get events by type', () => {
      history.add({ type: EVENTS.START, payload: {} });
      history.add({ type: EVENTS.SHUTDOWN, payload: {} });
      history.add({ type: EVENTS.START, payload: {} });

      expect(history.getByType(EVENTS.START)).toHaveLength(2);
      expect(history.getByType(EVENTS.SHUTDOWN)).toHaveLength(1);
    });

    test('should enforce max size', () => {
      const smallHistory = new EventHistory(5);

      for (let i = 0; i < 10; i++) {
        smallHistory.add({ type: EVENTS.HEARTBEAT, payload: { i } });
      }

      expect(smallHistory.getAll()).toHaveLength(5);
    });

    test('should clear history', () => {
      history.add({ type: EVENTS.START, payload: {} });
      history.clear();
      expect(history.getAll()).toHaveLength(0);
    });
  });
});

// ============================================================================
// State Machine Tests
// ============================================================================

describe('StateMachine', () => {
  let machine;

  beforeEach(() => {
    machine = new StateMachine();
  });

  describe('initial state', () => {
    test('should start in INIT state', () => {
      expect(machine.getState()).toBe(STATES.INIT);
    });
  });

  describe('transitions', () => {
    test('should transition from INIT to VALIDATING on START', () => {
      const result = machine.transition(EVENTS.START);
      expect(result.success).toBe(true);
      expect(machine.getState()).toBe(STATES.VALIDATING);
    });

    test('should transition from VALIDATING to ASKING_QUESTIONS on FILES_VALID', () => {
      machine.transition(EVENTS.START);
      const result = machine.transition(EVENTS.FILES_VALID);
      expect(result.success).toBe(true);
      expect(machine.getState()).toBe(STATES.ASKING_QUESTIONS);
    });

    test('should transition to MONITORING after SUPERVISOR_READY', () => {
      machine.transition(EVENTS.START);
      machine.transition(EVENTS.FILES_VALID);
      machine.transition(EVENTS.QUESTIONS_ANSWERED);
      machine.transition(EVENTS.MANIFEST_CREATED);
      machine.transition(EVENTS.DASHBOARD_READY);
      machine.transition(EVENTS.WORKER_READY);
      machine.transition(EVENTS.SUPERVISOR_READY);
      expect(machine.getState()).toBe(STATES.MONITORING);
    });

    test('should reject invalid transitions', () => {
      const result = machine.transition(EVENTS.FILES_VALID);
      expect(result.success).toBe(false);
    });

    test('should not change state on invalid transition', () => {
      machine.transition(EVENTS.FILES_VALID);
      expect(machine.getState()).toBe(STATES.INIT);
    });
  });

  describe('terminal states', () => {
    test('should detect terminal states', () => {
      machine.transition(EVENTS.START);
      machine.transition(EVENTS.FILES_VALID);
      machine.transition(EVENTS.QUESTIONS_ANSWERED);
      machine.transition(EVENTS.MANIFEST_CREATED);
      machine.transition(EVENTS.DASHBOARD_READY);
      machine.transition(EVENTS.WORKER_READY);
      machine.transition(EVENTS.SUPERVISOR_READY);

      expect(machine.isTerminal()).toBe(false);

      // Transition to DONE (terminal)
      machine.transition(EVENTS.SHUTDOWN);
      expect(machine.isTerminal()).toBe(true);
    });
  });

  describe('transition callback', () => {
    test('should call onTransition callback', () => {
      const onTransition = jest.fn();
      const machine = new StateMachine({ onTransition });

      machine.transition(EVENTS.START);

      expect(onTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          from: STATES.INIT,
          to: STATES.VALIDATING,
          event: EVENTS.START
        })
      );
    });
  });

  describe('state check', () => {
    test('should correctly check current state', () => {
      expect(machine.isIn(STATES.INIT)).toBe(true);
      expect(machine.isIn(STATES.VALIDATING)).toBe(false);
    });
  });

  describe('getValidEvents', () => {
    test('should return valid events for current state', () => {
      const events = machine.getValidEvents();
      expect(events).toContain(EVENTS.START);
      expect(events).toContain(EVENTS.SHUTDOWN);
    });
  });

  describe('canHandle', () => {
    test('should check if event can be handled', () => {
      expect(machine.canHandle(EVENTS.START)).toBe(true);
      expect(machine.canHandle(EVENTS.FILES_VALID)).toBe(false);
    });
  });

  describe('forceState', () => {
    test('should force state change', () => {
      machine.forceState(STATES.MONITORING, 'test');
      expect(machine.getState()).toBe(STATES.MONITORING);
    });

    test('should throw for invalid state', () => {
      expect(() => machine.forceState('INVALID')).toThrow();
    });
  });

  describe('context', () => {
    test('should update and get context', () => {
      machine.updateContext({ key: 'value' });
      expect(machine.getContext('key')).toBe('value');
    });

    test('should get all context', () => {
      machine.updateContext({ a: 1, b: 2 });
      const ctx = machine.getContext();
      expect(ctx).toEqual({ a: 1, b: 2 });
    });
  });

  describe('history', () => {
    test('should track transition history', () => {
      machine.transition(EVENTS.START);
      machine.transition(EVENTS.FILES_VALID);

      const history = machine.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].event).toBe(EVENTS.START);
    });
  });

  describe('serialize/deserialize', () => {
    test('should serialize and deserialize state', () => {
      machine.transition(EVENTS.START);
      machine.updateContext({ test: true });

      const serialized = machine.serialize();
      const newMachine = new StateMachine();
      newMachine.deserialize(serialized);

      expect(newMachine.getState()).toBe(STATES.VALIDATING);
      expect(newMachine.getContext('test')).toBe(true);
    });
  });
});

// ============================================================================
// Phase Transition Tests
// ============================================================================

describe('Phase Transition', () => {
  describe('getNextPhase', () => {
    test('should return next phase in sequence', () => {
      expect(phaseTransition.getNextPhase('2')).toBe('3');
      expect(phaseTransition.getNextPhase('3')).toBe('4');
      expect(phaseTransition.getNextPhase('4')).toBe('5');
    });

    test('should return null for last phase', () => {
      expect(phaseTransition.getNextPhase('5')).toBeNull();
    });

    test('should return null for unknown phase', () => {
      expect(phaseTransition.getNextPhase('99')).toBeNull();
    });
  });

  describe('getPreviousPhase', () => {
    test('should return previous phase', () => {
      expect(phaseTransition.getPreviousPhase('3')).toBe('2');
      expect(phaseTransition.getPreviousPhase('4')).toBe('3');
      expect(phaseTransition.getPreviousPhase('5')).toBe('4');
    });

    test('should return null for first phase', () => {
      expect(phaseTransition.getPreviousPhase('2')).toBeNull();
    });
  });

  describe('isLastPhase', () => {
    test('should identify last phase', () => {
      expect(phaseTransition.isLastPhase('5')).toBe(true);
      expect(phaseTransition.isLastPhase('4')).toBe(false);
    });
  });

  describe('getPhaseInfo', () => {
    test('should return phase metadata', () => {
      const info = phaseTransition.getPhaseInfo('2');
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('command');
    });

    test('should return null for unknown phase', () => {
      expect(phaseTransition.getPhaseInfo('99')).toBeNull();
    });
  });

  describe('detectPhaseCompletion', () => {
    test('should detect complete phase from todos', () => {
      const manifest = {
        currentPhase: '2',
        phases: {
          '2': {
            todos: [
              { status: 'completed' },
              { status: 'completed' },
              { status: 'completed' }
            ]
          }
        }
      };

      const result = phaseTransition.detectPhaseCompletion(manifest);
      expect(result.complete).toBe(true);
      expect(result.progress).toBe(100);
    });

    test('should detect incomplete phase', () => {
      const manifest = {
        currentPhase: '2',
        phases: {
          '2': {
            todos: [
              { status: 'completed' },
              { status: 'in_progress' },
              { status: 'pending' }
            ]
          }
        }
      };

      const result = phaseTransition.detectPhaseCompletion(manifest);
      expect(result.complete).toBe(false);
      expect(result.progress).toBeCloseTo(33.33, 0);
    });
  });

  describe('canStartPhase', () => {
    test('should allow phase 2 if brainstorm complete', () => {
      const manifest = {
        brainstorm: { complete: true }
      };
      const result = phaseTransition.canStartPhase('2', manifest);
      expect(result.canStart).toBe(true);
    });

    test('should require previous phase for phase 3+', () => {
      const manifest = {
        phases: {
          '2': { status: 'pending' }
        }
      };
      const result = phaseTransition.canStartPhase('3', manifest);
      expect(result.canStart).toBe(false);
      expect(result.reason).toContain('Phase 2');
    });
  });

  describe('generatePhaseSummary', () => {
    test('should generate summary for phases', () => {
      const manifest = {
        currentPhase: '3',
        phases: {
          '2': { status: 'complete' },
          '3': { status: 'running' }
        }
      };

      const summary = phaseTransition.generatePhaseSummary(manifest);
      expect(summary.completedPhases).toBe(1);
      expect(summary.currentPhase).toBe('3');
      expect(summary.phases).toHaveLength(4);
    });
  });
});

// ============================================================================
// Worker Monitor Tests
// ============================================================================

describe('WorkerMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new WorkerMonitor({
      heartbeatIntervalMs: 100,
      heartbeatTimeoutMs: 500,
      todoCheckIntervalMs: 50,
      maxMissedHeartbeats: 3
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('start/stop', () => {
    test('should start monitoring', () => {
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });

    test('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isRunning).toBe(false);
    });

    test('should not start twice', () => {
      monitor.start();
      monitor.start();
      expect(monitor.isRunning).toBe(true);
    });
  });

  describe('heartbeat', () => {
    test('should record heartbeat', () => {
      monitor.recordHeartbeat();
      expect(monitor.lastHeartbeat).not.toBeNull();
      expect(monitor.missedHeartbeats).toBe(0);
    });

    test('should call onHeartbeat callback', () => {
      const onHeartbeat = jest.fn();
      monitor.setCallbacks({ onHeartbeat });
      monitor.recordHeartbeat();
      expect(onHeartbeat).toHaveBeenCalled();
    });
  });

  describe('todo detection', () => {
    test('should calculate progress', () => {
      const todos = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'pending' }
      ];

      expect(monitor.calculateProgress(todos)).toBe(50);
    });

    test('should detect all complete', () => {
      const todos = [
        { status: 'completed' },
        { status: 'completed' }
      ];

      expect(monitor.isAllComplete(todos)).toBe(true);
    });

    test('should detect not all complete', () => {
      const todos = [
        { status: 'completed' },
        { status: 'pending' }
      ];

      expect(monitor.isAllComplete(todos)).toBe(false);
    });
  });

  describe('getStatus', () => {
    test('should return current status', () => {
      monitor.start();
      const status = monitor.getStatus();

      expect(status).toHaveProperty('isRunning', true);
      expect(status).toHaveProperty('lastHeartbeat');
      expect(status).toHaveProperty('missedHeartbeats');
    });
  });
});

describe('Todo utilities', () => {
  test('parseTodos should handle array input', () => {
    const todos = [{ content: 'test', status: 'pending' }];
    expect(parseTodos(todos)).toEqual(todos);
  });

  test('parseTodos should handle JSON string', () => {
    const todos = [{ content: 'test', status: 'pending' }];
    expect(parseTodos(JSON.stringify(todos))).toEqual(todos);
  });

  test('parseTodos should handle object with todos property', () => {
    const todos = [{ content: 'test', status: 'pending' }];
    expect(parseTodos({ todos })).toEqual(todos);
  });

  test('formatTodo should format pending todo', () => {
    const result = formatTodo({ content: 'Task', status: 'pending' });
    expect(result).toContain('○');
    expect(result).toContain('Task');
  });

  test('formatTodo should format completed todo', () => {
    const result = formatTodo({ content: 'Task', status: 'completed' });
    expect(result).toContain('✓');
  });

  test('formatProgressBar should render progress', () => {
    const result = formatProgressBar(50, 10);
    expect(result).toContain('█');
    expect(result).toContain('░');
    expect(result).toContain('50%');
  });
});

// ============================================================================
// Error Handler Tests
// ============================================================================

describe('Error Handler', () => {
  describe('classifyError', () => {
    test('should classify file not found error', () => {
      const result = classifyError(new Error('ENOENT: no such file'));
      expect(result.severity).toBe(ERROR_SEVERITY.RECOVERABLE);
      expect(result.recovery).toBe('CHECK_FILES');
    });

    test('should classify permission error as fatal', () => {
      const result = classifyError(new Error('EACCES: permission denied'));
      expect(result.severity).toBe(ERROR_SEVERITY.FATAL);
    });

    test('should classify timeout error', () => {
      const result = classifyError(new Error('ETIMEDOUT'));
      expect(result.severity).toBe(ERROR_SEVERITY.RECOVERABLE);
      expect(result.recovery).toBe('RETRY');
    });

    test('should classify worker died error', () => {
      const result = classifyError(new Error('worker process died'));
      expect(result.recovery).toBe('RESTART_WORKER');
    });

    test('should classify unknown error as recoverable', () => {
      const result = classifyError(new Error('some unknown error'));
      expect(result.severity).toBe(ERROR_SEVERITY.RECOVERABLE);
      expect(result.recovery).toBe('RETRY');
    });
  });

  describe('ErrorContext', () => {
    let context;

    beforeEach(() => {
      context = new ErrorContext();
    });

    test('should record errors', () => {
      context.record({ message: 'test', severity: ERROR_SEVERITY.WARNING });
      expect(context.getRecentErrors()).toHaveLength(1);
    });

    test('should track recovery attempts', () => {
      expect(context.getAttempts('RETRY')).toBe(0);
      context.incrementAttempts('RETRY');
      expect(context.getAttempts('RETRY')).toBe(1);
    });

    test('should check if should retry', () => {
      const result = context.shouldRetry('RETRY');
      expect(result.shouldRetry).toBe(true);
      expect(result.maxAttempts).toBe(RECOVERY_STRATEGIES.RETRY.maxAttempts);
    });

    test('should prevent retry after max attempts', () => {
      for (let i = 0; i < RECOVERY_STRATEGIES.RETRY.maxAttempts; i++) {
        context.incrementAttempts('RETRY');
      }
      expect(context.shouldRetry('RETRY').shouldRetry).toBe(false);
    });

    test('should reset attempts', () => {
      context.incrementAttempts('RETRY');
      context.resetAttempts('RETRY');
      expect(context.getAttempts('RETRY')).toBe(0);
    });

    test('should get error counts by severity', () => {
      context.record({ severity: ERROR_SEVERITY.WARNING });
      context.record({ severity: ERROR_SEVERITY.WARNING });
      context.record({ severity: ERROR_SEVERITY.FATAL });

      const counts = context.getErrorCounts();
      expect(counts[ERROR_SEVERITY.WARNING]).toBe(2);
      expect(counts[ERROR_SEVERITY.FATAL]).toBe(1);
    });
  });

  describe('handleError', () => {
    let context;

    beforeEach(() => {
      context = new ErrorContext();
    });

    test('should handle fatal error', async () => {
      const result = await handleError(
        new Error('EACCES: permission denied'),
        context
      );

      expect(result.recovered).toBe(false);
      expect(result.action).toBe('FATAL_STOP');
    });

    test('should handle recoverable error with handler', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const result = await handleError(
        new Error('worker process died'),
        context,
        { RESTART_WORKER: handler }
      );

      expect(handler).toHaveBeenCalled();
      expect(result.recovered).toBe(true);
    }, 10000);

    test('should stop after max retries', async () => {
      // Exhaust retries
      for (let i = 0; i < RECOVERY_STRATEGIES.RETRY.maxAttempts; i++) {
        context.incrementAttempts('RETRY');
      }

      const result = await handleError(
        new Error('unknown error'),
        context
      );

      expect(result.recovered).toBe(false);
      expect(result.action).toBe('MAX_RETRIES_EXCEEDED');
    });
  });

  describe('formatError', () => {
    test('should format warning error', () => {
      const result = formatError({
        severity: ERROR_SEVERITY.WARNING,
        classification: 'Test',
        message: 'error'
      });
      expect(result).toContain('⚠');
      expect(result).toContain('WARNING');
    });

    test('should format fatal error', () => {
      const result = formatError({
        severity: ERROR_SEVERITY.FATAL,
        classification: 'Test',
        message: 'error'
      });
      expect(result).toContain('✗');
      expect(result).toContain('FATAL');
    });
  });
});

// ============================================================================
// Shutdown Handler Tests
// ============================================================================

describe('Shutdown Handler', () => {
  describe('ShutdownState', () => {
    let state;

    beforeEach(() => {
      state = new shutdown.ShutdownState();
    });

    test('should track shutdown start', () => {
      state.start('USER_QUIT');
      expect(state.isShuttingDown).toBe(true);
      expect(state.reason).toBe('USER_QUIT');
    });

    test('should track completed steps', () => {
      state.addPendingStep('step1');
      state.completeStep('step1');
      expect(state.completedSteps).toHaveLength(1);
      expect(state.pendingSteps).toHaveLength(0);
    });

    test('should record errors', () => {
      state.recordError('step1', new Error('failed'));
      expect(state.errors).toHaveLength(1);
    });

    test('should detect completion', () => {
      state.addPendingStep('step1');
      expect(state.isComplete()).toBe(false);
      state.completeStep('step1');
      expect(state.isComplete()).toBe(true);
    });

    test('should get summary', () => {
      state.start('MANUAL');
      state.addPendingStep('step1');
      state.completeStep('step1');

      const summary = state.getSummary();
      expect(summary.reason).toBe('MANUAL');
      expect(summary.completedSteps).toBe(1);
      expect(summary.complete).toBe(true);
    });
  });

  describe('createShutdownSequence', () => {
    test('should create shutdown steps', () => {
      const context = {
        monitor: { stop: jest.fn() },
        killSupervisor: jest.fn(),
        killWorker: jest.fn(),
        killDashboard: jest.fn(),
        cleanupPids: jest.fn()
      };

      const steps = shutdown.createShutdownSequence(context);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].name).toBe('stop_monitoring');
    });
  });

  describe('executeShutdown', () => {
    test('should execute shutdown sequence', async () => {
      const monitor = { stop: jest.fn() };
      const killWorker = jest.fn().mockResolvedValue(true);
      const updateManifest = jest.fn().mockResolvedValue(true);

      const state = await shutdown.executeShutdown({
        monitor,
        killWorker,
        updateManifest
      }, 'TEST');

      expect(state.reason).toBe('TEST');
      expect(monitor.stop).toHaveBeenCalled();
    });

    test('should handle errors gracefully', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('fail'));

      const state = await shutdown.executeShutdown({
        killWorker: failingFn
      }, 'TEST');

      expect(state.errors.length).toBeGreaterThan(0);
    });
  });

  describe('formatShutdownMessage', () => {
    test('should format shutdown message', () => {
      const state = new shutdown.ShutdownState();
      state.start('USER_QUIT');
      state.addPendingStep('stop_monitoring');
      state.completeStep('stop_monitoring');

      const message = shutdown.formatShutdownMessage(state);
      expect(message).toContain('ORCHESTRATOR SHUTDOWN');
      expect(message).toContain('USER_QUIT');
      expect(message).toContain('stop_monitoring');
    });
  });
});

// ============================================================================
// Startup Handler Tests
// ============================================================================

describe('Startup Handler', () => {
  describe('validateBrainstormFiles', () => {
    test('should return result for directory', () => {
      const result = startup.validateBrainstormFiles(__dirname);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('missing');
      expect(result).toHaveProperty('found');
    });

    test('should have missing files for test directory', () => {
      const result = startup.validateBrainstormFiles(__dirname);
      // Test directory doesn't have brainstorm files
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe('STARTUP_QUESTIONS', () => {
    test('should be defined array', () => {
      expect(Array.isArray(startup.STARTUP_QUESTIONS)).toBe(true);
      expect(startup.STARTUP_QUESTIONS.length).toBeGreaterThan(0);
    });

    test('should include stack question', () => {
      const stackQ = startup.STARTUP_QUESTIONS.find(q => q.id === 'stack');
      expect(stackQ).toBeDefined();
      expect(stackQ.options).toBeDefined();
    });
  });

  describe('getDefaultAnswers', () => {
    test('should return default answers', () => {
      const defaults = startup.getDefaultAnswers();
      expect(defaults).toHaveProperty('stack');
      expect(defaults).toHaveProperty('mode');
    });
  });

  describe('validateAnswers', () => {
    test('should validate complete answers', () => {
      const result = startup.validateAnswers({
        stack: 'desktop',
        mode: 'new',
        userMode: 'autonomous',
        stepMode: 'continuous',
        startPhase: '2'
      });
      expect(result.valid).toBe(true);
    });

    test('should reject missing required answers', () => {
      const result = startup.validateAnswers({});
      expect(result.valid).toBe(false);
    });

    test('should reject invalid stack', () => {
      const result = startup.validateAnswers({
        stack: 'invalid',
        mode: 'new',
        userMode: 'autonomous',
        stepMode: 'continuous',
        startPhase: '2'
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('getProjectInfo', () => {
    test('should return project info', () => {
      const info = startup.getProjectInfo(__dirname);
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('path');
    });
  });
});

// ============================================================================
// OrchestratorRunner Tests
// ============================================================================

describe('OrchestratorRunner', () => {
  describe('constructor', () => {
    test('should create instance with default config', () => {
      const runner = new OrchestratorRunner(__dirname);
      expect(runner.projectPath).toBe(__dirname);
      expect(runner.config).toEqual(expect.objectContaining(DEFAULT_CONFIG));
    });

    test('should merge custom config', () => {
      const runner = new OrchestratorRunner(__dirname, {
        heartbeatIntervalMs: 60000
      });
      expect(runner.config.heartbeatIntervalMs).toBe(60000);
    });
  });

  describe('getStatus', () => {
    test('should return current status', () => {
      const runner = new OrchestratorRunner(__dirname);
      const status = runner.getStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('phase');
      expect(status).toHaveProperty('monitor');
      expect(status).toHaveProperty('errors');
    });
  });
});

describe('createOrchestrator', () => {
  test('should create orchestrator instance', () => {
    const orchestrator = createOrchestrator(__dirname);
    expect(orchestrator).toBeInstanceOf(OrchestratorRunner);
  });
});

// ============================================================================
// Integration Tests (Simplified)
// ============================================================================

describe('Integration', () => {
  test('state machine and events should work together', () => {
    const emitter = new EventEmitter();
    const machine = new StateMachine();
    const transitions = [];

    emitter.on(EVENTS.START, () => {
      transitions.push(machine.transition(EVENTS.START));
    });

    emitter.on(EVENTS.FILES_VALID, () => {
      transitions.push(machine.transition(EVENTS.FILES_VALID));
    });

    emitter.emit(EVENTS.START);
    emitter.emit(EVENTS.FILES_VALID);

    expect(transitions).toHaveLength(2);
    expect(transitions[0].success).toBe(true);
    expect(transitions[1].success).toBe(true);
    expect(machine.getState()).toBe(STATES.ASKING_QUESTIONS);
  });

  test('error handler and error context should work together', async () => {
    const context = new ErrorContext();

    // Use a fatal error so we don't wait for retry delays
    const error = new Error('EACCES: permission denied');
    const result = await handleError(error, context);

    expect(result).not.toBeNull();
    expect(result.recovered).toBe(false); // Fatal errors are not recoverable
    expect(result.action).toBe('FATAL_STOP');
    expect(context.getRecentErrors().length).toBeGreaterThanOrEqual(1);
  });
});
