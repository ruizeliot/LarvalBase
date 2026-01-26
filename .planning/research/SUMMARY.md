# Project Research Summary

**Project:** AI Visual Brainstorming Assistant
**Domain:** Creative facilitation / AI-enhanced design thinking
**Researched:** 2026-01-26
**Confidence:** HIGH

## Executive Summary

This product is an AI-powered visual brainstorming facilitator that transforms verbal ideas into visual diagrams on an Excalidraw canvas. Expert facilitators in this domain emphasize the **Double Diamond** structure (diverge-converge cycles), human-first ideation, and proactive visual capture. The AI must act as a "language extension" - converting ideas to visuals without being asked - while avoiding the critical trap of doing the thinking for the user.

The recommended approach is a **conversational-visual hybrid** where the AI continuously reads user signals (engagement, energy, blocks), selects appropriate brainstorming techniques from a curated inventory, and updates the canvas in real-time. The architecture centers on three components: conversation flow (detecting signals and managing phase transitions), technique engine (18 catalogued methods with trigger conditions), and real-time canvas synchronization. Start with simple technique selection and manual clustering before adding advanced features like adaptive technique switching.

The primary risk is **user passivity** - when AI generates ideas too quickly, users stop thinking creatively and become passive evaluators. Research shows this leads to 94% idea overlap and cognitive atrophy. Mitigation requires **human-first ideation** (always solicit user ideas before AI suggestions), question-driven prompting instead of answer generation, and explicit diverge/converge phase separation to prevent premature judgment.

## Key Findings

### Recommended Stack

The "stack" for this product is the **visual brainstorming technique inventory** - 18 documented methods ranging from mind maps to SWOT analysis, each with specific trigger conditions and complexity guidance.

**Core techniques (MVP):**
- **Mind Maps**: Radial exploration from central concept - trigger when user lists related ideas without structure
- **2x2 Prioritization Matrix**: Impact vs. Effort quadrants - trigger when user asks "which should we do first?"
- **Affinity Diagrams**: Clustering related ideas - trigger when 10+ scattered ideas need pattern recognition
- **User Flow Diagrams**: Sequential task steps - trigger when user describes "how will this work?"
- **How Might We framing**: Problem statement as opportunity - foundation for all sessions

**Advanced techniques (post-MVP):**
- **SCAMPER prompts**: Structured creativity (Substitute, Combine, Adapt...) - low complexity, high value differentiator
- **Six Thinking Hats**: Parallel thinking with 6 perspectives (White=facts, Red=feelings, Yellow=benefits, Black=risks, Green=creativity, Blue=process)
- **Starbursting**: 6 W's (Who, What, When, Where, Why, How) for comprehensive exploration
- **Reverse Brainstorming**: Invert problem to break blocks
- **Crazy 8's**: Rapid sketching in 8-minute cycles

**Technique selection architecture:**
- Default to simple (3-5 elements) unless user requests depth
- Divergent techniques (generate ideas) vs. Convergent techniques (narrow/select)
- Proactive trigger matrix: recognize patterns like "lists 3+ ideas" → draw mind map

### Expected Features

**Must have (table stakes):**
- **Defer judgment during divergent phase** — IDEO's #1 rule, criticism kills ideation
- **Visual capture of all ideas** — sticky-note thinking, nothing gets lost
- **Clear problem framing (HMW)** — "How Might We" questions focus ideation
- **Divergent-Convergent phases** — Double Diamond prevents premature convergence
- **Idea grouping/clustering** — affinity mapping reveals patterns
- **Warm-up exercises** — activate creative mindset (12% productivity boost)
- **Session summary** — document decisions, next steps, and action items

**Should have (competitive):**
- **Technique selection intelligence** — detect stuck patterns, suggest pivots
- **SCAMPER prompts** — structured modification questions (first differentiator to add)
- **Real-time visual streaming** — canvas updates continuously as conversation flows
- **Participation balance tracking** — ensure all voices heard (for multi-user future)
- **Build-on connection lines** — show idea evolution visually
- **Multi-criteria decision matrix** — structured evaluation for convergent phase

