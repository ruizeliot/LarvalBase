/**
 * Orchestrator Runner
 *
 * Main event loop that composes all modules.
 *
 * @module lib/orchestrator/runner
 * @version 11.0.0
 */

'use strict';

const path = require('path');

// Import modules
const manifest = require('../manifest/index.cjs');
const dashboard = require('../dashboard/index.cjs');
const processManager = require('../process/index.cjs');
const composer = require('../composer/index.cjs');
const analyzer = require('../analyzer/index.cjs');
const rating = require('../rating/index.cjs');

// Import orchestrator components
const { EVENTS, EventEmitter, EventHistory } = require('./events.cjs');
const { STATES, StateMachine } = require('./state-machine.cjs');
const startup = require('./handlers/startup.cjs');
const phaseTransition = require('./handlers/phase-transition.cjs');
const { WorkerMonitor } = require('./handlers/worker-monitor.cjs');
const { ErrorContext, handleError } = require('./handlers/error-handler.cjs');
const shutdown = require('./handlers/shutdown.cjs');
const supervisorCheck = require('./supervisor-check.cjs');

/**
 * Default runner configuration
 */
const DEFAULT_CONFIG = {
  heartbeatIntervalMs: 30000,
  todoCheckIntervalMs: 10000,
  autoTransition: true,
  collectRatings: true,
  runAnalysis: true,
  dashboardEnabled: true,
  supervisorEnabled: true
};

/**
 * Orchestrator runner class
 */
class OrchestratorRunner {
  /**
   * Create orchestrator runner
   * @param {string} projectPath - Project root path
   * @param {Object} [options] - Runner options
   */
  constructor(projectPath, options = {}) {
    this.projectPath = path.resolve(projectPath);
    this.config = { ...DEFAULT_CONFIG, ...options };

    // State machine
    this.stateMachine = new StateMachine({
      onTransition: (t) => this.handleTransition(t)
    });

    // Event system
    this.emitter = new EventEmitter();
    this.eventHistory = new EventHistory();

    // Monitoring
    this.workerMonitor = new WorkerMonitor(this.config);
    this.errorContext = new ErrorContext();

    // Process handles
    this.processes = {
      dashboard: null,
      worker: null,
      supervisor: null
    };

    // Runtime state
    this.manifest = null;
    this.currentPhase = null;
    this.pipelineComplete = false;

    // Transcript tracking for supervisor checks
    this.workerSessionId = null;
    this.transcriptEvents = [];

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Record all events
    this.emitter.on('*', (event) => {
      this.eventHistory.add(event);
    });

    // Handle events
    this.emitter.on(EVENTS.FILES_VALID, () => this.stateMachine.transition(EVENTS.FILES_VALID));
    this.emitter.on(EVENTS.FILES_INVALID, () => this.stateMachine.transition(EVENTS.FILES_INVALID));
    this.emitter.on(EVENTS.QUESTIONS_ANSWERED, (e) => this.stateMachine.transition(EVENTS.QUESTIONS_ANSWERED, e.payload));
    this.emitter.on(EVENTS.MANIFEST_CREATED, () => this.stateMachine.transition(EVENTS.MANIFEST_CREATED));
    this.emitter.on(EVENTS.DASHBOARD_READY, () => this.stateMachine.transition(EVENTS.DASHBOARD_READY));
    this.emitter.on(EVENTS.WORKER_READY, () => this.stateMachine.transition(EVENTS.WORKER_READY));
    this.emitter.on(EVENTS.SUPERVISOR_READY, () => this.stateMachine.transition(EVENTS.SUPERVISOR_READY));
    this.emitter.on(EVENTS.SUPERVISOR_FAILED, () => this.stateMachine.transition(EVENTS.SUPERVISOR_FAILED));
    this.emitter.on(EVENTS.PHASE_COMPLETE, () => this.handlePhaseComplete());
    this.emitter.on(EVENTS.PIPELINE_COMPLETE, () => this.handlePipelineComplete());
    this.emitter.on(EVENTS.ERROR, (e) => this.handleErrorEvent(e));
    this.emitter.on(EVENTS.USER_QUIT, () => this.stop('USER_QUIT'));

    // Setup worker monitor callbacks
    this.workerMonitor.setCallbacks({
      onHeartbeat: () => this.emitter.emit(EVENTS.HEARTBEAT),
      onHeartbeatTimeout: (info) => this.emitter.emit(EVENTS.HEARTBEAT_TIMEOUT, info),
      onTodoUpdate: (update) => {
        this.emitter.emit(EVENTS.TODO_UPDATE, update);
        // Trigger supervisor check for newly completed todos
        if (this.config.supervisorEnabled && update.newlyCompleted && update.newlyCompleted.length > 0) {
          this.checkSupervisorForCompletedTodos(update.newlyCompleted);
        }
      },
      onPhaseComplete: () => this.emitter.emit(EVENTS.PHASE_COMPLETE)
    });
  }

