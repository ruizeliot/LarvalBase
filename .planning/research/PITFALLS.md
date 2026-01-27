# Domain Pitfalls: AI Visual Brainstorming Assistant

**Domain:** AI-assisted visual brainstorming / creative facilitation
**Researched:** 2026-01-26
**Confidence:** HIGH (based on peer-reviewed research and documented user patterns)

---

## Critical Pitfalls

Mistakes that cause user abandonment or fundamental product failure.

---

### Pitfall 1: The Passivity Trap (AI Does the Thinking)

**What goes wrong:** AI generates ideas so quickly that users stop engaging their own creative thinking. The user becomes a passive evaluator rather than an active creator. Over time, this leads to disengagement and the feeling that the AI "owns" the session.

**Why it happens:**
- AI can produce dozens of ideas in seconds
- Path of least resistance: accepting AI output is easier than thinking
- Users offload cognitive work to the AI without realizing it

**Consequences:**
- Users disengage ("it's just doing everything for me")
- Ideas become homogenized (94% overlap in one study)
- Creativity atrophies - users lose confidence in their own ideas
- Autonomy frustration leads users to edit AI output counterproductively

**Research evidence:**
- MIT study showed reduced prefrontal cortex activation when using ChatGPT vs. independent work
- Wharton research found AI-assisted groups produced more similar ideas, reducing breakthrough potential
- Self-determination theory research shows autonomy frustration leads to worse outcomes than either pure AI or pure human ideation

**Warning signs:**
- User rarely contributes their own ideas
- Session transcripts show mostly AI output with brief user approvals
- User says "just give me options" repeatedly
- Canvas shows only AI-generated content

**Prevention strategy:**
- **Human-first ideation:** Always solicit user ideas BEFORE showing AI suggestions
- **Constraint generation:** AI suggests constraints/prompts, user generates ideas within them
- **Alternating turns:** Enforce divergent (AI expands) then convergent (human decides) cycles
- **Ask questions, don't give answers:** AI should ask "What aspects of X interest you?" not "Here are 50 ideas about X"
- **Visible thinking:** Show AI's reasoning process so user can engage with it, not just results

**Recovery strategy:**
- Pause AI suggestions entirely
- Ask direct questions that require user reflection
- Use "what if" prompts that require user completion
- Summarize what USER has contributed, reinforce their ownership

---

### Pitfall 2: The Blank Canvas Paralysis

**What goes wrong:** User opens the tool and faces an empty canvas with a blinking cursor. They don't know how to start, what to ask, or how to translate their vague idea into an actionable prompt.

**Why it happens:**
- Assumes users know how to formulate prompts
- Assumes users think linearly
- Assumes confidence that new users don't have
- No scaffolding for the "cold start" problem

**Consequences:**
- User abandonment within first 60 seconds
- Frustration before any value is delivered
- Users blame themselves ("I'm not creative enough")

**Research evidence:**
- Research on the "blank page effect" shows unstructured starting points increase cognitive load
- Users spend more energy deciding HOW to start than doing actual work

**Warning signs:**
- High bounce rate from initial screen
- Long pauses before first user action
- Users type and delete, type and delete
- First message is very short or unclear

**Prevention strategy:**
- **Proactive first move:** AI should draw something immediately, not wait
- **Starter templates:** Offer 2-3 visual starting points based on project type
- **Progressive disclosure:** Start with simple choices, reveal complexity gradually
- **Context detection:** Read project name, existing files, and infer starting points
- **"Show, don't tell":** Instead of asking "what do you want?", show a rough sketch and ask "is this roughly the direction?"

**Recovery strategy:**
- Recognize confusion patterns (short messages, vague responses)
- Switch from open questions to constrained choices
- Draw SOMETHING to give user something to react to
- "Let me show you what I'm thinking, and you can tell me what's wrong"

---

### Pitfall 3: Design Fixation from Early AI Output

**What goes wrong:** AI shows an early visual or idea, and users fixate on it. They stop exploring alternatives and try to iterate on the first thing shown, even if it's not optimal.

**Why it happens:**
- First ideas anchor subsequent thinking
- Easier to modify existing than imagine new
- Users assume AI's first output is a reasonable starting point
- Copying elements from examples is cognitively easier than generating new ones

**Consequences:**
- Premature convergence on suboptimal solutions
- Reduced variety and originality
- Users feel stuck but don't know why
- Final output resembles AI's first attempt too closely

**Research evidence:**
- Studies show AI image generator support during ideation leads to higher fixation
- Participants using AI produced fewer ideas, less variety, lower originality vs. baseline
- Users gravitate toward AI-generated features regardless of whether they're told to avoid them

**Warning signs:**
- User keeps iterating on first concept without exploring alternatives
- All variations share core structural elements
- User says "just tweak this" instead of "show me something different"
- Canvas history shows linear refinement, not divergent exploration

