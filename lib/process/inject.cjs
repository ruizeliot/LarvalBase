/**
 * Message Injection Module
 *
 * Inject messages into running Claude processes.
 */

'use strict';

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readPid } = require('./pid.cjs');

/**
 * Inject a message into a running Claude process using SendKeys
 * This is a Windows-specific approach using PowerShell
 * @param {number} pid - Target process PID
 * @param {string} message - Message to inject
 * @returns {Promise<boolean>}
 */
async function injectMessage(pid, message) {
  // Escape special characters for PowerShell
  const escapedMessage = message
    .replace(/'/g, "''")
    .replace(/\n/g, '`n');

  // PowerShell script to send keystrokes to the process window
  const script = `
    Add-Type -AssemblyName System.Windows.Forms

    # Find the window for the process
    $process = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
    if (-not $process) {
      Write-Error "Process ${pid} not found"
      exit 1
    }

    # Get the main window handle
    $hwnd = $process.MainWindowHandle
    if ($hwnd -eq 0) {
      # Try to find any window associated with the process
      Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;

    public class Win32 {
      [DllImport("user32.dll")]
      public static extern bool SetForegroundWindow(IntPtr hWnd);

      [DllImport("user32.dll")]
      public static extern IntPtr GetForegroundWindow();
    }
"@
      Write-Error "Cannot find window for process ${pid}"
      exit 1
    }

    # Bring window to foreground and send keys
    [Win32]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 100

    # Send the message
    [System.Windows.Forms.SendKeys]::SendWait('${escapedMessage}')

    # Send Enter to submit
    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
  `;

  return new Promise((resolve) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script
    ], {
      windowsHide: true
    });

    let stderr = '';

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.error('Inject failed:', stderr);
        resolve(false);
      }
    });

    ps.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Inject message to worker by role
 * @param {string} projectPath - Project path
 * @param {string} role - Process role
 * @param {string} message - Message to inject
 * @returns {Promise<boolean>}
 */
async function injectToRole(projectPath, role, message) {
  const pidData = readPid(projectPath, role);

  if (!pidData) {
    console.error(`No ${role} process found`);
    return false;
  }

  return injectMessage(pidData.pid, message);
}

/**
 * Inject message to the current worker
 * @param {string} projectPath - Project path
 * @param {string} message - Message to inject
 * @returns {Promise<boolean>}
 */
function injectToWorker(projectPath, message) {
  return injectToRole(projectPath, 'worker', message);
}

/**
 * Inject BEGIN message to start a phase
 * @param {string} projectPath - Project path
 * @param {string} phase - Phase number
 * @returns {Promise<boolean>}
 */
function sendBeginMessage(projectPath, phase) {
  const message = `BEGIN Phase ${phase}`;
  return injectToWorker(projectPath, message);
}

/**
 * Inject a slash command to the worker
 * @param {string} projectPath - Project path
 * @param {string} command - Slash command (with leading /)
 * @returns {Promise<boolean>}
 */
function sendSlashCommand(projectPath, command) {
  // Ensure command starts with /
  const cmd = command.startsWith('/') ? command : '/' + command;
  return injectToWorker(projectPath, cmd);
}

/**
 * Write a message to a file that the worker can read
 * This is an alternative to SendKeys that works more reliably
 * @param {string} projectPath - Project path
 * @param {string} message - Message to write
 * @param {string} filename - File name (default: orchestrator-message.txt)
 */
function writeMessageFile(projectPath, message, filename = 'orchestrator-message.txt') {
  const filePath = path.join(projectPath, '.pipeline', filename);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify({
    message,
    timestamp: new Date().toISOString()
  }), 'utf8');
}

/**
 * Read and delete a message file
 * @param {string} projectPath - Project path
 * @param {string} filename - File name
 * @returns {Object|null}
 */
function readMessageFile(projectPath, filename = 'orchestrator-message.txt') {
  const filePath = path.join(projectPath, '.pipeline', filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    fs.unlinkSync(filePath); // Delete after reading
    return JSON.parse(content);
  } catch {
    return null;
  }
}

module.exports = {
  injectMessage,
  injectToRole,
  injectToWorker,
  sendBeginMessage,
  sendSlashCommand,
  writeMessageFile,
  readMessageFile
};
