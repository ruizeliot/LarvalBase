/**
 * Process Spawning Module
 *
 * Spawns Claude processes in Windows Terminal.
 */

'use strict';

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { savePid, readPid, removePid } = require('./pid.cjs');

/**
 * Dashboard script mapping by version
 */
const DASHBOARD_SCRIPTS = {
  'v9': 'dashboard-v2.cjs',
  'v10': 'dashboard-v3.cjs',
  'v11': 'dashboard-runner-v11.cjs'
};

/**
 * Get the dashboard script path for a given version
 * @param {string} version - Dashboard version ('v9', 'v10', 'v11', or 'auto')
 * @param {string} projectPath - Project path (for auto-detection from manifest)
 * @returns {string} Full path to dashboard script
 */
function getDashboardScript(version = 'auto', projectPath = null) {
  const pipelineOffice = path.dirname(path.dirname(__dirname));

  // Auto-detect from manifest
  if (version === 'auto' && projectPath) {
    try {
      const manifestPath = path.join(projectPath, '.pipeline', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const manifestVersion = manifest.version || '9.0.0';

        if (manifestVersion.startsWith('11')) {
          version = 'v11';
        } else if (manifestVersion.startsWith('10')) {
          version = 'v10';
        } else {
          version = 'v9';
        }
      }
    } catch (err) {
      // Fall back to v11 as default
      version = 'v11';
    }
  }

  // Default to v11 if still auto
  if (version === 'auto') {
    version = 'v11';
  }

  const scriptName = DASHBOARD_SCRIPTS[version] || DASHBOARD_SCRIPTS['v11'];
  return path.join(pipelineOffice, 'lib', scriptName);
}

/**
 * Get the PowerShell script directory
 * @returns {string}
 */
function getScriptsDir() {
  return __dirname;
}

/**
 * Execute a PowerShell command
 * @param {string} command - PowerShell command
 * @param {Object} options - Spawn options
 * @returns {Promise<{ stdout: string, stderr: string, code: number }>}
 */
function executePowerShell(command, options = {}) {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      windowsHide: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
    });

    ps.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Spawn a Claude worker process in Windows Terminal
 * @param {string} projectPath - Project path
 * @param {string} orchestratorPid - Orchestrator PID (for window grouping)
 * @param {string} phase - Current phase ('2', '3', '4', '5')
 * @param {Object} options - Spawn options
 * @returns {Promise<{ pid: number }>}
 */
async function spawnWorker(projectPath, orchestratorPid, phase, options = {}) {
  const { model = 'default' } = options;

  // Build the Claude command
  const claudeArgs = model === 'haiku' ? '--model haiku' : '';
  const skipPerms = '--dangerously-skip-permissions';

  // Command to run in new terminal pane
  const phaseCommand = `/execute-phase-${phase}`;
  const workerCommand = `cd '${projectPath}'; claude ${claudeArgs} ${skipPerms}`;

  // Use Windows Terminal to spawn in split pane
  const wtCommand = `wt -w "Pipeline-${orchestratorPid}" split-pane -H -s 0.5 --title "Worker" pwsh -NoExit -Command "${workerCommand}"`;

  try {
    const result = await executePowerShell(wtCommand);

    if (result.code !== 0 && result.stderr) {
      throw new Error(`Failed to spawn worker: ${result.stderr}`);
    }

    // We can't get the actual PID from wt command easily
    // For now, save a placeholder and update later via heartbeat
    const workerData = {
      phase,
      model,
      orchestratorPid,
      command: workerCommand
    };

    // Try to get the Claude process PID
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for process to start

    const findPidResult = await executePowerShell(
      `Get-Process claude -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddSeconds(-5) } | Select-Object -First 1 -ExpandProperty Id`
    );

    const pid = parseInt(findPidResult.stdout, 10) || Date.now(); // Use timestamp as fallback

    savePid(projectPath, 'worker', pid, workerData);

    return { pid };
  } catch (err) {
    throw new Error(`Failed to spawn worker: ${err.message}`);
  }
}

