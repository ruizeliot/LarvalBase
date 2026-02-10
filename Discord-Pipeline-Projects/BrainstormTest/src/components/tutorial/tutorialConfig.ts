import type { DriveStep } from 'driver.js'

export const TUTORIAL_STORAGE_KEY = 'cascadesim-tutorial-complete'
export const FIRST_USE_PREFIX = 'cascadesim-first-use-'

export interface TutorialStep extends DriveStep {
  actionRequired?: boolean
  actionPrompt?: string
  actionTestId?: string
}

export const tutorialSteps: TutorialStep[] = [
  {
    element: '.react-flow',
    popover: {
      title: 'Canvas Navigation',
      description: 'This is your workspace. Pan by dragging the background, zoom with scroll wheel or the controls in the bottom-left.',
    },
  },
  {
    element: '[data-testid="component-palette"]',
    popover: {
      title: 'Component Palette',
      description: 'Drag components from here onto the canvas to build your model. Try dragging an Internal component now!',
    },
    actionRequired: true,
    actionPrompt: 'Drag an Internal component onto the canvas',
    actionTestId: 'tutorial-action-step-2',
  },
  {
    element: '[data-testid="left-panel"]',
    popover: {
      title: 'Property Editor',
      description: 'Select a component to edit its name, parameters, and capacities here. Try changing the component name!',
    },
    actionRequired: true,
    actionPrompt: 'Change the component\'s name in the property editor',
    actionTestId: 'tutorial-action-step-3',
  },
  {
    element: '.react-flow',
    popover: {
      title: 'Causal Chain Builder',
      description: 'Right-click any component to create a causal chain. Chains model cause-and-effect relationships between components.',
    },
    actionRequired: true,
    actionPrompt: 'Right-click a component and select "New Causal Chain from here"',
    actionTestId: 'tutorial-action-step-4',
  },
  {
    element: '[data-testid="tab-scenarios"]',
    popover: {
      title: 'Scenario Tab',
      description: 'Switch to the Scenarios tab to define test scenarios with forced events that trigger cascading effects.',
    },
  },
  {
    element: '[data-testid="tab-scenarios"]',
    popover: {
      title: 'Forced Events & Timeline',
      description: 'In the Scenarios view, you can place forced events on a timeline to set up "what-if" situations for your model.',
    },
  },
  {
    element: '[data-testid="tab-simulate"]',
    popover: {
      title: 'Simulate Tab',
      description: 'Run your simulation here to watch cascading effects propagate through your model. Click the Run button to start!',
    },
    actionRequired: true,
    actionPrompt: 'Click the "Run Simulation" button to see your model in action',
    actionTestId: 'tutorial-action-step-7',
  },
  {
    element: '[data-testid="library-button"]',
    popover: {
      title: 'Scenario Library',
      description: 'Browse pre-built example scenarios to learn from. Load any scenario to explore a working model instantly!',
    },
  },
]
