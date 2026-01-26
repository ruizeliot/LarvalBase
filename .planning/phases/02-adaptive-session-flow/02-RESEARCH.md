# Phase 2: Adaptive Session Flow - Research

**Researched:** 2026-01-26
**Domain:** AI-managed brainstorm sessions with Double Diamond phases, engagement detection, and user edit incorporation
**Confidence:** MEDIUM-HIGH

## Summary

This phase implements intelligent session management for the brainstorming system. The core challenge is enabling the AI to guide conversations through structured diverge/converge cycles (Double Diamond), detect user engagement levels to adapt its approach, switch visual techniques when one isn't producing results, and incorporate user edits to canvas/notes.

The existing infrastructure from Phase 1 provides solid foundations: WebSocket bidirectional communication is already established, MCP tools for notes manipulation exist (`append_notes`, `update_section`, `get_notes`), and the viewer already sends `user_input` messages with preferences. The key additions are session state tracking, engagement signal analysis, and user edit detection.

**Primary recommendation:** Use a lightweight state machine pattern (not full XState - overkill for this scope) to track Double Diamond phases. Implement engagement detection through response length analysis and turn counting. Detect canvas edits via Excalidraw's onChange callback with scene version comparison. For notes, use chokidar to watch brainstorm-notes.md for external edits.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ws | ^8.16.0 | WebSocket communication | Already handles bidirectional messaging |
| @excalidraw/excalidraw | ^0.17.0 | Canvas with onChange events | Already integrated, supports edit detection |
| zustand | ^5.0.0 | State management | Already used for preferences, can extend for session state |

### To Add
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chokidar | ^5.0.0 | File watching | Detect external edits to brainstorm-notes.md |

**Note:** XState was considered for session state management but is overkill for this use case. The Double Diamond has only 4 main phases with simple transitions - a simple state object with transition functions is sufficient and avoids dependency bloat.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simple state object | XState | XState provides visualization and more formal guarantees, but adds ~15KB and complexity for 4-state machine |
| chokidar | Node fs.watch | fs.watch has platform-specific quirks; chokidar normalizes behavior |
| Response length heuristics | Sentiment analysis API | Sentiment analysis requires external API calls; length/turn heuristics are sufficient for MVP |

**Installation:**
```bash
# Server additions
cd live-canvas-mcp
npm install chokidar
```

## Architecture Patterns

### Recommended Project Structure
```
live-canvas-mcp/
├── src/
│   ├── session/                    # NEW
│   │   ├── state.ts               # Session state machine
│   │   ├── engagement.ts          # Engagement signal detection
│   │   └── edits.ts               # User edit detection
│   ├── tools/
│   │   └── session.ts             # NEW: Session management MCP tools
│   └── index.ts
└── viewer/
    └── src/
        ├── hooks/
        │   └── useCanvasEdits.ts  # NEW: Track user edits to canvas
        └── stores/
            └── sessionStore.ts    # NEW: Session state for viewer
```

### Pattern 1: Double Diamond State Machine
**What:** Simple state object with phase transitions and guards
**When to use:** All session phase management
**Example:**
```typescript
// Source: Based on Double Diamond design process
type DiamondPhase = 'discover' | 'define' | 'develop' | 'deliver';

interface SessionState {
  phase: DiamondPhase;
  diamond: 1 | 2;  // First diamond (problem) or second (solution)
  turnCount: number;
  lastPhaseSwitch: number;  // timestamp
  ideas: {
    generated: number;  // Ideas in current phase
    recentTurns: number[];  // Ideas per last N turns (for stagnation detection)
  };
}

const initialState: SessionState = {
  phase: 'discover',
  diamond: 1,
  turnCount: 0,
  lastPhaseSwitch: Date.now(),
  ideas: { generated: 0, recentTurns: [] }
};

// Transition rules
const PHASE_TRANSITIONS: Record<DiamondPhase, DiamondPhase> = {
  discover: 'define',   // diverge -> converge
  define: 'develop',    // converge -> diverge (second diamond)
  develop: 'deliver',   // diverge -> converge
  deliver: 'discover',  // converge -> diverge (new cycle)
};

function shouldTransition(state: SessionState): boolean {
  // Example: transition after 5+ turns with diminishing returns
  const recentIdeas = state.ideas.recentTurns.slice(-3);
  const avgIdeas = recentIdeas.reduce((a, b) => a + b, 0) / recentIdeas.length;
  return state.turnCount >= 5 && avgIdeas < 2;
}

function transitionPhase(state: SessionState): SessionState {
  return {
    ...state,
    phase: PHASE_TRANSITIONS[state.phase],
    diamond: state.phase === 'define' ? 2 : state.diamond,
    turnCount: 0,
    lastPhaseSwitch: Date.now(),
    ideas: { generated: 0, recentTurns: [] }
  };
}
```