**Prevention strategy:**
- **Mandatory exploration phase:** Show 3+ radically different directions before allowing iteration
- **"Bad" ideas on purpose:** Include deliberately unusual/weird options to break fixation
- **Separate divergent and convergent phases:** Don't allow refinement until exploration is complete
- **Visual diversity metrics:** Track how different the options being shown are
- **Explicit "new direction" affordance:** Make it easy to start fresh

**Recovery strategy:**
- Recognize fixation patterns (repeated refinement of same structure)
- Proactively suggest "What if we tried something completely different?"
- Show a radically different option unsolicited
- Reframe: "Let's pretend we haven't started yet - what else could this be?"

---

### Pitfall 4: Visual Lag Behind Conversation

**What goes wrong:** User describes ideas verbally/textually, but the canvas doesn't update in real-time. The visual and verbal tracks desync. User has to explicitly request drawings, breaking flow.

**Why it happens:**
- System treats drawing as a separate action from conversation
- AI waits for "complete" understanding before drawing
- Technical latency in visual generation
- No continuous visual feedback loop

**Consequences:**
- Canvas feels like a separate, disconnected tool
- User forgets about visual element
- Drawings arrive too late to inform conversation
- User has to context-switch to "visual mode"

**Research evidence:**
- Documented in your user feedback: "AI rarely drew anything (needed prompting)"
- Real-time collaboration research shows latency >150ms degrades experience
- Synchronization issues cause inconsistencies and user frustration

**Warning signs:**
- User has to say "can you draw that?"
- Canvas is empty while conversation is active
- Visual updates come in batches, not continuously
- User stops looking at canvas

**Prevention strategy:**
- **Continuous visual streaming:** Update canvas in real-time as conversation happens
- **Sketch early, refine later:** Show rough visuals immediately, detail later
- **Visual-first responses:** Default to drawing with annotation, not text with optional drawing
- **Ambient drawing:** AI sketches while user is typing, anticipating direction
- **Canvas as primary output:** Treat text as annotation to visuals, not vice versa

**Recovery strategy:**
- If canvas is stale, proactively say "Let me sketch what I'm hearing"
- Batch-update canvas with multiple elements to catch up
- Use visual summary: "Here's everything we've discussed so far" (as a drawing)

---

### Pitfall 5: Generic/Simplistic Visuals

**What goes wrong:** AI produces basic boxes, stick figures, and generic diagrams that don't capture the richness of user's ideas. Visuals feel like afterthoughts rather than valuable artifacts.

**Why it happens:**
- Default to safe, simple representations
- Lack of context about user's visual preferences
- Training data skews toward simple diagrams
- System doesn't know user's domain vocabulary

**Consequences:**
- User loses trust in visual capability
- Visuals don't add value to thinking process
- User stops engaging with canvas
- Final artifacts require complete redraw anyway

**Research evidence:**
- Your user feedback: "Drawings were too simple (basic boxes)"
- Research shows users expect AI to be infallible - simple output destroys trust
- Expectation gap between "magic design button" and actual capability

**Warning signs:**
- All outputs are boxes with labels
- No visual hierarchy or emphasis
- Visuals are structurally identical regardless of content
- User ignores canvas entirely

**Prevention strategy:**
- **Domain-specific visual vocabulary:** Learn the visual language of the domain (e.g., UML for software, wireframes for UI)
- **Visual complexity progression:** Start simple, but offer "more detail" affordance
- **Style detection:** Ask early what visual style user prefers (sketch, polished, diagram, etc.)
- **Adaptive rendering:** Increase visual richness as ideas crystallize
- **Show visual range:** Early in session, demonstrate capability with a rich example

**Recovery strategy:**
- Ask: "Would you like me to add more detail to this?"
- Offer style variations: "Same content, but as a [wireframe/flowchart/mind map]"
- Proactively enhance: "Let me make this more visual" and redraw with richness

---

## Moderate Pitfalls

Mistakes that cause frustration or reduce effectiveness but don't cause abandonment.

---

### Pitfall 6: Idea Overload (Suggestion Fatigue)

**What goes wrong:** AI generates so many ideas that user is overwhelmed. Cognitive load shifts from creation to evaluation. User can't process all options and makes worse decisions.

**Why it happens:**
- AI fluency is cheap - easy to generate many ideas
- Assumption that more options = better
- No filtering before presentation
- All ideas presented at equal weight

**Consequences:**
- Decision paralysis
- User picks "good enough" to escape cognitive load
- Best ideas buried in noise
- Session feels exhausting rather than energizing

**Research evidence:**
- Research shows effort shifts from creation to evaluation when using AI
- Number of AI suggestion requests correlates negatively with human idea fluency
- Users report having to "reject AI suggestions and pay attention not to be influenced too much"

**Warning signs:**
- Long pauses after AI generates options
- User picks first acceptable option
- User says "that's fine" rather than "that's great"
- Session duration increases but output quality doesn't

