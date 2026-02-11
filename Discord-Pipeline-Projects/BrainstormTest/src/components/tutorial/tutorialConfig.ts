import type { DriveStep } from 'driver.js'

// localStorage keys
export const TUTORIAL_PROGRESS_KEY = 'cascadesim-tutorial-progress'
export const OLD_TUTORIAL_KEY = 'cascadesim-tutorial-complete'
export const FIRST_USE_PREFIX = 'cascadesim-first-use-'

export type PhaseStatus = 'locked' | 'available' | 'in-progress' | 'complete'

export interface PhaseProgress {
  status: PhaseStatus
  stepsCompleted: number[]
}

export interface TutorialProgress {
  phase1: PhaseProgress
  phase2: PhaseProgress
  phase3: PhaseProgress
  phase4: PhaseProgress
  welcomeSeen: boolean
}

export interface TutorialStep extends DriveStep {
  title: string
  description: string
  actionRequired: boolean
  actionPrompt?: string
  actionType?: string
}

export interface TutorialPhase {
  id: number
  title: string
  description: string
  steps: TutorialStep[]
}

export const DEFAULT_PROGRESS: TutorialProgress = {
  phase1: { status: 'available', stepsCompleted: [] },
  phase2: { status: 'locked', stepsCompleted: [] },
  phase3: { status: 'locked', stepsCompleted: [] },
  phase4: { status: 'locked', stepsCompleted: [] },
  welcomeSeen: false,
}

