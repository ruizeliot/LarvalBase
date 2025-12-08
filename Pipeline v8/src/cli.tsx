#!/usr/bin/env node
/**
 * CLI Entry Point
 * Pipeline v8
 *
 * US-001-004: CLI entry point and flags
 */
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

const VERSION = '8.0.0';

// Parse CLI arguments
const args = process.argv.slice(2);

// US-003: Help flag
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Pipeline v${VERSION} - Terminal TUI dashboard for Claude pipeline workflows

Usage:
  pipeline [options] [path]

Arguments:
  path                    Project path (optional, defaults to current directory)

Options:
  -h, --help              Show this help message
  -v, --version           Show version number
  --check                 Check if terminal supports TUI (for non-TTY detection)

Examples:
  pipeline                         Start with current directory
  pipeline /path/to/project        Start with specific project
  pipeline --help                  Show help
`);
  process.exit(0);
}

// US-004: Version flag
if (args.includes('--version') || args.includes('-v')) {
  console.log(VERSION);
  process.exit(0);
}

// US-001: Check flag (for non-TTY environments)
if (args.includes('--check')) {
  console.log('ok');
  process.exit(0);
}

// US-002: Parse path argument
const pathArg = args.find((arg) => !arg.startsWith('-'));

// Render the app
render(<App initialPath={pathArg} />);