**Prevention strategy:**
- **Curated presentation:** Show 3 ideas maximum at once, best-first
- **Progressive disclosure:** "Here's my top pick. Want to see alternatives?"
- **Explain the curation:** "I'm showing you this because [reason]"
- **Batch sizes that match cognitive capacity:** 3-5 items, never 50
- **Quality over quantity signals:** "I found one really strong option" not "here are 47 ideas"

**Recovery strategy:**
- Recognize overload (long pauses, "sure" responses)
- Filter down: "Let me narrow this to the 2 strongest options"
- Summarize: "The main approaches are X and Y - which resonates more?"

---

### Pitfall 7: The Robotic Facilitator

**What goes wrong:** AI interactions feel mechanical, formulaic, and lacking warmth. User doesn't feel they're collaborating with an intelligent partner - just operating a tool.

**Why it happens:**
- Template-based responses
- Lack of conversational memory
- No adaptation to user's communication style
- Missing emotional intelligence

**Consequences:**
- Reduced engagement and investment
- User doesn't share full context
- Creative sessions feel like filling out forms
- User doesn't return for future sessions

**Research evidence:**
- Conversational UX research shows "many interactions still feel flat, robotic, awkward"
- Users report AI feels like "talking to a soulless customer service script"
- Trust and engagement require perceived warmth

**Warning signs:**
- User responses become terse
- User stops elaborating on ideas
- Session transcripts show Q&A pattern, not conversation
- User doesn't share context or backstory

**Prevention strategy:**
- **Conversational memory:** Reference earlier points in session
- **Tone matching:** Adapt formality to user's style
- **Personality consistency:** Have a recognizable voice, not generic assistant speak
- **Proactive curiosity:** Ask follow-up questions that show understanding
- **Acknowledge emotion:** "That sounds frustrating" when user expresses difficulty

**Recovery strategy:**
- Inject warmth: "I'm excited about where this is going"
- Show memory: "Earlier you mentioned X - should we revisit that?"
- Get personal: "What made you interested in this problem?"

---

### Pitfall 8: Wrong Timing for Input

**What goes wrong:** AI interrupts at the wrong moment - either too early (before user finishes thought) or too late (after user has moved on). The rhythm of collaboration is off.

**Why it happens:**
- No understanding of user's cognitive state
- Fixed timing instead of adaptive
- Treating silence as permission to speak
- Not distinguishing "thinking pause" from "done talking"

**Consequences:**
- Derailed train of thought
- Frustration at interruption
- Missed opportunity for timely input
- User has to repeat or re-establish context

**Research evidence:**
- Voice AI research shows natural hesitation triggers unwanted interruptions
- VAD-based systems misinterpret thinking pauses as end-of-turn
- Interruptions can double time to complete creative tasks

**Warning signs:**
- User says "wait, I wasn't done"
- User ignores AI input and continues their previous thought
- AI input arrives right after user moves to new topic
- Long silences followed by rushed AI responses

**Prevention strategy:**
- **Explicit turn-taking:** Use clear signals for "your turn" / "my turn"
- **Patience calibration:** Longer pauses before AI input in creative contexts
- **Interruptibility signals:** User can indicate "I'm thinking" vs "I'm stuck"
- **Background processing:** Prepare response but wait for appropriate moment
- **Draft visibility:** Show "AI is thinking..." so user knows to wait or continue

**Recovery strategy:**
- Graceful yield: "Sorry, please continue"
- Batch deferred input: "When you're ready, I have some thoughts on X"
- Let user control pacing: "Take your time, I'll wait"

---

### Pitfall 9: Context Blindness

**What goes wrong:** AI doesn't incorporate context that should be obvious - project history, domain knowledge, user preferences from previous sessions. Every interaction starts from scratch.

**Why it happens:**
- No persistent memory across sessions
- Context window limitations
- No integration with project artifacts
- Treating each prompt as independent

**Consequences:**
- User has to re-explain context repeatedly
- Suggestions don't match project constraints
- Generic output despite available specifics
- User loses trust in AI understanding

**Research evidence:**
- Research shows AI cannot factor in context, background information, or findings from previous studies
- Users expect AI to comprehend context akin to human communication
- Context failures, not generation failures, are the core problem

**Warning signs:**
- User says "as I mentioned before..."
- AI suggests things that contradict established decisions
- Output ignores obvious constraints (technology, timeline, etc.)
- User provides same information multiple times

**Prevention strategy:**
- **Project artifact ingestion:** Read existing docs, code, designs before starting
- **Explicit context accumulation:** Build and display running context summary
- **Session memory:** Carry key decisions across interactions
- **Constraint tracking:** Surface active constraints in every response
- **Context confirmation:** "Based on what we've established: [X, Y, Z]. Does this still hold?"

**Recovery strategy:**
- Apologize and ask: "I may have missed context - can you remind me about [specific thing]?"
- Proactively surface: "Let me make sure I understand the constraints: [list]"
- Offer context reset: "Would it help if I summarized what I think I know?"