  /**
   * Check supervisor for newly completed todos
   * @param {Object[]} completedTodos - Array of completed todo objects
   */
  async checkSupervisorForCompletedTodos(completedTodos) {
    // Discover session ID if not yet known
    if (!this.workerSessionId) {
      this.workerSessionId = supervisorCheck.discoverWorkerSessionId(this.projectPath);
      if (this.workerSessionId) {
        console.log(`[SUPERVISOR] Discovered worker session: ${this.workerSessionId}`);
        // Update manifest with session ID
        manifest.updateManifest(this.projectPath, {
          'workers.current.sessionId': this.workerSessionId
        });
      }
    }

    // Find and parse transcript if we haven't yet (or refresh it)
    if (this.workerSessionId) {
      const transcriptPath = supervisorCheck.findTranscriptPath(this.projectPath, this.workerSessionId);
      if (transcriptPath) {
        // Re-parse on each check to get latest events
        this.transcriptEvents = supervisorCheck.parseTranscriptFile(transcriptPath);
      }
    }

    for (const todo of completedTodos) {
      try {
        // Extract transcript slice for this todo
        const transcriptSlice = supervisorCheck.extractTranscriptSlice(
          this.transcriptEvents,
          todo.content
        );

        // Send to supervisor
        const context = {
          phase: this.currentPhase,
          projectPath: this.projectPath,
          transcriptSlice,
          injectToRole: processManager.injectToRole
        };

        const sent = await supervisorCheck.sendSupervisorCheck(todo, context);

        if (sent) {
          console.log(`[SUPERVISOR] Sent check for todo: ${todo.content.slice(0, 50)}...`);

          // Wait for and check supervisor response
          const response = await supervisorCheck.checkSupervisorResponse(this.projectPath);

          if (!response.passed) {
            console.log(`[SUPERVISOR] VIOLATION detected: ${response.violation?.code}`);
            this.emitter.emit(EVENTS.ERROR, {
              type: 'SUPERVISOR_VIOLATION',
              violation: response.violation,
              todo: todo.content
            });
          }
        }
      } catch (error) {
        console.error(`[SUPERVISOR] Check failed for todo: ${error.message}`);
      }
    }
  }

  /**
   * Handle state transitions
   * @param {Object} transition - Transition info
   */
  handleTransition(transition) {
    console.log(`[STATE] ${transition.from} → ${transition.to} (${transition.event})`);
  }

