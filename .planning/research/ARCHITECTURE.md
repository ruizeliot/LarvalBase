# Brainstorming Session Architecture

**Domain:** AI Brainstorming Facilitator
**Researched:** 2026-01-26
**Confidence:** HIGH (verified with multiple authoritative sources)

---

## Executive Summary

Effective brainstorming follows a structured yet adaptive flow based on decades of facilitation research. The core pattern is **diverge-converge** cycling, where participants first expand possibilities without judgment, then narrow to actionable decisions. An AI facilitator must detect user engagement signals and adapt technique selection accordingly.

This document defines:
1. Session phases and their purposes
2. User signal detection patterns
3. Technique switching triggers
4. Success indicators during execution

---

## Session Phase Architecture

### The Double Diamond Model

The foundational framework is the **Double Diamond**, developed by the British Design Council (2004). It provides two diverge-converge cycles:

```
DIAMOND 1: Problem Space          DIAMOND 2: Solution Space

    DISCOVER    DEFINE           DEVELOP      DELIVER
       /\         /\                /\          /\
      /  \       /  \              /  \        /  \
     /    \     /    \            /    \      /    \
    /      \   /      \          /      \    /      \
   /        \ /        \        /        \  /        \
  DIVERGE  CONVERGE  DIVERGE  CONVERGE  DIVERGE  CONVERGE
```

**For a brainstorming AI assistant, this translates to:**

| Phase | Diamond | Mode | Purpose | AI Behavior |
|-------|---------|------|---------|-------------|
| Warm-up | Pre | Activation | Lower inhibitions, build creative muscle | Light exercises, no pressure |
| Discover | 1 | Diverge | Explore the problem space | Ask open questions, accept all inputs |
| Define | 1 | Converge | Synthesize to problem statement | Cluster, summarize, confirm |
| Develop | 2 | Diverge | Generate solution possibilities | Push for quantity, defer judgment |
| Deliver | 2 | Converge | Select and refine solutions | Vote, prioritize, action items |
| Close | Post | Synthesis | Consolidate learning | Document, reflect, next steps |

### Phase 1: Warm-up (5-10% of session)

**Purpose:** Shift participant mindset from analytical to creative.

**Why it matters:** Research shows creative warm-ups boost productivity by 12% and help participants access creativity faster.

**Techniques:**
| Technique | Duration | Best For | Signal to Use It |
|-----------|----------|----------|------------------|
| 30 Circles | 2 min | Visual thinkers | User seems hesitant |
| Bad Ideas First | 3 min | Perfectionists | User seems blocked |
| Alternate Uses | 3 min | Verbal thinkers | User gives short answers |
| Squiggle Birds | 5 min | Low confidence | User says "I'm not creative" |

**AI Implementation:**
```
IF user.firstResponse.wordCount < 20:
  SUGGEST warm-up exercise
IF user.sentiment == "hesitant" OR user.says("I don't know"):
  RUN "Bad Ideas First" technique
```

**Exit Criteria:** User has generated at least 3 ideas freely, energy feels higher.

### Phase 2: Discover (20-25% of session)

**Purpose:** Explore the problem space broadly without premature convergence.

**Facilitator Rules:**
- Withhold ALL judgment
- Focus on quantity over quality
- Use "Yes, and..." language exclusively
- Never say "but" or "however"

**Techniques:**
| Technique | When to Use | Description |
|-----------|-------------|-------------|
| Mind Mapping | Complex problems | Radial exploration from central concept |
| SCAMPER | Existing product iteration | Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Rearrange |
| Brainwriting | User seems verbal-shy | Silent written idea generation |
| Figure Storming | User is stuck | "How would [famous person] approach this?" |

**AI Behavior:**
- Ask open-ended questions
- Reflect back what user says (active listening)
- Add "What else?" and "Tell me more" prompts
- DO NOT evaluate, rank, or filter ideas yet

**Exit Criteria:** User has explored 3+ different angles of the problem.

### Phase 3: Define (10-15% of session)

**Purpose:** Synthesize exploration into clear problem statement.

**The "Groan Zone":** This is the hardest transition. Users resist abandoning ideas. The facilitator must guide firmly but empathetically.

**Techniques:**
| Technique | Purpose |
|-----------|---------|
| Affinity Clustering | Group related ideas into themes |
| "How Might We" | Reframe problem as opportunity |
| Dot Voting | Democratic prioritization |
| Forced Ranking | When dot voting is indecisive |

**AI Behavior:**
- Summarize themes observed
- Propose problem statement
- Ask for confirmation/refinement
- Use "What? So What? Now What?" framework

**Exit Criteria:** User confirms a clear, actionable problem statement.

### Phase 4: Develop (30-35% of session)