---

### Pitfall 10: All Divergence, No Convergence

**What goes wrong:** AI is great at generating options but provides no help narrowing down, deciding, or synthesizing. User drowns in possibilities with no path forward.

**Why it happens:**
- Divergent thinking is AI's strength
- Convergent thinking requires judgment AI lacks confidence to express
- Fear of "leading" the user wrong
- No framework for selection/synthesis

**Consequences:**
- Sessions generate lots of ideas but no decisions
- User feels stuck despite having options
- Output is a mess of possibilities, not a coherent direction
- User has to do all the hard synthesis work alone

**Research evidence:**
- Research shows AI assists well in idea screening but poorly in idea selection
- Creativity support tools primarily support divergent thinking, neglecting convergent thinking
- AI lacks the evaluative side of creativity - knowing which idea is valuable

**Warning signs:**
- End of session has many ideas, no selections
- User asks "so which one should I pick?"
- No decisions are made despite long session
- Canvas shows exploration but no refinement

**Prevention strategy:**
- **Opinionated recommendations:** "My recommendation is X because [reason]"
- **Structured convergence:** Explicit "exploration done, now let's narrow down" phase
- **Decision frameworks:** Offer criteria for evaluation
- **Synthesis assistance:** "Based on your reactions, the direction seems to be..."
- **Progress markers:** Show where in diverge/converge cycle we are

**Recovery strategy:**
- Recognize wandering (lots of ideas, no selections)
- Force convergence: "Let's pause and pick our top 3"
- Offer judgment: "If I had to pick, I'd go with X - does that resonate?"
- Summarize themes: "I'm seeing two main directions: A and B"

---

## Minor Pitfalls

Issues that cause friction but are recoverable.

---

### Pitfall 11: Style Mismatch

**What goes wrong:** Visual style doesn't match user's expectations or needs. Sketchy when they wanted polished, flowchart when they wanted freeform.

**Prevention:** Ask style preference early. Offer quick style switching. Show style options with examples.

**Recovery:** "Would you prefer a different visual style? I can do [options]."

---

### Pitfall 12: Missing Explanation

**What goes wrong:** AI produces output but doesn't explain reasoning. User can't evaluate whether suggestion is good because they don't know why it was made.

**Prevention:** Default to showing reasoning. "I suggested X because [specific reason based on user input]."

**Recovery:** Add reasoning on request. Track what explanations user finds helpful.

---

### Pitfall 13: Lost Session State

**What goes wrong:** Connection drops, browser refreshes, or user returns later and all progress is gone.

**Prevention:** Auto-save continuously. Show save status. Make recovery obvious.

**Recovery:** Clear recovery flow. "Welcome back. Last session you were working on [X]. Continue?"

---

### Pitfall 14: Premature Formalization

**What goes wrong:** AI produces polished, finished-looking output when user is still in early exploration. This signals "done" when user isn't done, discouraging further iteration.

**Prevention:** Match visual polish to session phase. Early = sketchy. Late = refined.

**Recovery:** Explicitly downgrade: "Let me make this sketchier so we can keep iterating."

---

## Phase-Specific Warnings

| Implementation Phase | Likely Pitfall | Mitigation |
|---------------------|----------------|------------|
| Initial canvas setup | Blank Canvas Paralysis | Proactive first drawing, not empty canvas |
| Visual generation | Generic Visuals | Test with domain-specific content early |
| Suggestion system | Idea Overload | Curate to 3 max, quality over quantity |
| Conversation flow | Robotic Facilitator | Personality testing, conversational memory |
| Real-time sync | Visual Lag | Optimistic updates, streaming canvas |
| Session structure | All Divergence No Convergence | Explicit phase transitions |
| Multi-session | Context Blindness | Persistent project state, artifact ingestion |
| User ownership | Passivity Trap | Human-first ideation, question-driven |

---

## Sources