### Pattern 2: Engagement Signal Detection
**What:** Analyze user response patterns to detect engagement level
**When to use:** Every user message to adapt AI behavior
**Example:**
```typescript
// Source: Conversational AI engagement metrics research
type EngagementSignal = 'terse' | 'normal' | 'verbose' | 'confused' | 'excited';

interface ResponseMetrics {
  wordCount: number;
  questionCount: number;
  exclamationCount: number;
  ellipsisCount: number;
  avgWordLength: number;
}

function analyzeResponse(text: string): ResponseMetrics {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return {
    wordCount: words.length,
    questionCount: (text.match(/\?/g) || []).length,
    exclamationCount: (text.match(/!/g) || []).length,
    ellipsisCount: (text.match(/\.\.\./g) || []).length,
    avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length || 0,
  };
}

function detectEngagement(metrics: ResponseMetrics, history: ResponseMetrics[]): EngagementSignal {
  const avgHistoryWords = history.reduce((sum, m) => sum + m.wordCount, 0) / history.length || 50;

  // Terse: significantly shorter than average
  if (metrics.wordCount < avgHistoryWords * 0.3 && metrics.wordCount < 10) {
    return 'terse';
  }

  // Verbose: significantly longer than average
  if (metrics.wordCount > avgHistoryWords * 2 && metrics.wordCount > 100) {
    return 'verbose';
  }

  // Confused: many questions, ellipses
  if (metrics.questionCount >= 2 || metrics.ellipsisCount >= 2) {
    return 'confused';
  }

  // Excited: exclamations, high word count
  if (metrics.exclamationCount >= 2 || (metrics.wordCount > 50 && metrics.exclamationCount >= 1)) {
    return 'excited';
  }

  return 'normal';
}
```

### Pattern 3: Technique Stagnation Detection
**What:** Track idea generation per visual technique to detect when to switch
**When to use:** After each turn to decide if current technique is working
**Example:**
```typescript
type VisualizationTechnique = 'mindmap' | 'matrix' | 'affinity' | 'flow';

interface TechniqueMetrics {
  technique: VisualizationTechnique;
  ideasPerTurn: number[];  // Last N turns
  totalIdeas: number;
  turnsSinceSwitch: number;
}

// Stagnation: <2 new ideas over 3 turns
function isStagnating(metrics: TechniqueMetrics): boolean {
  const recentTurns = metrics.ideasPerTurn.slice(-3);
  if (recentTurns.length < 3) return false;

  const totalRecent = recentTurns.reduce((a, b) => a + b, 0);
  return totalRecent < 2;
}

function recommendNextTechnique(
  current: VisualizationTechnique,
  phase: DiamondPhase
): VisualizationTechnique {
  // Diverge phases: prioritize mindmap, affinity
  // Converge phases: prioritize matrix, flow
  const divergeOrder: VisualizationTechnique[] = ['mindmap', 'affinity', 'flow', 'matrix'];
  const convergeOrder: VisualizationTechnique[] = ['matrix', 'flow', 'mindmap', 'affinity'];

  const order = (phase === 'discover' || phase === 'develop') ? divergeOrder : convergeOrder;
  const currentIndex = order.indexOf(current);
  return order[(currentIndex + 1) % order.length];
}
```