  /**
   * Start orchestrator
   * @param {Object} [options] - Start options
   * @returns {Promise<Object>} Run result
   */
  async start(options = {}) {
    try {
      // Transition to start
      this.stateMachine.transition(EVENTS.START);

      // Run startup handler
      const startupResult = await startup.handleStartup({
        projectPath: this.projectPath,
        answers: options.answers,
        emitter: this.emitter,
        stateMachine: this.stateMachine
      });

      if (!startupResult.success) {
        return { success: false, error: startupResult.error };
      }

      // Create/update manifest
      await this.initializeManifest(startupResult.answers);
      this.emitter.emit(EVENTS.MANIFEST_CREATED);

      // Spawn dashboard
      if (this.config.dashboardEnabled) {
        await this.spawnDashboard();
      } else {
        this.emitter.emit(EVENTS.DASHBOARD_READY);
      }

      // Spawn worker for first phase
      this.currentPhase = startupResult.answers.startPhase || '2';
      await this.spawnWorker(this.currentPhase);

      // Spawn supervisor
      if (this.config.supervisorEnabled) {
        await this.spawnSupervisor();
      } else {
        this.emitter.emit(EVENTS.SUPERVISOR_READY);
      }

      // Start monitoring
      this.workerMonitor.start({
        checkTodos: () => this.checkWorkerTodos()
      });

      // Wait for completion or user quit
      return await this.waitForCompletion();

    } catch (error) {
      await this.handleErrorEvent({ payload: { error } });
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize manifest
   * @param {Object} answers - Startup answers
   */
  async initializeManifest(answers) {
    // Check for existing manifest
    const existing = manifest.readManifest(this.projectPath);

    if (existing) {
      this.manifest = existing;
      // Update with new answers
      manifest.updateManifest(this.projectPath, {
        stack: answers.stack,
        mode: answers.mode,
        status: 'running',
        currentPhase: answers.startPhase || '2'
      });
    } else {
      // Create new manifest
      this.manifest = manifest.createDefaultManifest();
      this.manifest.project = {
        name: path.basename(this.projectPath),
        path: this.projectPath
      };
      this.manifest.stack = answers.stack;
      this.manifest.mode = answers.mode;
      this.manifest.status = 'running';
      this.manifest.currentPhase = answers.startPhase || '2';

      manifest.writeManifest(this.projectPath, this.manifest);
    }
  }

  /**
   * Spawn dashboard process
   */
  async spawnDashboard() {
    try {
      const result = await processManager.spawnDashboard(this.projectPath);
      this.processes.dashboard = result;
      this.emitter.emit(EVENTS.DASHBOARD_READY);
    } catch (error) {
      this.emitter.emit(EVENTS.DASHBOARD_FAILED, { error });
    }
  }

  /**
   * Spawn worker process
   * @param {string} phase - Phase number
   */
  async spawnWorker(phase) {
    try {
      // Compose CLAUDE.md for phase
      const claudeContent = composer.compose(phase, {
        projectName: this.manifest.project.name,
        projectPath: this.projectPath
      });

      // Write to project
      composer.writeToProject(this.projectPath, claudeContent, { validate: false });

      // Spawn worker
      const result = await processManager.spawnWorker(this.projectPath, {
        phase,
        command: phaseTransition.getPhaseInfo(phase)?.command
      });

      this.processes.worker = result;

      // Send BEGIN message
      await processManager.sendBeginMessage(this.projectPath, {
        phase,
        projectName: this.manifest.project.name
      });

      this.emitter.emit(EVENTS.WORKER_READY, { phase });

    } catch (error) {
      this.emitter.emit(EVENTS.WORKER_FAILED, { error });
    }
  }

  /**
   * Spawn supervisor process
   */
  async spawnSupervisor() {
    try {
      const result = await processManager.spawnSupervisor(this.projectPath);
      this.processes.supervisor = result;
      this.emitter.emit(EVENTS.SUPERVISOR_READY);
    } catch (error) {
      this.emitter.emit(EVENTS.SUPERVISOR_FAILED, { error });
    }
  }

  /**
   * Check worker todos from manifest
   * @returns {Object[]} Current todos
   */
  async checkWorkerTodos() {
    const currentManifest = manifest.readManifest(this.projectPath);
    if (!currentManifest) return [];

    const phaseData = currentManifest.phases?.[this.currentPhase];
    return phaseData?.todos || [];
  }

  /**
   * Handle phase completion
   */
  async handlePhaseComplete() {
    // Update manifest
    manifest.updateManifest(this.projectPath, {
      [`phases.${this.currentPhase}.status`]: 'complete',
      [`phases.${this.currentPhase}.completedAt`]: new Date().toISOString()
    });

    // Check for next phase
    const result = phaseTransition.handlePhaseComplete({
      manifest: manifest.readManifest(this.projectPath),
      emitter: this.emitter
    });

    if (result.pipelineComplete) {
      this.pipelineComplete = true;
      this.emitter.emit(EVENTS.PIPELINE_COMPLETE);
      return;
    }

    // Auto-transition to next phase
    if (this.config.autoTransition && result.nextPhase) {
      this.currentPhase = result.nextPhase;
      this.stateMachine.transition(EVENTS.START);

      // Kill old worker, spawn new
      await processManager.killWorker(this.projectPath);
      await this.spawnWorker(result.nextPhase);
    }
  }

  /**
   * Handle pipeline completion
   */
  async handlePipelineComplete() {
    // Stop monitoring
    this.workerMonitor.stop();

    // Collect ratings if enabled
    if (this.config.collectRatings) {
      this.stateMachine.transition(EVENTS.START);
      try {
        const ratingResult = await rating.collectAndSaveRatings(
          this.projectPath,
          this.manifest.project.name,
          { quick: true, skipSave: false }
        );
        this.emitter.emit(EVENTS.RATINGS_COLLECTED, ratingResult);
      } catch {
        this.emitter.emit(EVENTS.RATINGS_SKIPPED);
      }
    }

    // Run analysis if enabled
    if (this.config.runAnalysis) {
      try {
        const analysisResult = analyzer.generateReport(
          path.join(this.projectPath, '.pipeline', 'ratings.jsonl')
        );
        this.emitter.emit(EVENTS.ANALYSIS_COMPLETE, analysisResult);
      } catch {
        // Analysis is optional
      }
    }

    // Update manifest
    manifest.updateManifest(this.projectPath, {
      status: 'complete',
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Handle error event
   * @param {Object} event - Error event
   */
  async handleErrorEvent(event) {
    const error = event.payload?.error || event;

    const result = await handleError(error, this.errorContext, {
      RESTART_WORKER: async () => {
        await this.spawnWorker(this.currentPhase);
      },
      CHECK_WORKER: async () => {
        const alive = processManager.isWorkerAlive(this.projectPath);
        if (!alive) {
          await this.spawnWorker(this.currentPhase);
        }
      }
    });

    if (!result.recovered) {
      this.stateMachine.transition(EVENTS.FATAL_ERROR);
    }
  }

  /**
   * Wait for pipeline completion
   * @returns {Promise<Object>} Completion result
   */
  async waitForCompletion() {
    return new Promise((resolve) => {
      const checkComplete = setInterval(() => {
        if (this.stateMachine.isTerminal()) {
          clearInterval(checkComplete);
          resolve({
            success: this.stateMachine.isIn(STATES.DONE),
            state: this.stateMachine.getState(),
            pipelineComplete: this.pipelineComplete
          });
        }
      }, 1000);
    });
  }

  /**
   * Stop orchestrator
   * @param {string} [reason] - Stop reason
   */
  async stop(reason = 'MANUAL') {
    const state = await shutdown.executeShutdown({
      monitor: this.workerMonitor,
      killSupervisor: () => processManager.killSupervisor(this.projectPath),
      killWorker: () => processManager.killWorker(this.projectPath),
      killDashboard: () => processManager.killDashboard(this.projectPath),
      cleanupPids: () => processManager.clearAllPids(this.projectPath),
      updateManifest: (updates) => manifest.updateManifest(this.projectPath, updates),
      pipelineComplete: this.pipelineComplete
    }, reason);

    console.log(shutdown.formatShutdownMessage(state));

    this.stateMachine.transition(EVENTS.SHUTDOWN);

    return state;
  }

  /**
   * Get current status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      state: this.stateMachine.getState(),
      phase: this.currentPhase,
      manifest: this.manifest,
      monitor: this.workerMonitor.getStatus(),
      errors: this.errorContext.getRecentErrors(5),
      eventHistory: this.eventHistory.getAll().slice(-20)
    };
  }
}

/**
 * Run orchestrator (convenience function)
 * @param {string} projectPath - Project root path
 * @param {Object} [options] - Runner options
 * @returns {Promise<Object>} Run result
 */
async function run(projectPath, options = {}) {
  const runner = new OrchestratorRunner(projectPath, options);

  // Setup signal handlers
  const cleanup = shutdown.setupSignalHandlers((reason) => {
    runner.stop(reason);
  });

  try {
    const result = await runner.start(options);
    return result;
  } finally {
    cleanup();
  }
}

module.exports = {
  DEFAULT_CONFIG,
  OrchestratorRunner,
  run
};