**Defer (v2+):**
- **Six Thinking Hats** — high complexity, requires user training
- **Adaptive technique switching ML** — requires behavior analysis, complex implementation
- **Step-Ladder Technique** — complex orchestration for staged entry
- **AI-measured idea richness** — quantity + diversity + novelty metrics dashboard

**Anti-features (deliberately avoid):**
- **AI generates all ideas** — creates passivity, users lose ownership
- **Critique during divergent phase** — kills creative flow
- **Automatic idea filtering/ranking during generation** — premature convergence
- **Blank board start** — causes analysis paralysis, overwhelming
- **Generic prompts like "think outside the box"** — useless, needs specificity

### Architecture Approach

The system follows a **session phase architecture** based on the Double Diamond model with six phases: Warm-up (lower inhibitions), Discover (explore problem space), Define (synthesize problem statement), Develop (generate solutions), Deliver (select and refine), and Close (consolidate learning). An AI facilitator operates in a continuous **read-adapt-respond loop**: observe user response, detect signals (engagement/energy/confusion/blocks), evaluate phase health, decide to continue/pivot/transition, respond with appropriate technique, update canvas in real-time.

**Major components:**

1. **Signal Detection Engine** — monitors engagement level (response length, detail, questions), energy state (punctuation, speed, sentiment), cognitive state (clarity, coherence), emotional state (enthusiasm, frustration), and creative state (originality, connections, flow vs. stuck). Triggers technique switches based on patterns.

2. **Technique Selection System** — 18 catalogued techniques organized into 5 categories (divergent, convergent, relational, sequential, structural). Each technique has: what it is, trigger conditions, complexity guidance, Excalidraw implementation. Decision matrix maps user signals to technique pivots.

3. **Canvas Synchronization Layer** — real-time visual updates without explicit user request. Continuous streaming (update as conversation happens), sketch early/refine later, visual-first responses (drawing with annotation, not text with optional drawing), ambient drawing (AI sketches while user types).

**Key patterns:**
- **Never mix modes**: Keep divergent and convergent phases strictly separated
- **Visible progress**: User always knows where they are, what's captured, what's next
- **Safe container**: Never criticize ideas, celebrate wild ideas, use "Yes, and..." not "Yes, but..."
- **Adaptive loop**: Continuously monitor signals and adjust technique/phase

### Critical Pitfalls

1. **The Passivity Trap (AI does the thinking)** — When AI generates ideas too quickly, users stop engaging their own creativity and become passive evaluators. Leads to 94% idea overlap, creativity atrophy, autonomy frustration. **Prevention**: Human-first ideation (solicit user ideas BEFORE AI suggestions), ask questions instead of providing answers, alternating turns, require user contribution before AI assistance. **Warning signs**: User rarely contributes own ideas, says "just give me options" repeatedly, canvas shows only AI content.

2. **Blank Canvas Paralysis** — User faces empty canvas with no idea how to start. Assumes users know how to formulate prompts and think linearly. Causes 60-second abandonment. **Prevention**: AI draws something immediately (proactive first move), offer 2-3 starter templates, progressive disclosure, context detection from project name/files, show rough sketch and ask "is this roughly the direction?" **Recovery**: Draw SOMETHING to give user something to react to.

3. **Design Fixation from Early AI Output** — Users fixate on first visual shown and stop exploring alternatives. Research shows AI image generators reduce variety and originality. **Prevention**: Show 3+ radically different directions before allowing iteration, include deliberately unusual options, separate divergent and convergent phases, track visual diversity metrics. **Warning signs**: Linear refinement of same structure, user says "just tweak this" instead of "show me something different."

4. **Visual Lag Behind Conversation** — Canvas doesn't update in real-time, visual and verbal tracks desync. User forgets about visual element. **Prevention**: Continuous visual streaming, sketch early/refine later, visual-first responses, ambient drawing while user types, canvas as primary output. **Warning signs**: User has to say "can you draw that?", canvas empty during active conversation.

5. **All Divergence, No Convergence** — AI generates endless options but provides no help narrowing down or deciding. Sessions produce ideas but no decisions. **Prevention**: Opinionated recommendations ("My recommendation is X because..."), structured convergence phases, decision frameworks, synthesis assistance, progress markers showing diverge/converge cycle position. **Warning signs**: Session ends with many ideas but no selections, user asks "so which one should I pick?"