### Pattern 4: Canvas Edit Detection
**What:** Detect when user modifies AI-generated canvas elements
**When to use:** Continuously via onChange callback
**Example:**
```typescript
// Source: Excalidraw API documentation
import { getSceneVersion } from '@excalidraw/excalidraw';

interface CanvasEditState {
  lastVersion: number;
  aiElementIds: Set<string>;
  userModifiedIds: Set<string>;
}

function detectCanvasEdits(
  elements: readonly ExcalidrawElement[],
  state: CanvasEditState
): { hasUserEdits: boolean; modifiedElements: ExcalidrawElement[] } {
  const currentVersion = getSceneVersion(elements);
  if (currentVersion === state.lastVersion) {
    return { hasUserEdits: false, modifiedElements: [] };
  }

  const modified: ExcalidrawElement[] = [];

  for (const el of elements) {
    // Check if AI element was modified by user
    if (state.aiElementIds.has(el.id) && !state.userModifiedIds.has(el.id)) {
      // Element position, size, or content changed
      // (Would need to compare with stored AI state)
      modified.push(el);
    }
  }

  // New user-drawn elements
  for (const el of elements) {
    if (!state.aiElementIds.has(el.id) && !el.isDeleted) {
      modified.push(el);
    }
  }

  return {
    hasUserEdits: modified.length > 0,
    modifiedElements: modified
  };
}
```

### Pattern 5: Notes File Watching with Chokidar
**What:** Watch brainstorm-notes.md for external edits
**When to use:** Server-side to detect when user edits notes outside viewer
**Example:**
```typescript
// Source: https://github.com/paulmillr/chokidar
import chokidar from 'chokidar';
import { readFile } from 'fs/promises';

interface NotesWatchState {
  lastContent: string;
  lastMtime: number;
}

function watchNotesFile(
  filePath: string,
  onExternalEdit: (newContent: string, diff: string[]) => void
): () => void {
  let state: NotesWatchState = { lastContent: '', lastMtime: 0 };

  const watcher = chokidar.watch(filePath, {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,  // Wait 500ms after last write
      pollInterval: 100
    }
  });

  watcher.on('change', async (path) => {
    const content = await readFile(path, 'utf-8');
    if (content !== state.lastContent) {
      // Compute diff to identify what changed
      const oldLines = state.lastContent.split('\n');
      const newLines = content.split('\n');
      const diff = findDiff(oldLines, newLines);

      state.lastContent = content;
      onExternalEdit(content, diff);
    }
  });

  // Initialize
  readFile(filePath, 'utf-8').then(content => {
    state.lastContent = content;
  }).catch(() => {});

  return () => watcher.close();
}

function findDiff(oldLines: string[], newLines: string[]): string[] {
  // Simple diff: return lines that are different
  const diff: string[] = [];
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      diff.push(`Line ${i + 1}: ${newLines[i] || '(deleted)'}`);
    }
  }
  return diff;
}
```