### Peer-Reviewed Research
- [Wharton Study on AI and Creativity](https://knowledge.wharton.upenn.edu/article/does-ai-limit-our-creativity/)
- [MIT Study on AI and Cognitive Engagement](https://www.workdesign.com/2025/08/mit-study-warns-ai-use-could-weaken-brain-power-of-workforce/)
- [Design Fixation in Generative AI](https://dl.acm.org/doi/full/10.1145/3613904.3642919)
- [Autonomy Frustration in Human-AI Creative Collaboration](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5233181)
- [AI Brainstorming and Cognitive Load](https://link.springer.com/article/10.1007/s12599-025-00974-y)
- [Divergent vs Convergent Thinking with AI](https://link.springer.com/article/10.1007/s10798-025-09964-3)
- [Exploration vs Fixation in Human-AI Co-Creation](https://arxiv.org/html/2512.18388v1)

### Industry Analysis
- [NN/g on Facilitating AI-Enhanced Workshops](https://www.nngroup.com/articles/facilitating-ai-workshops/)
- [NN/g on AI-Powered Tools Limitations](https://www.nngroup.com/articles/ai-powered-tools-limitations/)
- [IDEO on Brainstorming with AI](https://www.ideo.com/journal/the-rules-of-brainstorming-change-when-artificial-intelligence-gets-involved-heres-how)
- [RAND Research on AI Project Failures](https://www.rand.org/pubs/research_reports/RRA2680-1.html)

### UX and Design Patterns
- [Conversational UX for AI](https://medium.com/design-bootcamp/conversational-ux-for-ai-designing-flows-that-dont-feel-robotic-08265a68bd75)
- [Making Chatbots Feel Human](https://fastbots.ai/blog/how-to-make-chatbot-ux-more-human-and-engaging)
- [Blank Canvas Problem in AI](https://medium.com/ui-for-ai/no-more-blank-canvas-rethinking-how-people-start-with-ai-fd427af24dc8)
- [AI UX Design Mistakes](https://www.letsgroto.com/blog/ai-ux-design-mistakes)

### Real-Time Collaboration
- [Real-Time Canvas Collaboration Best Practices](https://reintech.io/blog/real-time-collaboration-canvas-api)
- [Building Real-Time Collaborative Whiteboards](https://medium.com/@aydankirk92/building-a-real-time-multi-user-collaborative-whiteboard-using-fabric-js-part-i-23405823ee03)

---

---

# Milestone 2 Pitfalls: Multi-User Collaboration Features

**Context:** Adding multi-user collaboration, voice input, and document handling to existing single-user brainstorming app
**Researched:** 2026-01-27
**Confidence:** HIGH (verified with multiple authoritative sources)

---

## Critical Pitfalls (Multi-User)

Mistakes that cause rewrites or major issues when adding multi-user collaboration, voice input, and document handling.

---

### Pitfall M1: Race Condition Window During Client Connection

**What goes wrong:** New clients miss events that occur between fetching initial state and establishing WebSocket connection. The timing window is small but real - if another user adds/modifies elements during this gap, the new client sees stale data and diverges from other clients.

**Why it happens:** Single-user apps fetch state once. Multi-user requires continuous sync. The "fetch state then connect WebSocket" pattern creates a blind spot.

**Consequences:**
- Clients see different canvas states
- Changes appear to "disappear" for some users
- Conflict resolution fails because clients have divergent baselines

**Prevention:**
1. **Double-fetch strategy:** After WebSocket connects, fetch state again to catch anything missed
2. **Event buffering:** Buffer WebSocket events until initial state load completes, then replay
3. **Server-side replay:** Request backlog of events since last known state on connect

**Detection (warning signs):**
- QA reports "I don't see what they see" intermittently
- Issues only appear when users join during active editing
- Problems disappear on page refresh

**Which phase should address:** Phase 3 (Bootstrap) - Build connection protocol correctly from start

**Sources:**
- [Handling Race Conditions in Real-Time Apps](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8)
- [Excalidraw P2P Collaboration Blog](https://blog.excalidraw.com/building-excalidraw-p2p-collaboration-feature/)

---

### Pitfall M2: Last-Write-Wins Destroys Concurrent Edits

**What goes wrong:** When two users edit different aspects of the same element concurrently (e.g., one changes color while another moves position), one edit gets silently discarded. Users don't know their work was lost.

**Why it happens:** Single-user apps can use simple state replacement. Extending this to multi-user with "most recent timestamp wins" causes data loss for concurrent changes to the same object.

**Consequences:**
- User changes "disappear" without warning
- Trust in the tool erodes ("it loses my work")
- Requires constant manual verification

**Prevention:**
1. **Field-level merging:** Track changes at property level, not object level
2. **Version nonce pattern (Excalidraw approach):** Add `versionNonce` field with random integer; when versions match but data differs, use nonce to deterministically pick winner (all clients converge to same state)
3. **Accept occasional jank:** For rare same-element-same-moment edits, prioritize convergence over perfect preservation

**Detection (warning signs):**
- Users report "my change disappeared"
- Issues correlate with simultaneous editing sessions
- Problems are rare but high-impact when they occur

**Which phase should address:** Phase 3 (Bootstrap) - Design merge strategy before implementation

**Sources:**
- [Excalidraw P2P Collaboration Blog](https://blog.excalidraw.com/building-excalidraw-p2p-collaboration-feature/)
- [Last Write Wins Problems](https://dev.to/danyson/last-write-wins-a-conflict-resolution-strategy-2al6)
- [Real-time Collaboration OT vs CRDT](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)

---

### Pitfall M3: Multiplayer Undo/Redo Corrupts State

**What goes wrong:** User A draws circle, User B draws square, User A hits undo - should A's circle disappear? What if B already moved A's circle? Undo in multiplayer is fundamentally different from single-user undo.

**Why it happens:** Single-user undo is a simple stack. Multi-user undo must handle: whose actions to undo, interleaved operations, and cascading dependencies.

**Consequences:**
- Undo removes other users' work
- Undo creates impossible states
- Users afraid to use undo

**Prevention:**
1. **Clear undo stack on peer updates (Excalidraw approach):** When receiving changes from other users, clear local undo stack. Suboptimal UX but prevents corruption.
2. **Document the limitation:** Users understand "undo only works for your most recent solo changes"
3. **Future: Selective undo:** Only undo operations on objects you created/modified (complex to implement)

**Detection (warning signs):**
- Undo causes other users to lose work
- State becomes "impossible" after undo
- Complaints increase with more simultaneous users

**Which phase should address:** Phase 3 (Bootstrap) - Decide on undo strategy upfront; document limitation

**Sources:**
- [Excalidraw P2P Collaboration Blog](https://blog.excalidraw.com/building-excalidraw-p2p-collaboration-feature/)

---

### Pitfall M4: iPhone Safari MediaRecorder Audio Format Incompatibility

**What goes wrong:** Voice recording works perfectly on desktop and Android, but audio files from iPhone Safari fail to transcribe with Whisper. The recording appears to succeed but produces unusable audio.

**Why it happens:** iPhone Safari uses different audio codecs and MIME types than other browsers. Chrome produces `audio/webm;codecs=opus`, Firefox produces `audio/ogg;codecs=opus`, but Safari has different defaults that Whisper may not handle well.

**Consequences:**
- "Voice doesn't work on my phone" complaints
- Silent failures (recording seems to work, transcription fails)
- Support burden from iOS users

**Prevention:**
1. **Smart format detection with fallbacks:** Try formats in order: `audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, `audio/wav`
2. **Test on actual iOS devices** (simulators may behave differently)
3. **Server-side format conversion:** Accept any format, convert to Whisper-friendly format server-side

**Detection (warning signs):**
- Transcription works on desktop, fails on mobile
- iOS-specific bug reports
- Audio files play but don't transcribe

**Which phase should address:** Phase 4 (Implementation) - Test cross-browser during voice feature development

**Sources:**
- [iPhone Safari MediaRecorder Audio Recording](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription)
- [MediaRecorder API with Whisper Mobile Issues](https://community.openai.com/t/mediarecorder-api-w-whisper-not-working-on-mobile-browsers/866019)

---

### Pitfall M5: File Upload Security Vulnerabilities

**What goes wrong:** Document gallery accepts uploads without proper validation, allowing malicious file uploads. Attackers can upload executable files disguised as documents, or access uploaded files through predictable URLs.

**Why it happens:** Single-user apps can be cavalier about uploads (user only hurts themselves). Multi-user means one user's upload is visible to all - and potentially executable.

**Consequences:**
- Malware distribution through your app
- Cross-site scripting via uploaded HTML/SVG
- Path traversal attacks accessing server files
- Server compromise via uploaded PHP/executable files

**Prevention:**
1. **Allowlist file types:** Only accept specific extensions (pdf, png, jpg, docx) - not blacklist
2. **Validate file content:** Don't trust MIME type headers; inspect actual file bytes
3. **Store outside web root:** Uploaded files should not be directly URL-accessible
4. **Rename files:** Use generated UUIDs, not user-provided filenames
5. **Serve with Content-Disposition: attachment** to prevent browser execution

**Detection (warning signs):**
- Files with double extensions (.jpg.php) in uploads
- Unusual file types appearing in gallery
- Server CPU/memory spikes from uploads

**Which phase should address:** Phase 3 (Bootstrap) - Design secure upload pipeline before implementation

**Sources:**
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [File Upload Vulnerabilities](https://www.acunetix.com/websitesecurity/upload-forms-threat/)
- [5 Common File Upload Mistakes](https://www.menlosecurity.com/blog/the-5-file-upload-vulnerability-mistakes-youre-making-right-now)

---

## Moderate Pitfalls (Multi-User)

Mistakes that cause delays or technical debt.

---

### Pitfall M6: WebSocket Reconnection Loses Session Context

**What goes wrong:** When WebSocket disconnects and reconnects (network blip, server restart), the client gets a new connection ID. Server can't associate the new connection with the previous session, losing cursor position, room membership, and editing context.

**Prevention:**
1. **Session tokens:** Include auth/session token in reconnection that maps back to user identity
2. **Sticky sessions:** Route same client to same server instance
3. **State recovery protocol:** On reconnect, fetch current state + replay any missed events
4. **Exponential backoff:** Prevent reconnection storms (1s, 2s, 4s delays with jitter, max 30s)

**Detection:** Users report "I got kicked out" or "had to rejoin the room" frequently

**Which phase should address:** Phase 3 (Bootstrap) - Design reconnection protocol with state recovery

**Sources:**
- [WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
- [WebSocket Reconnection Strategies](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)

---

### Pitfall M7: Broadcast to All Clients Creates Echo Loops

**What goes wrong:** Client sends update to server, server broadcasts to ALL clients including sender, sender applies its own update twice, state diverges.

**Prevention:**
1. **Exclude sender from broadcast:** Server sends to all clients EXCEPT the one who sent the message
2. **Message deduplication:** Clients track message IDs and ignore duplicates
3. **Optimistic updates:** Client applies change locally first; ignores server echo of own message

**Detection:** Elements appear, disappear, then reappear; state "jumps" or "flickers"

**Which phase should address:** Phase 3 (Bootstrap) - Design broadcast protocol correctly

**Sources:**
- [Java EE WebSockets Multiple Clients](https://www.byteslounge.com/tutorials/java-ee-html5-websockets-with-multiple-clients-example)
- [Python WebSocket Broadcasting](https://websockets.readthedocs.io/en/stable/topics/broadcast.html)

---

### Pitfall M8: Room/Session Management Memory Leaks

**What goes wrong:** Users join rooms but connections aren't properly cleaned up on disconnect. Room state accumulates, server memory grows, eventually crashes.

**Prevention:**
1. **Automatic disconnect cleanup:** Remove client from all rooms on WebSocket close
2. **Heartbeat timeouts:** Drop clients that don't respond to pings within 2x ping interval
3. **Room lifecycle:** Delete empty rooms after last user leaves (or after timeout)
4. **Monitor connection counts:** Alert on abnormal growth

**Detection:** Server memory grows over time; connections appear "stuck" in admin view

**Which phase should address:** Phase 3 (Bootstrap) - Design room lifecycle with cleanup

**Sources:**
- [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/)
- [WebSocket Rooms and Persistence](https://medium.com/@clozzi12/websocket-rooms-and-message-persistence-87c94debcab6)

---

### Pitfall M9: Whisper 30-Second Chunking Breaks Mid-Sentence

**What goes wrong:** Whisper processes audio in 30-second chunks. If user speaks continuously for 45 seconds, the chunk boundary can split mid-word or mid-sentence, producing garbled transcription at boundaries.

**Prevention:**
1. **Voice Activity Detection (VAD):** Use VAD to detect speech pauses and chunk on silence, not fixed time
2. **Overlap processing:** Process chunks with overlap (e.g., 5 second overlap) and deduplicate
3. **Push-to-talk encourages natural pauses:** UI design that prompts shorter utterances

**Detection:** Transcriptions have missing/garbled words at ~30 second intervals

**Which phase should address:** Phase 4 (Implementation) - Implement VAD-based chunking

**Sources:**
- [OpenAI Whisper Introduction](https://openai.com/index/whisper/)
- [Whisper Speech to Text Guide](https://www.videosdk.live/developer-hub/stt/whisper-speech-to-text)

---

### Pitfall M10: LAN Discovery Blocked by Firewalls

**What goes wrong:** Host starts server, shares IP address, but other devices on same network can't connect. Works on some networks, fails on others.

**Why it happens:** Network isolation, guest networks, corporate firewalls, or host firewall blocking inbound connections on the app's port.

**Prevention:**
1. **Document network requirements:** Clear instructions that devices must be on same LAN segment
2. **Port guidance:** Tell users which port to allow through firewall
3. **mDNS/Bonjour fallback:** For friendly device discovery (if supported by network)
4. **Connection diagnostics:** UI that shows "Server running on port X, reachable at IP Y"

**Detection:** Works on home network, fails at office; works for some users but not others on same network

**Which phase should address:** Phase 4 (Implementation) - Add connection troubleshooting UI

**Sources:**
- [Local Network Web App Deployment](https://dotscreated.com/deploy-web-app-offline-on-local-network/)
- [Android Local Network Permission](https://developer.android.com/privacy-and-security/local-network-permission)

---

## Minor Pitfalls (Multi-User)

Mistakes that cause annoyance but are fixable.

---

### Pitfall M11: MediaRecorder Large Chunk Spikes

**What goes wrong:** With timeslice set to 200ms, most chunks are ~75KB, but occasionally chunks spike to 50MB+, causing upload timeouts or memory issues.

**Prevention:**
1. **Handle large chunks gracefully:** Don't assume consistent chunk sizes
2. **Stream chunks as they arrive:** Don't buffer entire recording in memory
3. **Set reasonable timeslice:** Smaller timeslice = more consistent chunk sizes

**Detection:** Occasional upload failures; memory spikes during recording

**Which phase should address:** Phase 4 (Implementation) - Handle edge cases in voice recording

**Sources:**
- [Dealing with Huge MediaRecorder Chunks](https://blog.addpipe.com/dealing-with-huge-mediarecorder-slices/)

---

### Pitfall M12: Cursor Presence Floods WebSocket

**What goes wrong:** Sending cursor position on every mouse move creates thousands of messages per second, overwhelming server and making collaboration sluggish.

**Prevention:**
1. **Throttle cursor updates:** Send at most every 50-100ms
2. **Delta compression:** Only send if cursor moved significantly
3. **Separate presence channel:** Lower-priority channel for cursors vs. content changes

**Detection:** Network tab shows constant WebSocket traffic; collaboration becomes slow with multiple users

**Which phase should address:** Phase 4 (Implementation) - Throttle presence updates

---

### Pitfall M13: React Component Unmount Kills Recording

**What goes wrong:** User starts voice recording, navigates away (component unmounts), recording is lost. React's lifecycle destroys the MediaRecorder and stream.

**Prevention:**
1. **Global singleton for recording:** Keep MediaRecorder outside React component lifecycle
2. **Recording state in context/store:** Persist recording state across navigation
3. **Warn before navigation:** "Recording in progress, are you sure?"

**Detection:** Recordings lost when user navigates during recording

**Which phase should address:** Phase 4 (Implementation) - Design voice recording as global service

**Sources:**
- [Engineering Voice Recorder in React](https://medium.com/call-center-studio/engineering-a-seamless-voice-recorder-in-react-overcoming-browser-protocol-limitations-811bb2ad7453)

---

## Phase-Specific Warnings (Multi-User Milestone)

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| 3 - Bootstrap | Connection protocol | Race condition window (M1) | Implement double-fetch or event buffering |
| 3 - Bootstrap | Merge strategy | Last-write-wins data loss (M2) | Use version nonce pattern |
| 3 - Bootstrap | Undo architecture | Multiplayer undo corruption (M3) | Clear undo stack on peer updates |
| 3 - Bootstrap | Upload pipeline | Security vulnerabilities (M5) | Allowlist types, validate content, store outside web root |
| 3 - Bootstrap | Reconnection | Lost session context (M6) | Design recovery protocol with session tokens |
| 3 - Bootstrap | Broadcast | Echo loops (M7) | Exclude sender from broadcasts |
| 3 - Bootstrap | Room lifecycle | Memory leaks (M8) | Auto-cleanup on disconnect + heartbeat |
| 4 - Implement | Voice recording | iOS Safari incompatibility (M4) | Test on real iOS devices, format fallbacks |
| 4 - Implement | Whisper chunking | Mid-sentence breaks (M9) | Use VAD-based chunking |
| 4 - Implement | LAN hosting | Firewall blocking (M10) | Connection diagnostics UI |
| 4 - Implement | MediaRecorder | Large chunk spikes (M11) | Stream chunks, handle variable sizes |
| 4 - Implement | Cursor presence | WebSocket flooding (M12) | Throttle updates |
| 4 - Implement | Voice UI | Recording lost on unmount (M13) | Global singleton pattern |

---

## Integration Pitfalls with Existing System

These pitfalls are specific to adding multi-user features to your existing single-user brainstorming app.

### Existing WebSocket Assumes Single Client

**Current state:** WebSocket sync exists but assumes one client. Broadcasting to multiple clients will require:
- Client registry/room management
- Sender exclusion from broadcasts
- Connection lifecycle management

**Risk:** Existing single-client code may have implicit assumptions that break silently with multiple clients.

**Mitigation:** Audit existing WebSocket handlers for multi-client compatibility before adding features.

### Existing Canvas State Assumes Local Authority

**Current state:** Excalidraw canvas with AI-driven updates assumes local state is authoritative.

**Risk:** When multiple clients exist, "who is authoritative?" becomes ambiguous. AI updates from one client may conflict with user actions on another.

**Mitigation:** Decide on authority model - server-authoritative with client prediction, or peer-to-peer with conflict resolution.

### Existing Session Has No User Identity

**Current state:** Single-user app may not have user identification.

**Risk:** Multi-user features need to know WHO made each change (for presence, for "undo my changes", for permissions).

**Mitigation:** Add lightweight user identity (even just random color + generated name) before building multi-user features.

---

## Sources (Multi-User Milestone)

- [Excalidraw P2P Collaboration Blog](https://blog.excalidraw.com/building-excalidraw-p2p-collaboration-feature/)
- [Handling Race Conditions in Real-Time Apps](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8)
- [WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Real-time Collaboration OT vs CRDT](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)
- [Building Collaborative Interfaces](https://dev.to/puritanic/building-collaborative-interfaces-operational-transforms-vs-crdts-2obo)
- [iPhone Safari MediaRecorder Guide](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription)
- [Engineering Voice Recorder in React](https://medium.com/call-center-studio/engineering-a-seamless-voice-recorder-in-react-overcoming-browser-protocol-limitations-811bb2ad7453)
- [Whisper Speech to Text Guide](https://www.videosdk.live/developer-hub/stt/whisper-speech-to-text)
- [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/)
- [WebSocket Reconnection Strategies](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)