6. **Generic/Simplistic Visuals** — Basic boxes and stick figures that don't capture richness of ideas. User loses trust in visual capability. **Prevention**: Domain-specific visual vocabulary, visual complexity progression (start simple, offer "more detail"), style detection early, adaptive rendering. **Warning signs**: All outputs are boxes with labels, no visual hierarchy, user ignores canvas.

## Implications for Roadmap

Based on research, suggested phase structure builds from basic conversational-visual coordination to advanced adaptive facilitation:

### Phase 1: Conversational Foundation + Basic Visual Capture
**Rationale:** Before anything visual works, the AI must understand what the user is saying and respond intelligently. The conversation layer is the foundation. Phase also delivers basic canvas integration to prove the visual concept.

**Delivers:**
- AI can conduct multi-turn conversation about user's idea
- Basic signal detection (response length, engagement level)
- Simple visual output (mind map, basic shapes) on canvas
- HMW problem framing workflow

**Addresses (from FEATURES.md):**
- Clear problem framing (HMW)
- Visual capture of ideas (table stakes)
- Conversational memory (avoid robotic facilitator)

**Avoids (from PITFALLS.md):**
- Blank Canvas Paralysis (proactive first drawing)
- Robotic Facilitator (conversational warmth)

**Research flags:** LOW complexity - conversational AI and canvas integration are well-documented. Standard patterns available.

### Phase 2: Technique Engine + Phase Management
**Rationale:** Once conversation works, add the brainstorming structure. This phase implements the Double Diamond phases and core technique inventory. Order matters: can't do technique switching without having techniques first.

**Delivers:**
- Six session phases (Warm-up, Discover, Define, Develop, Deliver, Close)
- 5 core techniques: Mind Map, 2x2 Matrix, Affinity Diagram, User Flow, Pros/Cons
- Phase transition detection
- Basic divergent/convergent mode separation

**Addresses (from FEATURES.md):**
- Divergent-Convergent phases (table stakes)
- Warm-up exercises (table stakes)
- Session summary (table stakes)
- Basic technique selection

**Avoids (from PITFALLS.md):**
- All Divergence No Convergence (explicit convergent phase)
- Wrong Timing for Input (phase awareness)

**Research flags:** MEDIUM complexity - phase detection logic needs experimentation. Double Diamond framework is well-documented, but signal-to-transition mapping requires tuning.

### Phase 3: Real-Time Canvas Synchronization
**Rationale:** Techniques exist but visuals lag conversation. This phase closes the loop with continuous visual updates. Builds on Phase 1 (canvas basics) and Phase 2 (knowing WHAT to draw based on technique).

**Delivers:**
- Continuous canvas updates during conversation
- Sketch early, refine later pattern
- Visual-first responses (drawing with annotation)
- Ambient drawing while user types

**Addresses (from FEATURES.md):**
- Real-time visual streaming (competitive feature)
- Build-on connection lines (visual evolution)