### Pattern 6: Session State Synchronization
**What:** Keep server and viewer session state in sync
**When to use:** All session state changes
**Example:**
```typescript
interface SessionSyncMessage {
  type: 'session_state_update';
  phase: DiamondPhase;
  diamond: 1 | 2;
  engagement: EngagementSignal;
  currentTechnique: VisualizationTechnique;
  turnCount: number;
}

// Server broadcasts state changes
function broadcastSessionState(state: SessionState, engagement: EngagementSignal): void {
  broadcast({
    type: 'session_state_update',
    phase: state.phase,
    diamond: state.diamond,
    engagement,
    currentTechnique: state.currentTechnique,
    turnCount: state.turnCount
  });
}

// Viewer displays current state
function SessionIndicator({ state }: { state: SessionSyncMessage }) {
  const phaseLabels = {
    discover: 'Exploring Ideas',
    define: 'Narrowing Focus',
    develop: 'Generating Solutions',
    deliver: 'Finalizing'
  };

  return (
    <div className="session-indicator">
      <span className="diamond">Diamond {state.diamond}</span>
      <span className="phase">{phaseLabels[state.phase]}</span>
      <span className="turn">Turn {state.turnCount}</span>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Overengineering state machine:** Don't use XState for 4 states with simple transitions. A plain object with functions is clearer.
- **Real-time sentiment analysis:** Don't call external APIs for sentiment. Response length heuristics are sufficient and instant.
- **Aggressive phase switching:** Don't switch phases on every turn. Require sustained signals (3+ turns) before transitioning.
- **Ignoring user agency:** Don't force phase transitions - provide suggestions, let user override.
- **Polling for file changes:** Use chokidar's event-based watching, not interval polling.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File watching | fs.watchFile polling | chokidar | Cross-platform consistency, handles edge cases |
| Text diff | Custom line-by-line diff | fast-diff or jsdiff | Efficient LCS algorithm, handles edge cases |
| Scene version tracking | Manual element comparison | Excalidraw's getSceneVersion() | Single integer comparison, avoids deep diff |
| State persistence | Manual localStorage | Zustand persist middleware | Already using it for preferences |

**Key insight:** The existing infrastructure handles most complexity. This phase is primarily about adding session awareness on top of existing message flows.

## Common Pitfalls

### Pitfall 1: onChange Fires Too Often
**What goes wrong:** Excalidraw onChange fires on mouse movements, causing excessive processing
**Why it happens:** onChange includes cursor position changes in appState
**How to avoid:** Use `getSceneVersion()` to detect actual element changes, debounce processing
**Warning signs:** High CPU usage, stuttering canvas, duplicate edit notifications

### Pitfall 2: Premature Phase Transitions
**What goes wrong:** AI switches phases before user has fully explored current area
**Why it happens:** Aggressive thresholds on turn count or idea generation
**How to avoid:** Require multiple consecutive "low engagement" signals, not just one. Minimum 3 turns in each phase.
**Warning signs:** User frustration, "wait, I wasn't done yet" feedback

### Pitfall 3: File Watch Race Conditions
**What goes wrong:** File watcher triggers during AI write, causing false "user edit" detection
**Why it happens:** AI updates notes via MCP tool, chokidar detects the change
**How to avoid:** Maintain "write lock" timestamp - ignore changes within 1s of AI write
**Warning signs:** AI responding to its own edits, infinite loops

### Pitfall 4: Notes Content Drift
**What goes wrong:** Server notes state diverges from file system
**Why it happens:** File edits detected but not properly merged with in-memory state
**How to avoid:** Single source of truth - always read from file, use state for caching only
**Warning signs:** Notes appearing/disappearing, merge conflicts

### Pitfall 5: Engagement Misclassification
**What goes wrong:** User writing in non-English language classified as "terse" due to word count
**Why it happens:** Word count heuristics assume English-like word boundaries
**How to avoid:** Use character count as backup metric, don't rely solely on word count
**Warning signs:** Incorrect engagement signals for non-English users

### Pitfall 6: Canvas Edit Attribution
**What goes wrong:** Can't distinguish AI edits from user edits after refresh
**Why it happens:** Element IDs don't encode source, state lost on refresh
**How to avoid:** Store AI element IDs in localStorage or tag elements with custom data
**Warning signs:** All elements treated as user-drawn after page refresh

## Code Examples

### MCP Tool for Session Phase Info
```typescript
// Source: Existing MCP tool pattern in live-canvas-mcp
{
  name: "get_session_phase",
  description: "Get current brainstorm session phase and engagement signals",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: []
  }
}

// Handler
async function handleGetSessionPhase(state: SessionState): Promise<ToolResponse> {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        phase: state.phase,
        diamond: state.diamond,
        mode: (state.phase === 'discover' || state.phase === 'develop') ? 'diverge' : 'converge',
        turnCount: state.turnCount,
        currentTechnique: state.currentTechnique,
        recommendedAction: getPhaseGuidance(state)
      }, null, 2)
    }]
  };
}

function getPhaseGuidance(state: SessionState): string {
  const guidance = {
    discover: "Generate many ideas without judgment. Use mind maps to branch out.",
    define: "Narrow down to key themes. Use matrix to prioritize.",
    develop: "Generate solutions for defined problem. Use affinity to group approaches.",
    deliver: "Converge on final solution. Use flow to map implementation."
  };
  return guidance[state.phase];
}
```

### WebSocket Message for User Edit Notification
```typescript
// Server receives this when viewer detects user canvas edit
interface UserEditMessage {
  type: 'user_canvas_edit';
  editType: 'modify' | 'add' | 'delete';
  elementIds: string[];
  description?: string;  // Auto-generated description of edit
}