**Purpose:** Generate maximum solution possibilities.

**Critical Rule:** "Diverge before you converge" - MIT research shows premature convergence kills innovation.

**Techniques:**
| Technique | Best For | Duration |
|-----------|----------|----------|
| Rapid Ideation | Building momentum | 5-10 min |
| Crazy 8's | Visual solutions | 8 min |
| Round Robin | Equal participation | Variable |
| Reverse Brainstorming | Stuck groups | 5 min |

**AI Behavior:**
- Maintain high energy
- Push for more: "What's another way?"
- Introduce constraints if stuck: "What if budget was unlimited?"
- Use visual stimulus from canvas
- Track idea count, aim for 15-30+ ideas

**Exit Criteria:** User has generated 15+ ideas OR energy is declining after sustained effort.

### Phase 5: Deliver (15-20% of session)

**Purpose:** Select, refine, and commit to actionable solutions.

**Techniques:**
| Technique | Purpose |
|-----------|---------|
| Dot Voting | Quick democratic selection |
| 2x2 Matrix | Impact vs. Effort evaluation |
| "Now/Next/Later" | Temporal prioritization |
| Idea Champions | Assign ownership |

**AI Behavior:**
- Present ideas for evaluation
- Apply evaluation criteria (feasibility, impact, alignment)
- Help user commit to top 1-3 ideas
- Generate action items with owners and deadlines

**Exit Criteria:** User has selected 1-3 ideas with clear next steps.

### Phase 6: Close (5-10% of session)

**Purpose:** Consolidate learning and ensure momentum continues.

**Framework: "What? So What? Now What?"**
1. **What?** - What happened in this session?
2. **So What?** - Why does this matter?
3. **Now What?** - What actions follow?

**AI Behavior:**
- Summarize key decisions
- Highlight surprising insights
- Document action items
- Save to brainstorm-notes.md with full context

**Exit Criteria:** brainstorm-notes.md is complete with decisions and actions.

---

## User Signal Detection

### Signal Categories

An AI facilitator must continuously monitor these signal types:

| Signal Type | Observable Indicators | What It Means |
|-------------|----------------------|---------------|
| **Engagement Level** | Response length, detail, questions | High/Medium/Low interest |
| **Energy State** | Word choice, punctuation, speed | Energized/Neutral/Tired |
| **Cognitive State** | Clarity, focus, coherence | Clear/Confused/Overwhelmed |
| **Emotional State** | Sentiment, resistance, enthusiasm | Excited/Frustrated/Blocked |
| **Creative State** | Originality, connections, risk-taking | Flowing/Stuck/Inhibited |

### Engagement Level Detection

| Signal | Indicators | AI Response |
|--------|------------|-------------|
| **HIGH Engagement** | Long responses (50+ words), follow-up questions, elaboration, "Yes, and..." language | Continue current technique, deepen exploration |
| **MEDIUM Engagement** | Moderate responses (20-50 words), direct answers, no elaboration | Add prompts, introduce variety |
| **LOW Engagement** | Terse responses (<20 words), single words, "I don't know", long pauses | Switch technique, offer warm-up, check-in |

**Implementation Pattern:**
```
MEASURE responseLength = user.lastResponse.wordCount
MEASURE responseTime = user.responseLatency
MEASURE questionCount = user.questionsAsked

IF responseLength < 20 AND responseTime > expectedTime:
  engagement = LOW
  ACTION: technique_switch OR check_in
ELIF responseLength > 50 AND questionCount > 0:
  engagement = HIGH
  ACTION: deepen_current_path
ELSE:
  engagement = MEDIUM
  ACTION: add_prompts
```

### Energy State Detection

| Signal | Indicators | AI Response |
|--------|------------|-------------|
| **HIGH Energy** | Exclamation points, rapid responses, "I love this!", multiple ideas per turn | Ride the wave, capture everything, don't interrupt |
| **NEUTRAL Energy** | Even responses, no strong emotion, steady pace | Maintain rhythm, introduce stimulation gradually |
| **LOW Energy** | Slow responses, "I guess", "maybe", hedging language | Energy injection: movement, constraint, time pressure |

**Energy Injection Techniques:**
1. Add time constraint: "Quick - 60 seconds - what are 5 more ideas?"
2. Add absurd constraint: "What if it had to fit in a shoebox?"
3. Change modality: "Let me sketch that on the canvas"
4. Use worst-first: "What's the WORST way to solve this?"

### Confusion Detection

| Signal | Indicators | AI Response |
|--------|------------|-------------|
| **Clarity** | Builds on previous ideas, coherent reasoning, confident statements | Continue, validate direction |
| **Confusion** | Questions about previous points, contradictions, "Wait, I thought..." | Pause, summarize, clarify |
| **Overwhelm** | "This is a lot", incomplete sentences, topic jumping | Simplify, break down, pause |

