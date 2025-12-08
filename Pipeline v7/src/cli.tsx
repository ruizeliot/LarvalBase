#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { App } from './App.js';

const cli = meow(`
  Pipeline v7 - TUI Dashboard for Pipeline Orchestration

  Usage
    $ pipeline [options]

  Options
    --project, -p     Project path to open directly
    --test-component  Run component test mode
    --test-hook       Run hook test mode
    --test-focus      Run focus test mode
    --version, -v     Show version
    --help, -h        Show help

  Examples
    $ pipeline
    $ pipeline --project /path/to/project
    $ pipeline -p ./my-project
`, {
  importMeta: import.meta,
  flags: {
    project: {
      type: 'string',
      shortFlag: 'p',
    },
    testComponent: {
      type: 'string',
    },
    testHook: {
      type: 'string',
    },
    testFocus: {
      type: 'string',
    },
  },
});

const { project, testComponent, testHook, testFocus } = cli.flags;

// Render the app
render(
  <App
    projectPath={project}
    testComponent={testComponent}
    testHook={testHook}
    testFocus={testFocus}
  />
);