// Handler on server
function handleUserCanvasEdit(msg: UserEditMessage, state: SessionState): void {
  // Track that user is actively engaged
  state.engagement.lastActiveEdit = Date.now();

  // Notify AI of the edit so it can incorporate
  // This gets added to the context for next AI response
  state.pendingUserEdits.push({
    timestamp: Date.now(),
    type: msg.editType,
    elementIds: msg.elementIds,
    description: msg.description
  });
}
```

### Zustand Store for Session State (Viewer)
```typescript
// Source: Zustand patterns, existing preferencesStore pattern
import { create } from 'zustand';

interface SessionStoreState {
  phase: DiamondPhase;
  diamond: 1 | 2;
  engagement: EngagementSignal;
  technique: VisualizationTechnique;
  turnCount: number;

  // Actions
  updateFromServer: (msg: SessionSyncMessage) => void;
}

export const useSessionStore = create<SessionStoreState>()((set) => ({
  phase: 'discover',
  diamond: 1,
  engagement: 'normal',
  technique: 'mindmap',
  turnCount: 0,

  updateFromServer: (msg) => set({
    phase: msg.phase,
    diamond: msg.diamond,
    engagement: msg.engagement,
    technique: msg.currentTechnique,
    turnCount: msg.turnCount
  })
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Keyword-based intent detection | Heuristic + context signals | 2024-2025 | More robust engagement detection without external API |
| Full XState for all state | XState for complex, simple objects for simple | 2024-2025 | Right-sized solutions |
| Polling for file changes | Event-based watching (chokidar) | Standard practice | Lower CPU, faster detection |
| External sentiment APIs | Local heuristics | Cost/latency concerns | Instant, free, private |

**Deprecated/outdated:**
- chokidar v4 globs: Removed in v4+, use direct paths
- XState v4 syntax: v5 uses different setup pattern

## Open Questions

1. **Phase transition timing**
   - What we know: Double Diamond has 4 phases, users need time to explore
   - What's unclear: Optimal turn count before suggesting transition
   - Recommendation: Start with 5 turns minimum per phase, tune based on feedback

2. **Engagement signal weights**
   - What we know: Response length is a signal
   - What's unclear: How to weight different signals (length vs questions vs time between responses)
   - Recommendation: Start with length-only, add complexity if needed

3. **Canvas edit description generation**
   - What we know: Can detect which elements changed
   - What's unclear: How to generate useful descriptions for AI context
   - Recommendation: Simple descriptions ("User moved node X", "User deleted arrow") - don't over-engineer

4. **Multi-user considerations**
   - What we know: Current system is single-user
   - What's unclear: How would phase management work with multiple users
   - Recommendation: Out of scope for v1, but design state machine to be user-scoped

## Sources

### Primary (HIGH confidence)
- [Double Diamond (Wikipedia)](https://en.wikipedia.org/wiki/Double_Diamond_(design_process_model)) - Process structure
- [Excalidraw API Props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/) - onChange callback
- [Excalidraw API Methods](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api) - getSceneVersion
- [Chokidar GitHub](https://github.com/paulmillr/chokidar) - File watching
- [XState Docs](https://stately.ai/docs/machines) - State machine patterns
- Existing live-canvas-mcp codebase - Architecture patterns

### Secondary (MEDIUM confidence)
- [FasterCapital Conversational Metrics](https://fastercapital.com/content/Conversational-engagement-metric-Measuring-User-Engagement--A-Deep-Dive-into-Conversational-Metrics.html) - Engagement signal concepts
- [LogRocket Double Diamond](https://blog.logrocket.com/ux-design/double-diamond-design-process/) - Phase descriptions
- [Confident AI Chatbot Evaluation](https://www.confident-ai.com/blog/llm-chatbot-evaluation-explained-top-chatbot-evaluation-metrics-and-testing-techniques) - Turn tracking patterns

### Tertiary (LOW confidence)
- Various Medium articles on state machine patterns (verified against XState official docs)
- Collaborative editing research papers (general principles for edit detection)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Minimal additions to existing stack, well-documented libraries
- Architecture: MEDIUM-HIGH - Patterns derived from established practices, but specific thresholds need tuning
- Engagement detection: MEDIUM - Heuristics are reasonable but need validation in practice
- Edit detection: HIGH - Excalidraw and chokidar APIs are well-documented

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable technologies, may need threshold tuning sooner)