**Confusion Response Protocol:**
```
IF user.says("I'm confused" OR "Wait" OR "What do you mean"):
  1. STOP current activity
  2. ACKNOWLEDGE: "Let me clarify..."
  3. SUMMARIZE: Current state in 2-3 sentences
  4. ASK: "What specifically is unclear?"
  5. RESUME: Only after confirmation
```

### Creative Block Detection

| Signal | Indicators | Duration Threshold |
|--------|------------|--------------------|
| **Flowing** | New ideas each turn, building on previous, making connections | - |
| **Slowing** | Repeating previous ideas, smaller variations only | 2-3 turns |
| **Stuck** | "I can't think of anything", silence, "That's all I have" | 3+ turns |

**Block-Breaking Sequence:**
1. **Acknowledge:** "Looks like we've explored that angle well"
2. **Pivot:** "Let's try a different approach"
3. **Technique Switch:** Apply technique from table below
4. **Constraint Injection:** Add a new lens/constraint
5. **Environment Change:** Shift to canvas, or change topic temporarily

---

## Technique Switching Triggers

### Decision Matrix: When to Switch Techniques

| Current State | Trigger Signal | Switch To | Rationale |
|---------------|----------------|-----------|-----------|
| Free brainstorm | 3+ turns without new ideas | SCAMPER | Structured prompts break blocks |
| SCAMPER | User says "these all feel similar" | Reverse Brainstorm | Inversion creates novelty |
| Verbal ideation | Responses getting shorter | Visual/Canvas | Modality shift re-engages |
| Individual ideation | Energy dropping | Constraint injection | Time pressure re-energizes |
| Diverging | 20+ ideas generated | Affinity clustering | Ready to converge |
| Converging | User resists narrowing | "Yes, and" expansion | Not ready yet, needs more exploration |
| Any | User asks "what's next?" | Phase transition | Ready to move forward |
| Any | User confusion detected | Pause + summarize | Reset understanding |

### Technique Repertoire by Phase

**Divergent Techniques:**
| Technique | Energy Required | Best For |
|-----------|-----------------|----------|
| Free Association | Low | Warm-up, initial exploration |
| Mind Mapping | Medium | Complex problem spaces |
| SCAMPER | Medium | Iterating on existing concepts |
| Crazy 8's | High | Visual solutions, time pressure |
| Reverse Brainstorming | Medium | Breaking out of positive-only thinking |
| Role Storming | High | Perspective shifts |
| Random Word | Low | Breaking blocks |

**Convergent Techniques:**
| Technique | Energy Required | Best For |
|-----------|-----------------|----------|
| Affinity Clustering | Medium | Organizing many ideas |
| Dot Voting | Low | Quick prioritization |
| 2x2 Matrix | Medium | Trade-off analysis |
| Forced Ranking | High | When must choose one |
| Pros/Cons | Low | Binary decisions |

### Phase Transition Signals

| From | To | Trigger Signals |
|------|-----|-----------------|
| Warm-up | Discover | User freely generating ideas, inhibitions lowered |
| Discover | Define | User says "I think the real problem is...", saturation reached |
| Define | Develop | Problem statement confirmed, user says "So what do we do?" |
| Develop | Deliver | 15+ ideas generated OR user asks "Which should we pick?" |
| Deliver | Close | Top ideas selected with action items |

---

## Success Indicators During Session

### Real-Time Health Metrics

| Metric | Healthy Range | Warning Signs |
|--------|---------------|---------------|
| Response Length | 30-100 words | <15 words consistently |
| Ideas per Turn | 1-3 new ideas | 0 new ideas for 3+ turns |
| Question Ratio | User asks 1+ questions per 5 turns | No user questions |
| Sentiment | Neutral to positive | Frustration, resignation |
| Time in Phase | Per phase guidelines | Stuck in one phase too long |

### Phase-Specific Success Criteria

| Phase | Success Looks Like | Failure Looks Like |
|-------|-------------------|-------------------|
| Warm-up | Laughing, "silly" ideas, lowered guard | Still hesitant, "serious" only |
| Discover | Many different angles explored | Single narrow track |
| Define | Clear problem statement user owns | Vague or facilitator-imposed problem |
| Develop | 15-30+ diverse ideas | <10 ideas, all similar |
| Deliver | Committed decisions with owners | "Maybe we could..." hedging |
| Close | Written summary, next steps clear | Session ends without capture |

