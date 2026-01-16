/**
 * TUI Injection Module
 *
 * Injects messages from Live Canvas into Claude Code's stdin using
 * the Windows kernel32 WriteConsoleInput API via PowerShell.
 */

import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the injection script (relative to Pipeline-Office)
const INJECT_SCRIPT = join(__dirname, "../../../lib/inject-worker-message.ps1");

// Environment variable or file for Claude PID
let claudePid: number | null = null;

/**
 * Set the Claude Code PID to inject messages into
 */
export function setClaudePid(pid: number): void {
  claudePid = pid;
  console.error(`[Inject] Claude PID set to: ${pid}`);
}

/**
 * Get the Claude Code PID from various sources
 */
export function getClaudePid(): number | null {
  // If explicitly set, use that
  if (claudePid) {
    return claudePid;
  }

  // Check environment variable
  if (process.env.CLAUDE_PID) {
    return parseInt(process.env.CLAUDE_PID, 10);
  }

  // Check .pipeline/claude.pid file (if project dir is set)
  const projectDir = process.env.CANVAS_PROJECT_DIR || process.cwd();
  const pidFile = join(projectDir, ".pipeline", "claude.pid");
  if (existsSync(pidFile)) {
    try {
      const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
      if (!isNaN(pid)) {
        return pid;
      }
    } catch {
      // Ignore errors
    }
  }

  return null;
}

/**
 * Format a message for injection into Claude
 */
export function formatInteractiveMessage(options: {
  message: string;
  whiteboardPath?: string;
  notes?: string;
}): string {
  const lines: string[] = [
    "[INTERACTIVE INPUT]",
    "",
  ];

  // Add message
  lines.push("MESSAGE:");
  lines.push(options.message);
  lines.push("");

  // Add whiteboard image path if present
  if (options.whiteboardPath) {
    lines.push(`WHITEBOARD: [See attached image: ${options.whiteboardPath}]`);
    lines.push("");
  }

  // Add notes if present
  if (options.notes) {
    lines.push("NOTES:");
    lines.push(options.notes);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Inject a message into Claude Code's stdin
 */
export async function injectMessage(
  message: string,
  options: {
    noEnter?: boolean;
    interrupt?: boolean;
    targetPid?: number;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const pid = options.targetPid || getClaudePid();

  if (!pid) {
    return {
      success: false,
      error: "Claude PID not set. Set CLAUDE_PID env var or call /api/inject/pid first.",
    };
  }

  // Check if injection script exists
  if (!existsSync(INJECT_SCRIPT)) {
    return {
      success: false,
      error: `Injection script not found: ${INJECT_SCRIPT}`,
    };
  }

  // Build PowerShell command
  const args = [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", INJECT_SCRIPT,
    "-WorkerPID", pid.toString(),
    "-Message", message,
  ];

  if (options.noEnter) {
    args.push("-NoEnter");
  }

  if (options.interrupt) {
    args.push("-Interrupt");
  }

  return new Promise((resolve) => {
    console.error(`[Inject] Sending to PID ${pid}: ${message.slice(0, 100)}...`);

    const ps = spawn("powershell.exe", args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    ps.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ps.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ps.on("close", (code) => {
      if (code === 0) {
        console.error(`[Inject] Success: ${stdout.trim()}`);
        resolve({ success: true });
      } else {
        console.error(`[Inject] Failed (code ${code}): ${stderr || stdout}`);
        resolve({
          success: false,
          error: stderr || stdout || `Process exited with code ${code}`,
        });
      }
    });

    ps.on("error", (err) => {
      console.error(`[Inject] Error: ${err.message}`);
      resolve({
        success: false,
        error: err.message,
      });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      ps.kill();
      resolve({
        success: false,
        error: "Injection timed out after 10 seconds",
      });
    }, 10000);
  });
}

/**
 * Inject an interactive input (message + optional whiteboard/notes)
 */
export async function injectInteractiveInput(options: {
  message: string;
  whiteboardPath?: string;
  notes?: string;
  targetPid?: number;
}): Promise<{ success: boolean; error?: string }> {
  const formattedMessage = formatInteractiveMessage({
    message: options.message,
    whiteboardPath: options.whiteboardPath,
    notes: options.notes,
  });

  return injectMessage(formattedMessage, {
    targetPid: options.targetPid,
  });
}
