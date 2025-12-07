#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

// Parse command line arguments
const args = process.argv.slice(2);

// Handle --help flag
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Pipeline v7 - TUI Pipeline Orchestrator

Usage:
  pipeline [options] [project-path]

Commands:
  pipeline                     Launch TUI launcher
  pipeline <path>              Open/resume project at path
  pipeline new <path>          Start new project at path
  pipeline resume <path>       Resume existing pipeline

Options:
  -h, --help                   Show this help message
  -v, --version                Show version number
  --type <desktop|terminal>    Set pipeline type
  --mode <new|feature|fix>     Set pipeline mode

Examples:
  pipeline                     # Launch launcher screen
  pipeline /path/to/project    # Open project (detects existing)
  pipeline new /path/to/proj   # Start new project
  pipeline resume /path        # Resume from saved state

For more information, visit: https://github.com/imt/pipeline
`);
  process.exit(0);
}

// Handle --version flag
if (args.includes('--version') || args.includes('-v')) {
  console.log('7.0.0');
  process.exit(0);
}

// Parse positional arguments
let command = '';
let projectPath = '';
let resume = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === 'new' || arg === 'resume') {
    command = arg;
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      projectPath = args[i + 1];
      i++;
    }
  } else if (!arg.startsWith('-')) {
    projectPath = arg;
  }
}

// Determine if resuming
if (command === 'resume') {
  resume = true;
}

// Render the app
render(<App initialPath={projectPath || undefined} resume={resume} />);
