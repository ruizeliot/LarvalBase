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

Test Mode (internal):
  --test-component <name>      Run a test component
  --test-hook <name>           Run a test hook
  --test-mode                  Run static app test (no keyboard input)

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

// Main entry point - dispatch based on flags
async function main() {
  // Handle --test-mode flag for E2E testing the main app UI (no useInput)
  if (args.includes('--test-mode')) {
    const testComponents = await import('./test-components/index.js');
    render(React.createElement(testComponents.AppStaticTest));
    return;
  }

  // Handle --test-component flag for E2E tests
  const testComponentIdx = args.indexOf('--test-component');
  if (testComponentIdx !== -1) {
    const componentName = args[testComponentIdx + 1];
    const emptyFlag = args.includes('--empty');
    const placeholderIdx = args.indexOf('--placeholder');
    const placeholder = placeholderIdx !== -1 ? args[placeholderIdx + 1] : undefined;
    const valueIdx = args.indexOf('--value');
    const value = valueIdx !== -1 ? parseInt(args[valueIdx + 1], 10) : undefined;

    // Simulation flags for testing without stdin
    const simulateInputIdx = args.indexOf('--simulate-input');
    const simulateInput = simulateInputIdx !== -1 ? args[simulateInputIdx + 1] : undefined;
    const simulatePlaceholder = args.includes('--simulate-placeholder');
    const simulateDown = args.includes('--simulate-down');
    const simulateToggle = args.includes('--simulate-toggle');
    const simulatePress = args.includes('--simulate-press');
    const simulateClose = args.includes('--simulate-close');
    const simulateResize = args.includes('--simulate-resize');

    const testComponents = await import('./test-components/index.js');
    let TestComponent: React.FC<any> | null = null;
    let props: Record<string, any> = {};

    switch (componentName) {
      case 'box':
        TestComponent = testComponents.BoxTest;
        if (emptyFlag) props.empty = true;
        break;
      case 'text':
        TestComponent = testComponents.TextTest;
        if (emptyFlag) props.empty = true;
        break;
      case 'input':
        TestComponent = testComponents.InputTest;
        if (placeholder) props.placeholder = placeholder;
        if (simulateInput) props.simulateInput = simulateInput;
        if (simulatePlaceholder) props.simulatePlaceholder = true;
        break;
      case 'select':
        TestComponent = testComponents.SelectTest;
        if (simulateDown) props.simulateDown = true;
        break;
      case 'radio':
        TestComponent = testComponents.RadioTest;
        props.simulateSelect = true;  // Always use simulation mode for radio tests
        break;
      case 'checkbox':
        TestComponent = testComponents.CheckboxTest;
        if (simulateToggle) props.simulateToggle = true;
        break;
      case 'button':
        TestComponent = testComponents.ButtonTest;
        if (simulatePress) props.simulatePress = true;
        break;
      case 'progress':
        TestComponent = testComponents.ProgressTest;
        if (value !== undefined) props.value = value;
        break;
      case 'spinner':
        TestComponent = testComponents.SpinnerTest;
        break;
      case 'divider':
        TestComponent = testComponents.DividerTest;
        break;
      case 'screen':
        TestComponent = testComponents.ScreenTest;
        break;
      case 'modal':
        TestComponent = testComponents.ModalTest;
        if (simulateClose) props.simulateClose = true;
        break;
      case 'splitpane':
        TestComponent = testComponents.SplitPaneTest;
        if (simulateResize) props.simulateResize = true;
        break;
      default:
        console.error(`Unknown test component: ${componentName}`);
        process.exit(1);
    }

    if (TestComponent) {
      render(React.createElement(TestComponent, props));
    }
    return;
  }

  // Handle --test-hook flag for E2E tests
  const testHookIdx = args.indexOf('--test-hook');
  if (testHookIdx !== -1) {
    const hookName = args[testHookIdx + 1];

    // Simulation flags for testing without stdin
    const simulateKeyIdx = args.indexOf('--simulate-key');
    const simulateKey = simulateKeyIdx !== -1 ? args[simulateKeyIdx + 1] : undefined;
    const simulateQuit = args.includes('--simulate-quit');

    const testComponents = await import('./test-components/index.js');
    let TestComponent: React.FC<any> | null = null;
    let props: Record<string, any> = {};

    switch (hookName) {
      case 'useInput':
        TestComponent = testComponents.UseInputTest;
        if (simulateKey) props.simulateKey = simulateKey;
        break;
      case 'useApp':
        TestComponent = testComponents.UseAppTest;
        if (simulateQuit) props.simulateQuit = true;
        break;
      default:
        console.error(`Unknown test hook: ${hookName}`);
        process.exit(1);
    }

    if (TestComponent) {
      render(React.createElement(TestComponent, props));
    }
    return;
  }

  // Normal app mode - parse positional arguments
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
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