### Session-Level Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Ideas Generated | 20+ | Count in brainstorm-notes.md |
| User Ownership | User chose direction | User confirmed, not AI suggested |
| Action Items | 2-5 concrete actions | Each has owner + deadline |
| Novelty | Ideas user hadn't considered | User says "I hadn't thought of that" |
| Completion | All phases traversed | Didn't get stuck in any phase |

---

## Architecture Patterns

### Pattern 1: Adaptive Loop

The AI should operate in a continuous read-adapt-respond loop:

```
WHILE session.active:
  1. OBSERVE user response
  2. DETECT signals (engagement, energy, confusion, blocks)
  3. EVALUATE current phase health
  4. DECIDE: continue, pivot, or transition
  5. RESPOND with appropriate technique
  6. UPDATE canvas + notes in real-time
```

### Pattern 2: Never Mix Modes

**Critical Rule:** Never diverge and converge simultaneously.

```
WRONG:
  "Here are some ideas, but I think option A is best"
  (This is mixing divergent generation with convergent evaluation)

RIGHT:
  Diverge: "Here are some ideas: A, B, C, D, E"
  [Later] Converge: "Which resonate most with you?"
```

### Pattern 3: Visible Progress

Users should always know:
1. Where they are in the session
2. What's been captured
3. What's coming next

**Implementation:** Keep notes panel updated in real-time. Use canvas for visual progress.

### Pattern 4: Safe Container

All creative facilitation research emphasizes psychological safety. The AI must:
- Never criticize ideas (even implicitly through tone)
- Celebrate wild ideas
- Use "Yes, and..." not "Yes, but..."
- Model vulnerability by suggesting its own "bad" ideas

---

## Anti-Patterns to Avoid

| Anti-Pattern | What It Looks Like | Why It Fails |
|--------------|-------------------|--------------|
| **Premature Convergence** | Evaluating ideas before generating enough | Kills creativity, narrows too fast |
| **Mode Mixing** | "Great idea, but have you considered..." | Shuts down divergent thinking |
| **Facilitator Dominance** | AI generates all the ideas | User doesn't own outcome |
| **Energy Ignorance** | Pushing forward despite low energy | User disengages |
| **Skipping Warm-up** | Jumping straight to "What's your idea?" | User stays in analytical mode |
| **No Synthesis** | Session ends without summary | Work is lost, no momentum |
| **False Urgency** | Rushing through phases | Poor quality, user stress |

---

## Sources