export const TUTORIAL_PHASES: TutorialPhase[] = [
  {
    id: 1,
    title: 'Solo Basics',
    description: 'Learn to drag components, configure them, create chains, build scenarios, and run simulations.',
    steps: [
      {
        element: '[data-testid="component-palette"]',
        title: 'Drag a Component',
        description: 'Drag an <strong>Internal</strong> component from this palette onto the canvas to start building your model.',
        actionRequired: true,
        actionPrompt: 'Drag an Internal component onto the canvas',
        actionType: 'drag-component',
        popover: { title: 'Drag a Component', description: '' },
      },
      {
        element: '[data-testid="left-panel"]',
        title: 'Configure It',
        description: 'Click the component on the canvas to select it, then use this panel to <strong>rename</strong> it and <strong>add a parameter</strong>.',
        actionRequired: true,
        actionPrompt: 'Rename the component and add a parameter',
        actionType: 'configure-component',
        popover: { title: 'Configure It', description: '' },
      },
      {
        element: '.react-flow',
        title: 'Create a Chain',
        description: 'Right-click a component and select <strong>"New Causal Chain from here"</strong> to model a cause-and-effect relationship.',
        actionRequired: true,
        actionPrompt: 'Right-click a component and create a causal chain',
        actionType: 'create-chain',
        popover: { title: 'Create a Chain', description: '' },
      },
      {
        element: '[data-testid="tab-scenarios"]',
        title: 'Build a Scenario',
        description: 'Switch to the <strong>Scenarios</strong> tab and add a forced event to define when and how your simulation starts.',
        actionRequired: true,
        actionPrompt: 'Switch to Scenarios and add a forced event',
        actionType: 'build-scenario',
        popover: { title: 'Build a Scenario', description: '' },
      },
      {
        element: '[data-testid="tab-simulate"]',
        title: 'Run Simulation',
        description: 'Switch to the <strong>Simulate</strong> tab and click <strong>Run</strong> to see cascading effects propagate through your model.',
        actionRequired: true,
        actionPrompt: 'Click Run Simulation',
        actionType: 'run-simulation',
        popover: { title: 'Run Simulation', description: '' },
      },
    ],
  },
  {
    id: 2,
    title: 'Advanced Modeling',
    description: 'Learn branching chains, parameter editing, ELK auto-layout, and re-layout options.',
    steps: [
      {
        element: '.react-flow',
        title: 'Branching Chains',
        description: 'Create a <strong>second chain</strong> that branches from the same source component, learning how one component can trigger multiple cascades.',
        actionRequired: true,
        actionPrompt: 'Create a branching chain from the same source',
        actionType: 'branching-chain',
        popover: { title: 'Branching Chains', description: '' },
      },
      {
        element: '[data-testid="left-panel"]',
        title: 'Edit Parameters',
        description: 'Add <strong>multiple parameters</strong> to a component and edit their values to see how they interact with conditions.',
        actionRequired: true,
        actionPrompt: 'Add and edit parameters on a component',
        actionType: 'edit-params',
        popover: { title: 'Edit Parameters', description: '' },
      },
      {
        element: '[data-testid="relayout-button"]',
        title: 'Auto-Layout',
        description: 'Click the <strong>Re-Layout</strong> button to let ELK automatically arrange your canvas for clarity.',
        actionRequired: true,
        actionPrompt: 'Click the Re-Layout button',
        actionType: 'auto-layout',
        popover: { title: 'Auto-Layout', description: '' },
      },
      {
        element: '[data-testid="layout-dropdown"]',
        title: 'Re-Layout Options',
        description: 'Open the layout dropdown and select a different direction (e.g., <strong>TB</strong>) to see how the graph rearranges.',
        actionRequired: true,
        actionPrompt: 'Select a different layout direction',
        actionType: 'relayout-direction',
        popover: { title: 'Re-Layout Options', description: '' },
      },
    ],
  },
  {
    id: 3,
    title: 'Reading Results',
    description: 'Learn to interpret simulation results using the side panel, bottleneck analysis, event log, and metrics.',
    steps: [
      {
        element: '[data-testid="results-side-panel"]',
        title: 'Results Side Panel',
        description: 'Run a simulation and observe results in the docked right panel. <strong>Click a component</strong> in the results to see its detail view.',
        actionRequired: true,
        actionPrompt: 'Run simulation and click a result entry',
        actionType: 'results-panel-click',
        popover: { title: 'Results Side Panel', description: '' },
      },
      {
        element: '[data-testid="bottleneck-section"]',
        title: 'Bottleneck Analysis',
        description: 'The bottleneck section highlights components with the <strong>highest cascade impact</strong>. Click the top bottleneck component.',
        actionRequired: true,
        actionPrompt: 'Click the top bottleneck component',
        actionType: 'bottleneck-click',
        popover: { title: 'Bottleneck Analysis', description: '' },
      },
      {
        element: '[data-testid="event-log"]',
        title: 'Cascade Event Log',
        description: 'The event log shows every cascade event in chronological order. <strong>Click an entry</strong> to jump to that time step.',
        actionRequired: true,
        actionPrompt: 'Click an event log entry',
        actionType: 'event-log-click',
        popover: { title: 'Cascade Event Log', description: '' },
      },
      {
        element: '[data-testid="simulation-metrics"]',
        title: 'Metrics Interpretation',
        description: 'Summary metrics show total cascades, affected components, and simulation duration. <strong>Hover a metric</strong> to see its explanation.',
        actionRequired: true,
        actionPrompt: 'Hover a metric to see its tooltip',
        actionType: 'metrics-hover',
        popover: { title: 'Metrics Interpretation', description: '' },
      },
    ],
  },
  {
    id: 4,
    title: 'Collaboration',
    description: 'Learn to create rooms, share links, see live cursors, use the presence bar, and co-edit in real time.',
    steps: [
      {
        element: '[data-testid="collaborate-button"]',
        title: 'Create a Room',
        description: 'Click the <strong>Collaborate</strong> button and enter a display name to create a collaboration room.',
        actionRequired: true,
        actionPrompt: 'Create a collaboration room',
        actionType: 'create-room',
        popover: { title: 'Create a Room', description: '' },
      },
      {
        element: '[data-testid="room-modal"]',
        title: 'Share a Link',
        description: 'The Share modal shows your room URL. Click <strong>"Copy Link"</strong> to share it with collaborators.',
        actionRequired: true,
        actionPrompt: 'Click "Copy Link"',
        actionType: 'copy-link',
        popover: { title: 'Share a Link', description: '' },
      },
      {
        element: '.react-flow',
        title: 'Live Cursors',
        description: 'Collaborators\' cursors appear in real time on the canvas. <strong>Move your cursor</strong> to see how it would appear to others.',
        actionRequired: true,
        actionPrompt: 'Move your cursor on the canvas',
        actionType: 'live-cursors',
        popover: { title: 'Live Cursors', description: '' },
      },
      {
        element: '[data-testid="presence-bar"]',
        title: 'Presence Bar',
        description: 'The presence bar shows connected users with color-coded avatars. Watch as a demo user joins briefly.',
        actionRequired: true,
        actionPrompt: 'Observe the presence bar',
        actionType: 'presence-bar',
        popover: { title: 'Presence Bar', description: '' },
      },
      {
        element: '.react-flow',
        title: 'Co-Editing',
        description: 'When collaborators edit a component, you see a colored glow indicator. <strong>Select a component</strong> to see how your indicator appears to others.',
        actionRequired: true,
        actionPrompt: 'Select a component on the canvas',
        actionType: 'co-editing',
        popover: { title: 'Co-Editing', description: '' },
      },
    ],
  },
]

export function getPhase(phaseId: number): TutorialPhase | undefined {
  return TUTORIAL_PHASES.find((p) => p.id === phaseId)
}

export function getPhaseStepCount(phaseId: number): number {
  return getPhase(phaseId)?.steps.length ?? 0
}

export function getTotalPhases(): number {
  return TUTORIAL_PHASES.length
}