**Avoids (from PITFALLS.md):**
- Visual Lag Behind Conversation (critical pitfall #4)
- Generic/Simplistic Visuals (visual richness progression)

**Research flags:** HIGH complexity - real-time collaboration has technical challenges (latency, sync conflicts). Will need research-phase for WebSocket patterns and Excalidraw collaboration APIs.

### Phase 4: Human-First Ideation Guardrails
**Rationale:** By this point, AI is generating ideas fluently - which creates the Passivity Trap risk. This phase adds the guardrails to keep user engaged and creative.

**Delivers:**
- User-idea-first prompting patterns
- Question-driven facilitation (not answer generation)
- Contribution tracking (ensure user generates ideas)
- "Yes, and..." language enforcement
- Curated suggestion presentation (3 max at once)

**Addresses (from FEATURES.md):**
- Build on ideas (IDEO rule)
- Defer judgment (IDEO rule)
- Prevent AI monopoly (anti-feature avoidance)

**Avoids (from PITFALLS.md):**
- The Passivity Trap (critical pitfall #1)
- Idea Overload (moderate pitfall #6)
- AI Generates All Ideas (anti-pattern)

**Research flags:** LOW complexity - patterns are well-documented in human-AI collaboration literature. Implementation is mostly prompt engineering and conversation flow control.

### Phase 5: Advanced Signal Detection + Adaptive Switching
**Rationale:** System now has techniques, guardrails, and real-time visuals. This phase makes it intelligent - detecting when user is stuck and switching techniques proactively.

**Delivers:**
- Advanced signal detection (energy, confusion, creative blocks)
- Technique switching triggers (stuck patterns, 3+ turns without new ideas)
- Block-breaking sequences (SCAMPER, Reverse Brainstorm)
- Confusion response protocol

**Addresses (from FEATURES.md):**
- Technique selection intelligence (competitive feature)
- SCAMPER prompts (first differentiator)
- Detect stuck patterns (competitive feature)

**Avoids (from PITFALLS.md):**
- Design Fixation (forced technique pivots break fixation)
- Context Blindness (improved signal reading)

**Research flags:** MEDIUM complexity - signal detection logic requires user testing and iteration. Trigger thresholds (e.g., "3 turns without new ideas") need empirical validation.

### Phase 6: Convergent Phase Excellence
**Rationale:** Divergent phase is strong by Phase 5, but convergent phase needs equal attention. This phase delivers structured decision-making tools.

**Delivers:**
- Multi-criteria decision matrix
- Dot voting visualization
- SWOT analysis per finalist
- Opinionated recommendations with reasoning
- Action item capture (owners + deadlines)

**Addresses (from FEATURES.md):**
- Selection criteria (table stakes)
- Multi-criteria decision matrix (competitive feature)
- Session summary with action items

**Avoids (from PITFALLS.md):**
- All Divergence No Convergence (structured selection tools)
- Premature Convergence (criteria-based evaluation)

**Research flags:** LOW complexity - convergent techniques are well-documented in decision science. Standard UX patterns for voting and matrices.

### Phase Ordering Rationale

- **Conversation first (P1)** because nothing works without understanding user input
- **Techniques second (P2)** because you need methods before you can switch between them
- **Real-time sync third (P3)** because it builds on canvas basics (P1) and technique knowledge (P2)
- **Guardrails fourth (P4)** because you can't prevent AI over-generation until AI is generating fluently
- **Adaptive switching fifth (P5)** because you need working techniques (P2) and guardrails (P4) before automating decisions
- **Convergent excellence last (P6)** because divergent phase must work well first (don't prematurely converge)

This order also mirrors user journey: basic functionality → structured methods → real-time feel → safety from AI dominance → intelligence → decision quality.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Real-time sync):** WebSocket patterns, Excalidraw collaboration API, latency optimization, conflict resolution
- **Phase 5 (Adaptive switching):** Signal threshold calibration, technique effectiveness metrics, user testing for trigger accuracy

Phases with standard patterns (skip research-phase):
- **Phase 1:** Conversational AI basics, Canvas API integration (well-documented)
- **Phase 2:** Double Diamond framework, core brainstorming techniques (decades of literature)
- **Phase 4:** Human-AI collaboration patterns (recent but well-researched)
- **Phase 6:** Decision matrices, voting UX, SWOT templates (established patterns)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (Techniques) | HIGH | 18 techniques sourced from IDEO, NN/g, IxDF, ASQ, MIT - authoritative sources with decades of facilitation research |
| Features | HIGH | Table stakes validated across multiple sources (IDEO rules, Double Diamond, HMW framing), competitive features from peer-reviewed studies |
| Architecture | HIGH | Double Diamond model is British Design Council standard (2004), signal detection patterns from conversational UX research, phase structure from multiple convergent sources |
| Pitfalls | HIGH | All critical pitfalls backed by peer-reviewed research (Wharton, MIT, ACM DIS, SSRN) with documented consequences and prevention strategies |

**Overall confidence:** HIGH

### Gaps to Address

**Technique effectiveness measurement** — Research documents WHAT techniques exist and WHEN to use them, but not HOW WELL they work in AI-assisted vs. human-only facilitation. During implementation, will need to instrument sessions to measure:
- Idea count per technique
- User engagement signals per technique
- Time-to-decision by technique path
- User satisfaction by session structure

**Approach:** Build instrumentation in Phase 2 (technique engine). Use data from early users to validate trigger conditions in Phase 5.

**Optimal visual complexity progression** — Research shows both "too simple" (generic boxes) and "too complex" (overwhelming) are problems, but exact threshold is unclear. What constitutes "appropriate detail" varies by user and domain.

**Approach:** Default to simple, add explicit "more detail" affordance. Track when users request more detail vs. when they don't. A/B test detail levels in Phase 3.

**Signal detection thresholds** — Research indicates what signals to monitor (response length, energy, blocks), but not the exact thresholds. For example: "LOW engagement = response <20 words" is an inference, not a verified threshold.

**Approach:** Start with literature-based thresholds in Phase 1, instrument actual user behavior, calibrate in Phase 5 based on data. Expect iteration.

**Multi-user vs. single-user dynamics** — All research and roadmap assumes single-user sessions. Group brainstorming has different dynamics (social loafing, groupthink, participation imbalance). If multi-user becomes a requirement, will need additional research.

**Approach:** Build for single-user first. If multi-user is needed, trigger research-phase specifically for: turn-taking protocols, participation balancing, consensus mechanisms, simultaneous canvas editing conflicts.

## Sources

### Primary (HIGH confidence)

**Brainstorming Fundamentals:**
- IDEO Design Thinking Resources - https://designthinking.ideo.com/resources
- Stanford d.school Tools - https://dschool.stanford.edu/tools/
- NN/g (Nielsen Norman Group) Articles - Diverge-and-Converge, HMW Questions, Prioritization Matrices
- Interaction Design Foundation - Ideation Methods, Affinity Diagrams, SCAMPER
- British Design Council - Double Diamond Process Model
- ASQ (American Society for Quality) - Affinity Diagrams, Fishbone Diagrams

**Technique Documentation:**
- De Bono Group - Six Thinking Hats official methodology
- Tony Buzan - Mind Mapping inventor documentation
- Google Design Sprint Kit - Crazy 8s, rapid ideation methods
- Wikipedia - 6-3-5 Brainwriting, Double Diamond (well-cited)

**AI-Human Collaboration Research:**
- Wharton Study: "Does AI Limit Our Creativity?" (peer-reviewed)
- MIT Study: "AI Use Could Weaken Brain Power" (neuroscience research)
- ACM DIS 2024: "Design Fixation in Generative AI" (peer-reviewed)
- SSRN: "Autonomy Frustration in Human-AI Creative Collaboration" (peer-reviewed)
- Springer: "AI Brainstorming and Cognitive Load" (peer-reviewed)
- arXiv: "Exploration vs Fixation in Human-AI Co-Creation" (preprint)

**Facilitation Best Practices:**
- SessionLab - 43 Brainstorming Techniques (practitioner guide with citations)
- Miro, Mural, Figma - Templates and guides (industry standard tools)
- Voltage Control, SmartStorming - Facilitation frameworks

### Secondary (MEDIUM confidence)

**Industry Analysis:**
- IDEO U Blog - Brainstorming rules, 10 idea generation activities
- Mindtools - SCAMPER, Reverse Brainstorming, Starbursting (practitioner summaries)
- Asana Resources - Brainstorming techniques compilation
- Creately, Lucidspark Guides - Visual brainstorming techniques

**UX Patterns:**
- Medium/Design Bootcamp - Conversational UX for AI
- Fastbots.ai - Making chatbots human and engaging
- Reintech - Real-time canvas collaboration best practices
- NN/g UX Articles - AI workshop facilitation, AI tool limitations

**Cognitive Science:**
- DTIC Research Note - Visible thinking and cognitive offloading
- PMC (PubMed Central) - Cognitive mapping for learning
- FasterCapital - Conversational engagement metrics

### Tertiary (LOW confidence - needs validation)

- The Design Gym - Facilitator tips (single practitioner perspective)
- RAND Research - AI project failures (general tech, not brainstorming-specific)
- LinkedIn Advice - Facilitation best practices (crowdsourced, unverified)

---

*Research completed: 2026-01-26*
*Ready for roadmap: yes*