- [MIT Sloan: "Diverge Before You Converge"](https://sloanreview.mit.edu/article/diverge-before-you-converge-tips-for-creative-brainstorming/)
- [Voltage Control: The Synergy of Diverge and Converge](https://voltagecontrol.com/articles/the-synergy-of-diverge-and-converge-in-design-thinking/)
- [NN/g: The Diverge-and-Converge Technique](https://www.nngroup.com/articles/diverge-converge/)
- [SmartStorming: The Power of Divergent and Convergent Thinking](https://smartstorming.com/the-power-of-divergent-and-convergent-thinkingguide-your-groups-thinking-process-to-new-heights-of-productivity/)
- [Interaction Design Foundation: Brainstorming Techniques](https://www.interaction-design.org/literature/topics/brainstorming)
- [IDEO U: 10 Idea Generation Activities](https://www.ideou.com/blogs/inspiration/10-activities-to-generate-better-ideas)
- [Lucidspark: Brainstorming Warm-up Exercises](https://lucid.co/blog/brainstorming-warm-up-exercises)
- [SessionLab: 43 Brainstorming Techniques](https://www.sessionlab.com/blog/brainstorming-techniques/)
- [Wikipedia: Double Diamond Design Process](https://en.wikipedia.org/wiki/Double_Diamond_(design_process_model))
- [UXPin: Double Diamond Design Process](https://www.uxpin.com/studio/blog/double-diamond-design-process/)
- [McGill Skills21: Ideas for Closing Your Workshop](https://www.mcgill.ca/skills21/facilitator-guide/plan/ideas-closing-your-workshop)
- [Zen Ex Machina: Facilitation Techniques](https://zenexmachina.com/facilitation-techniques-when-to-use-and-why/)
- [FasterCapital: Conversational Engagement Metrics](https://fastercapital.com/content/Conversational-engagement-metric-Measuring-User-Engagement--A-Deep-Dive-into-Conversational-Metrics.html)
- [The Design Gym: Facilitator Tips for Unexpected Conversations](https://www.thedesigngym.com/facilitator-tips-for-unexpected-uncomfortable-conversations/)

---
---

# Multi-User Technical Architecture (Milestone 2)

**Added:** 2026-01-27
**Focus:** Multi-user collaboration, voice input, document sharing integration
**Confidence:** HIGH (verified against existing codebase + authoritative sources)

---

## Current Architecture (Baseline)

The existing Live Canvas MCP system follows a single-host architecture:

```
+-------------------------------------------------------------------+
|                        Host Machine                                |
|  +---------------+    +------------------+    +----------------+   |
|  |   Claude      |    |   MCP Server     |    |    Viewer      |   |
|  |   (stdio)     |<---|   (Node.js)      |<---|   (React)      |   |
|  |               |    |   Port 3456      | WS |   Excalidraw   |   |
|  +---------------+    +------------------+    +----------------+   |
|         |                    |                      |              |
|         |                    v                      |              |
|         |            +------------------+           |              |
|         +----------->|   State Store    |<----------+              |
|           MCP tools  | - notes (Map)    |  WebSocket               |
|                      | - diagrams (Map) |  messages                |
|                      | - shapes (Map)   |                          |
|                      | - sessionState   |                          |
|                      +------------------+                          |
+-------------------------------------------------------------------+
```

### Key Integration Points (Existing)

| Component | File | Responsibility |
|-----------|------|----------------|
| MCP Server | `src/index.ts` | Tool handlers, state management |
| HTTP Server | `src/server/http.ts` | REST API, static serving, injection |
| WebSocket | `src/server/websocket.ts` | Real-time sync, broadcast |
| Session State | `src/session/state.ts` | Double Diamond phase tracking |
| Edit Tracking | `src/session/edits.ts` | User vs AI edit attribution |
| Viewer App | `viewer/src/App.tsx` | UI, state display |
| Whiteboard | `viewer/src/components/WhiteboardPanel.tsx` | Excalidraw rendering |

---

## Recommended Architecture: Multi-User Collaboration

### Architecture Overview

```
+-----------------------------------------------------------------------------+
|                             Host Machine                                     |
|  +---------------+                                                           |
|  |   Claude      |                                                           |
|  |   (stdio)     |                                                           |
|  +-------+-------+                                                           |
|          | MCP tools                                                         |
|          v                                                                   |
|  +---------------------------------------------------------------------+    |
|  |                    MCP Server (Enhanced)                             |    |
|  |  +--------------+  +--------------+  +--------------------------+   |    |
|  |  | Room Manager |  | Voice Handler|  |   Document Gallery       |   |    |
|  |  | - sessions   |  | - transcribe |  |   - file storage         |   |    |
|  |  | - host/guest |  | - queue audio|  |   - sync metadata        |   |    |
|  |  +--------------+  +--------------+  +--------------------------+   |    |
|  |                           |                                         |    |
|  |                    +------+------+                                  |    |
|  |                    |   Whisper   | (local or API)                   |    |
|  |                    |   Worker    |                                  |    |
|  |                    +-------------+                                  |    |
|  +----------------------------------+----------------------------------+    |
|                                     |                                       |
|              +----------------------+----------------------+                |
|              |                      |                      |                |
|              v                      v                      v                |
|  +------------------+  +--------------+  +----------------------+           |
|  |   Host Viewer    |  |   Yjs Doc    |  |   Document Store     |           |
|  |   (localhost)    |  |   (CRDT)     |  |   (.pipeline/docs/)  |           |
|  +------------------+  +--------------+  +----------------------+           |
+-----------------------------------------------------------------------------+
              |                      |
              |    WebSocket         | (y-websocket)
              v                      v
+-----------------------------------------------------------------------------+
|                          Remote Clients (Browser)                            |
|  +---------------------+        +---------------------+                      |
|  |   Guest Viewer 1    |        |   Guest Viewer 2    |                      |
|  |  +---------------+  |        |  +---------------+  |                      |
|  |  | Yjs Provider  |  |        |  | Yjs Provider  |  |                      |
|  |  | - canvas sync |  |        |  | - canvas sync |  |                      |
|  |  | - notes sync  |  |        |  | - notes sync  |  |                      |
|  |  | - awareness   |  |        |  | - awareness   |  |                      |
|  |  +---------------+  |        |  +---------------+  |                      |
|  |  +---------------+  |        |  +---------------+  |                      |
|  |  | Voice Input   |  |        |  | Voice Input   |  |                      |
|  |  | MediaRecorder |  |        |  | MediaRecorder |  |                      |
|  |  +---------------+  |        |  +---------------+  |                      |
|  +---------------------+        +---------------------+                      |
+-----------------------------------------------------------------------------+
```

### Why This Architecture

**Recommendation: Use Yjs (CRDT) for canvas/notes sync, NOT Operational Transformation.**

| Factor | OT | CRDT (Yjs) | Winner |
|--------|----|-----------:|--------|
| Central server required | Yes | No | CRDT |
| Offline editing | Limited | Full support | CRDT |
| Implementation complexity | High | Moderate (library) | CRDT |
| Existing ecosystem | Custom | y-excalidraw, y-websocket | CRDT |
| Merge conflicts | Server resolves | Automatic convergence | CRDT |
| Latency tolerance | Low | High | CRDT |

**Yjs integrates directly with Excalidraw** via the `@excalidraw/excalidraw` collaboration features, making it the natural choice for this canvas-based application.

---

## Component Boundaries

### New Components to Build

| Component | Location | Responsibility | Dependencies |
|-----------|----------|----------------|--------------|
| **Room Manager** | `src/rooms/manager.ts` | Session creation, join codes, host/guest roles | - |
| **y-websocket Server** | `src/server/yjs-websocket.ts` | Yjs document sync, awareness | `y-websocket`, `yjs` |
| **Voice Handler** | `src/voice/handler.ts` | Audio upload, Whisper integration | Whisper API or local |
| **Document Gallery** | `src/gallery/store.ts` | File storage, metadata, sync | - |
| **Awareness Provider** | `viewer/src/providers/awareness.ts` | Cursor sync, user presence | `y-protocols` |

### Modified Components

| Component | Current Location | Changes Needed |
|-----------|-----------------|----------------|
| **WebSocket Server** | `src/server/websocket.ts` | Add room-based routing, integrate Yjs |
| **HTTP Server** | `src/server/http.ts` | Add room join endpoints, voice upload |
| **Session State** | `src/session/state.ts` | Room-scoped state, multi-user phase tracking |
| **Viewer App** | `viewer/src/App.tsx` | Yjs provider, voice UI, document panel |
| **WhiteboardPanel** | `viewer/src/components/WhiteboardPanel.tsx` | Yjs collaboration integration |

---

## Data Flow

### Canvas Sync (Yjs-Based)

```
User A draws    User B draws      Claude creates
    |               |                  |
    v               v                  v
+-------+      +-------+         +-----------+
| Local |      | Local |         | MCP Tool  |
| Yjs   |      | Yjs   |         | Handler   |
| Doc   |      | Doc   |         |           |
+---+---+      +---+---+         +-----+-----+
    |              |                   |
    +--------------+-------------------+
                   |
                   v
          +---------------+
          | y-websocket   |
          | Server        |
          | (broadcasts)  |
          +---------------+
                   |
    +--------------+--------------+
    v              v              v
User A          User B         Claude
receives        receives       receives
update          update         (via state sync)
```

### Voice Input Flow

```
+-------------------------------------------------------------------+
|                        Browser (Client)                            |
|                                                                    |
|  [Mic Button] --> MediaRecorder --> Audio Blob (WebM/PCM)         |
|                                            |                       |
|                                            v                       |
|                                     POST /api/voice/upload         |
+--------------------------------------------+-----------------------+
                                             |
                                             v
+-------------------------------------------------------------------+
|                        MCP Server                                  |
|                                                                    |
|  Voice Handler receives audio                                      |
|         |                                                          |
|         v                                                          |
|  +-------------------------------------------------------------+  |
|  | Option A: OpenAI Whisper API                                |  |
|  |   POST https://api.openai.com/v1/audio/transcriptions       |  |
|  |   + Simple, accurate, costs money                           |  |
|  |                                                             |  |
|  | Option B: Local Whisper (whisper.cpp + node binding)        |  |
|  |   - Free, private, requires model download                  |  |
|  |   - whisper-node or @nicepkg/whisper-node                   |  |
|  +-------------------------------------------------------------+  |
|         |                                                          |
|         v                                                          |
|  Transcription Text                                                |
|         |                                                          |
|         +--> Broadcast to room (WebSocket)                         |
|         |         |                                                |
|         |         +--> All viewers see transcription               |
|         |                                                          |
|         +--> Inject to Claude (existing injection mechanism)       |
|                   |                                                |
|                   +--> Claude responds as if user typed it         |
+-------------------------------------------------------------------+
```

### Document Gallery Flow

```
+-------------------------------------------------------------------+
|                     Host Uploads Document                          |
|                                                                    |
|  [File Picker] --> POST /api/gallery/upload                        |
|                          |                                         |
|                          v                                         |
|                   .pipeline/gallery/                               |
|                   +-- doc-abc123.pdf                               |
|                   +-- image-def456.png                             |
|                   +-- metadata.json                                |
|                          |                                         |
|                          v                                         |
|                   Broadcast: gallery_item_added                    |
|                          |                                         |
|              +-----------+-----------+                             |
|              v           v           v                             |
|           Host        Guest 1     Guest 2                          |
|           sees        fetches     fetches                          |
|           item        thumbnail   thumbnail                        |
+-------------------------------------------------------------------+
```

---

## Patterns to Follow

### Pattern 1: Room-Based WebSocket Routing

**What:** Partition WebSocket connections by session/room ID

**When:** Multi-user sessions where messages should only reach participants

**Implementation:**

```typescript
// src/rooms/manager.ts
interface Room {
  id: string;           // e.g., "abc123" (6-char code)
  hostId: string;       // Socket ID of session starter
  clients: Set<string>; // Socket IDs of all participants
  yjsDoc: Y.Doc;        // Shared Yjs document for this room
  state: SessionState;  // Room-scoped session state
  createdAt: number;
}

// Room code generation
function generateRoomCode(): string {
  return crypto.randomBytes(3).toString('hex'); // "a1b2c3"
}

// Room joining
socket.on('join_room', (roomCode: string, userName: string) => {
  const room = rooms.get(roomCode);
  if (!room) {
    socket.emit('error', { message: 'Room not found' });
    return;
  }
  socket.join(roomCode);
  room.clients.add(socket.id);
  // Broadcast user joined to room
  io.to(roomCode).emit('user_joined', { id: socket.id, name: userName });
});
```

### Pattern 2: Yjs Integration with Existing State

**What:** Layer Yjs CRDT on top of existing broadcast mechanism

**When:** Need conflict-free sync for canvas and notes

**Implementation:**

```typescript
// src/server/yjs-websocket.ts
import { setupWSConnection } from 'y-websocket/bin/utils';
import * as Y from 'yjs';

// One Yjs doc per room
const roomDocs = new Map<string, Y.Doc>();

function getOrCreateDoc(roomId: string): Y.Doc {
  if (!roomDocs.has(roomId)) {
    const doc = new Y.Doc();

    // Set up shared types
    const canvasElements = doc.getArray('canvas');
    const notesText = doc.getText('notes');

    // Observe changes for Claude awareness
    canvasElements.observe(event => {
      // Notify MCP server of canvas changes
      broadcastToRoom(roomId, {
        type: 'canvas_yjs_update',
        changes: event.changes
      });
    });

    roomDocs.set(roomId, doc);
  }
  return roomDocs.get(roomId)!;
}
```

### Pattern 3: Voice Input with Graceful Degradation

**What:** Support both API and local Whisper transcription

**When:** Voice input feature with cost/privacy tradeoffs

**Implementation:**

```typescript
// src/voice/handler.ts
interface TranscriptionResult {
  text: string;
  confidence: number;
  source: 'api' | 'local';
}

async function transcribe(audio: Buffer): Promise<TranscriptionResult> {
  // Try local first if available
  if (localWhisperAvailable) {
    try {
      const result = await localWhisper.transcribe(audio);
      return { text: result.text, confidence: result.confidence, source: 'local' };
    } catch (e) {
      console.warn('Local Whisper failed, falling back to API');
    }
  }

  // Fall back to OpenAI API
  if (process.env.OPENAI_API_KEY) {
    const result = await openaiWhisper.transcribe(audio);
    return { text: result.text, confidence: 0.95, source: 'api' };
  }

  throw new Error('No transcription backend available');
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Polling for Sync

**What:** Using HTTP polling instead of WebSocket push

**Why bad:** High latency, wasted bandwidth, poor UX

**Instead:** Use existing WebSocket infrastructure with Yjs for real-time sync

### Anti-Pattern 2: Full State Broadcast

**What:** Broadcasting entire canvas state on every change

**Why bad:** O(n) bandwidth per change, doesn't scale

**Instead:** Yjs sends incremental updates (deltas only)

### Anti-Pattern 3: Server-Authoritative Canvas State

**What:** Making server the single source of truth for all edits

**Why bad:**
- High latency for drawing (must wait for server)
- Server bottleneck
- Offline editing impossible

**Instead:**
- CRDT (Yjs) allows local-first editing
- Server is relay, not authority
- Automatic conflict resolution

### Anti-Pattern 4: Storing Audio in Memory

**What:** Keeping uploaded audio blobs in Node.js memory

**Why bad:** Memory exhaustion, no persistence

**Instead:**
- Stream directly to Whisper
- Or write to temp file, delete after transcription

### Anti-Pattern 5: Single Global Session State

**What:** Using the existing singleton `sessionState` for multi-room

**Why bad:** All rooms share same phase/turn count

**Instead:** Room-scoped state: `room.state: SessionState`

---

## Build Order (Dependencies)

The following phases represent logical groupings based on dependencies:

```
Phase 1: Room Infrastructure
+-- Room Manager (rooms/manager.ts)
+-- Join code generation
+-- Room-scoped WebSocket routing
+-- Host/Guest role assignment
    |
    | Depends on nothing new (uses existing WebSocket)
    v
Phase 2: Multi-Client Sync (Yjs)
+-- y-websocket server integration
+-- Yjs provider in viewer
+-- Canvas sync via Y.Array
+-- Notes sync via Y.Text
    |
    | Depends on: Phase 1 (room routing)
    v
Phase 3: User Awareness
+-- Cursor positions (y-protocols/awareness)
+-- User presence list
+-- User colors/names
+-- "User X is typing" indicators
    |
    | Depends on: Phase 2 (Yjs infrastructure)
    v
Phase 4: Voice Input
+-- MediaRecorder client component
+-- Voice upload endpoint
+-- Whisper integration (API first, local optional)
+-- Transcription injection to Claude
    |
    | Depends on: Phase 1 (room context for who's speaking)
    v
Phase 5: Document Gallery
+-- File upload endpoint
+-- Gallery storage (.pipeline/gallery/)
+-- Metadata sync
+-- Thumbnail generation
+-- Gallery UI component
    |
    | Depends on: Phase 2 (Yjs for metadata sync)
```

### Critical Path

```
Room Manager --> Yjs Integration --> Voice Input
                       |
                       +--> Document Gallery
```

Voice input and document gallery can be built in parallel after Yjs integration is complete.

---

## Scalability Considerations

| Concern | At 2-5 users | At 10-20 users | At 100+ users |
|---------|--------------|----------------|---------------|
| WebSocket connections | Single Node.js | Single Node.js | Need horizontal scaling |
| Yjs sync | Direct broadcast | Direct broadcast | Consider y-redis for pub/sub |
| Voice transcription | OpenAI API | OpenAI API (rate limits) | Local Whisper required |
| Document storage | Local filesystem | Local filesystem | Object storage (S3) |
| Canvas elements | Full Yjs doc | Full Yjs doc | May need doc sharding |

**For MVP (2-5 users):** Single server architecture is sufficient. No need for Redis, horizontal scaling, or complex infrastructure.

---

## Technology Recommendations

### Multi-Client Sync

| Technology | Recommendation | Rationale |
|------------|---------------|-----------|
| **Yjs** | USE | CRDT with Excalidraw support, proven ecosystem |
| **y-websocket** | USE | Official Yjs WebSocket provider |
| **y-protocols/awareness** | USE | Cursor sync, user presence |
| OT (custom) | AVOID | High complexity, no library support |
| Firebase | AVOID | Vendor lock-in, overkill for local-first |

### Voice Transcription

| Technology | Recommendation | Rationale |
|------------|---------------|-----------|
| **OpenAI Whisper API** | USE (primary) | Accurate, simple integration |
| **whisper.cpp (node binding)** | USE (fallback) | Free, private, offline capable |
| Browser WebSpeech API | AVOID | Inconsistent, requires online |
| Google Cloud Speech | AVOID | More complex than Whisper API |

### Document Storage

| Technology | Recommendation | Rationale |
|------------|---------------|-----------|
| **Local filesystem** | USE (MVP) | Simple, fits existing pattern |
| SQLite | CONSIDER (future) | Better metadata queries |
| S3-compatible | CONSIDER (future) | If scaling beyond single host |

---

## Sources (Multi-User Architecture Section)

### Multi-User WebSocket Architecture
- [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/)
- [Scalable WebSocket Architecture - Hathora](https://blog.hathora.dev/scalable-websocket-architecture/)
- [WebSocket Architecture Best Practices - Ably](https://ably.com/topic/websocket-architecture-best-practices)

### CRDT and Yjs
- [y-websocket Documentation](https://docs.yjs.dev/ecosystem/connection-provider/y-websocket)
- [Yjs GitHub - y-websocket](https://github.com/yjs/y-websocket)
- [Building Real-Time Collaboration with OT vs CRDT](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)
- [Google Docs Architecture: OT vs CRDTs](https://sderay.com/google-docs-architecture-real-time-collaboration/)

### Voice/Whisper Integration
- [Whisper AI Transcribe Audio JavaScript - AssemblyAI](https://www.assemblyai.com/blog/whisper-ai-transcibe-audio-javascript)
- [Offline Speech Recognition with Whisper: Browser + Node.js](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js)
- [WhisperLive - Collabora GitHub](https://github.com/collabora/WhisperLive)

### Collaborative Whiteboard Patterns
- [Nextcloud Whiteboard GitHub](https://github.com/nextcloud/whiteboard)
- [Building Real-Time Collaborative Whiteboard - Medium](https://medium.com/@adredars/building-a-real-time-collaborative-whiteboard-backend-with-nestjs-and-socket-io-2229f7bf73bd)