/**
 * Spawn a supervisor process (Haiku model)
 * @param {string} projectPath - Project path
 * @param {string} orchestratorPid - Orchestrator PID
 * @returns {Promise<{ pid: number }>}
 */
async function spawnSupervisor(projectPath, orchestratorPid) {
  const workerCommand = `cd '${projectPath}'; claude --model haiku --dangerously-skip-permissions`;

  const wtCommand = `wt -w "Pipeline-${orchestratorPid}" split-pane -V -s 0.3 --title "Supervisor" pwsh -NoExit -Command "${workerCommand}"`;

  try {
    const result = await executePowerShell(wtCommand);

    if (result.code !== 0 && result.stderr) {
      throw new Error(`Failed to spawn supervisor: ${result.stderr}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    const findPidResult = await executePowerShell(
      `Get-Process claude -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddSeconds(-5) } | Select-Object -Last 1 -ExpandProperty Id`
    );

    const pid = parseInt(findPidResult.stdout, 10) || Date.now();

    savePid(projectPath, 'supervisor', pid, { orchestratorPid, model: 'haiku' });

    return { pid };
  } catch (err) {
    throw new Error(`Failed to spawn supervisor: ${err.message}`);
  }
}

/**
 * Spawn the dashboard in a new terminal pane
 * @param {string} projectPath - Project path
 * @param {string} orchestratorPid - Orchestrator PID
 * @param {Object} options - Spawn options
 * @param {string} options.version - Dashboard version ('v9', 'v10', 'v11', 'auto')
 * @returns {Promise<{ pid: number }>}
 */
async function spawnDashboard(projectPath, orchestratorPid, options = {}) {
  const { version = 'auto' } = options;
  const dashboardScript = getDashboardScript(version, projectPath);

  const dashboardCommand = `cd '${projectPath}'; node '${dashboardScript}' '${projectPath}' ${orchestratorPid}`;

  const wtCommand = `wt -w "Pipeline-${orchestratorPid}" split-pane -V -s 0.25 --title "Dashboard" pwsh -NoExit -Command "${dashboardCommand}"`;

  try {
    const result = await executePowerShell(wtCommand);

    if (result.code !== 0 && result.stderr) {
      throw new Error(`Failed to spawn dashboard: ${result.stderr}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const findPidResult = await executePowerShell(
      `Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddSeconds(-3) } | Select-Object -First 1 -ExpandProperty Id`
    );

    const pid = parseInt(findPidResult.stdout, 10) || Date.now();

    savePid(projectPath, 'dashboard', pid, { orchestratorPid });

    return { pid };
  } catch (err) {
    throw new Error(`Failed to spawn dashboard: ${err.message}`);
  }
}

/**
 * Create a new Windows Terminal window for the pipeline
 * @param {string} projectPath - Project path
 * @param {string} title - Window title
 * @returns {Promise<{ pid: number }>}
 */
async function createPipelineWindow(projectPath, title = 'Pipeline Orchestrator') {
  const wtCommand = `wt -w new --title "${title}" pwsh -NoExit -Command "cd '${projectPath}'"`;

  try {
    const result = await executePowerShell(wtCommand);

    if (result.code !== 0 && result.stderr) {
      throw new Error(`Failed to create window: ${result.stderr}`);
    }

    // Get the orchestrator's own PID
    const pid = process.pid;

    savePid(projectPath, 'orchestrator', pid, { title });

    return { pid };
  } catch (err) {
    throw new Error(`Failed to create pipeline window: ${err.message}`);
  }
}

module.exports = {
  getScriptsDir,
  executePowerShell,
  spawnWorker,
  spawnSupervisor,
  spawnDashboard,
  createPipelineWindow,
  getDashboardScript,
  DASHBOARD_SCRIPTS
};
