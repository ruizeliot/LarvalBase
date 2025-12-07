import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../../bin/cli.js');

interface TestHarness {
  process: ChildProcess;
  stdout: string[];
  stderr: string[];
  exitCode: number | null;
  send: (input: string) => void;
  waitForOutput: (pattern: RegExp, timeout?: number) => Promise<string>;
  waitForClose: () => Promise<number>;
  kill: () => void;
}

/**
 * Creates a test harness for running CLI tests
 */
export function createTestHarness(args: string[] = []): TestHarness {
  const proc = spawn('node', [CLI_PATH, ...args], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  const stdout: string[] = [];
  const stderr: string[] = [];
  let exitCode: number | null = null;

  proc.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter((l) => l);
    stdout.push(...lines);
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter((l) => l);
    stderr.push(...lines);
  });

  proc.on('close', (code) => {
    exitCode = code;
  });

  return {
    process: proc,
    stdout,
    stderr,
    get exitCode() {
      return exitCode;
    },
    set exitCode(code: number | null) {
      exitCode = code;
    },

    send(input: string): void {
      proc.stdin?.write(input);
    },

    async waitForOutput(pattern: RegExp, timeout = 5000): Promise<string> {
      const startTime = Date.now();

      return new Promise((resolve, reject) => {
        const check = () => {
          for (const line of stdout) {
            if (pattern.test(line)) {
              resolve(line);
              return;
            }
          }

          if (Date.now() - startTime > timeout) {
            reject(
              new Error(
                `Timeout waiting for output matching ${pattern}. Got: ${stdout.join(
                  '\n'
                )}`
              )
            );
            return;
          }

          setTimeout(check, 50);
        };

        check();
      });
    },

    async waitForClose(): Promise<number> {
      return new Promise((resolve) => {
        if (exitCode !== null) {
          resolve(exitCode);
          return;
        }

        proc.on('close', (code) => {
          resolve(code ?? 1);
        });
      });
    },

    kill(): void {
      proc.kill('SIGTERM');
    },
  };
}

/**
 * Helper to wait for specific output
 */
export async function waitForOutput(
  stdout: string[],
  pattern: RegExp,
  timeout = 5000
): Promise<string> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      for (const line of stdout) {
        if (pattern.test(line)) {
          resolve(line);
          return;
        }
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for ${pattern}`));
        return;
      }

      setTimeout(check, 50);
    };

    check();
  });
}

/**
 * Helper to send input to process
 */
export function sendInput(
  proc: ChildProcess,
  input: string,
  key?: { escape?: boolean; return?: boolean; tab?: boolean }
): void {
  if (key?.escape) {
    proc.stdin?.write('\x1b');
  } else if (key?.return) {
    proc.stdin?.write('\r');
  } else if (key?.tab) {
    proc.stdin?.write('\t');
  } else {
    proc.stdin?.write(input);
  }
}
