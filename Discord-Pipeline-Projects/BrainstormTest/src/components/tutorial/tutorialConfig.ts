import type { DriveStep } from 'driver.js'

export const TUTORIAL_STORAGE_KEY = 'cascadesim-tutorial-complete'
export const FIRST_USE_PREFIX = 'cascadesim-first-use-'

export interface TutorialStep extends DriveStep {
  actionRequired?: boolean
  actionPrompt?: string
  actionTestId?: string
}

export const tutorialSteps: TutorialStep[] = [
  // Step 0: Welcome — explain the app (no element = centered popover, no overlay)
  {
    popover: {
      title: 'Welcome to CascadeSim',
      description: 'CascadeSim lets you model and simulate cascading effects through causal chain networks. Build components, connect them with cause-and-effect chains, and run simulations to see how changes propagate.',
    },
  },
  // Step 1: Drag an Internal component from palette to canvas
  {
    element: '[data-testid="component-palette"]',
    popover: {
      title: 'Add Your First Component',
      description: 'Drag an <strong>Internal</strong> component from this palette onto the canvas to start building your model.',
    },
    actionRequired: true,
    actionPrompt: 'Drag an Internal component onto the canvas',
    actionTestId: 'tutorial-action-step-1',
  },
  // Step 2: Rename the component and add a parameter
  {
    element: '[data-testid="left-panel"]',
    popover: {
      title: 'Configure Your Component',
      description: 'Click the component on the canvas to select it, then use this panel to rename it or add a parameter.',
    },
    actionRequired: true,
    actionPrompt: 'Rename the component or add a parameter',
    actionTestId: 'tutorial-action-step-2',
  },
  // Step 3: Drag a second component
  {
    element: '[data-testid="component-palette"]',
    popover: {
      title: 'Add a Second Component',
      description: 'Drag another component onto the canvas. You need at least two components to create a causal chain between them.',
    },
    actionRequired: true,
    actionPrompt: 'Drag a second component onto the canvas',
    actionTestId: 'tutorial-action-step-3',
  },
  // Step 4: Create a causal chain (right-click → New Chain)
  {
    element: '.react-flow',
    popover: {
      title: 'Create a Causal Chain',
      description: 'Right-click any component on the canvas and select <strong>"New Causal Chain from here"</strong> to model a cause-and-effect relationship.',
    },
    actionRequired: true,
    actionPrompt: 'Right-click a component and select "New Causal Chain from here"',
    actionTestId: 'tutorial-action-step-4',
  },
  // Step 5: Switch to Scenarios tab, create a scenario
  {
    element: '[data-testid="tab-scenarios"]',
    popover: {
      title: 'Set Up a Scenario',
      description: 'Switch to the <strong>Scenarios</strong> tab and create a scenario with forced events to define "what-if" situations for your model.',
    },
    actionRequired: true,
    actionPrompt: 'Switch to Scenarios and create a new scenario',
    actionTestId: 'tutorial-action-step-5',
  },
  // Step 6: Switch to Simulate tab, run the simulation
  {
    element: '[data-testid="tab-simulate"]',
    popover: {
      title: 'Run Your Simulation',
      description: 'Switch to the <strong>Simulate</strong> tab and click <strong>Run Simulation</strong> to watch cascading effects propagate through your model.',
    },
    actionRequired: true,
    actionPrompt: 'Click the "Run Simulation" button',
    actionTestId: 'tutorial-action-step-6',
  },
]
