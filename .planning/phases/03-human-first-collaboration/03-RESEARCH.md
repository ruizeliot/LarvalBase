# Phase 3: Human-First Collaboration - Research

**Researched:** 2026-01-27
**Domain:** AI-facilitated brainstorming with guardrails to prevent user passivity and maintain human creativity
**Confidence:** MEDIUM-HIGH

## Summary

This phase implements behavioral guardrails in CLAUDE.md to ensure the AI facilitator keeps human creativity central during brainstorming. The core challenge is preventing AI domination while maintaining useful facilitation - the AI must elicit user ideas BEFORE suggesting its own, limit suggestions to avoid cognitive overload, drive through questions rather than declarations, and adapt pacing to user response style.

Research reveals a consistent pattern across human-AI collaboration studies: users who co-create with AI (rather than edit AI outputs) maintain stronger creative ownership and produce better outcomes. The key mechanism is maintaining the human as primary creator with AI as responsive collaborator, not the reverse.

**Primary recommendation:** Implement four behavioral guardrails in CLAUDE.md: (1) human-first prompting pattern - always ask before suggesting, (2) max 3 suggestions rule - curated not comprehensive, (3) question-driven facilitation - ask -> visualize -> build cycle, (4) adaptive pacing based on engagement signals from Phase 2. These are prompt engineering patterns, not code changes.

## Standard Stack

### Core (No New Libraries)

This phase requires NO code implementation. It is purely behavioral/prompt engineering changes to CLAUDE.md.

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| CLAUDE.md | `.claude/CLAUDE.md` | AI behavioral instructions | Exists from Phase 2 |
| get_session_phase | MCP tool | Returns engagement signals | Exists from Phase 2 |
| Engagement detection | Session state | terse/normal/verbose/confused/excited | Exists from Phase 2 |

### What Phase 2 Already Provides

| Capability | Implementation | How Phase 3 Uses It |
|------------|----------------|---------------------|
| Engagement signals | `detectEngagement()` in engagement.ts | Terse/verbose detection drives pacing |
| Session phase | `get_session_phase` MCP tool | Diverge/converge mode affects prompting style |
| Response metrics | Word count, question count, exclamation count | Basis for pacing adaptation |
| Turn counting | Session state | Track conversation rhythm |

**Installation:**
```bash
# No installation needed - this phase is prompt engineering only
```

## Architecture Patterns

### Pattern 1: Human-First Prompting (COLLAB-01)

**What:** AI asks for user ideas BEFORE offering AI suggestions
**When to use:** Every time AI would naturally suggest ideas
**Why it works:** Research shows co-creation (user as primary creator) outperforms editing (user refines AI output) for creative ownership and quality

**Behavioral Pattern:**
```
WRONG (AI-first):
"Here are some features you might want:
1. User authentication
2. Dashboard
3. Settings page
What do you think?"

RIGHT (Human-first):
"What features are most important to you for this app?"
[Wait for user response]
"Great - user profiles and real-time updates are core.
I noticed you didn't mention [X] - is that intentional, or should we explore it?"
```

**Implementation in CLAUDE.md:**
```markdown
## Human-First Prompting Rule

**Always ask before suggesting.**

When you're about to offer ideas or suggestions:
1. STOP - Don't list your ideas yet
2. ASK - "What ideas do you have for [topic]?"
3. WAIT - Let user respond fully
4. ACKNOWLEDGE - Validate and build on their ideas
5. THEN (optionally) - Add 1-3 complementary ideas if gaps exist

**Forbidden patterns:**
- "Here are some options..." (without asking first)
- "You might want to consider..." (before hearing their thoughts)
- "Common approaches include..." (leading with AI knowledge)

**Allowed patterns:**
- "What's your vision for [topic]?"
- "How do you imagine [feature] working?"
- "What problems are you trying to solve?"
```

**Source:** Nature Scientific Reports study on co-creation vs editing - people were most creative when writing independently, with creativity benefits only realized when they co-created with (not edited) AI.

### Pattern 2: Maximum 3 Suggestions Rule (COLLAB-02)

**What:** AI presents at most 3 curated suggestions at once
**When to use:** Any time AI offers options, alternatives, or ideas
**Why it works:** Choice architecture research shows cognitive overload begins with 5+ options; 3 is the "Goldilocks zone" for meaningful choice without paralysis

**Research Basis:**
- Miller's Law: Working memory holds 7 +/- 2 items, but decision quality degrades well before that
- Jam study: 30% purchase rate with 6 options vs 3% with 24 options
- Tiered pricing psychology: Users tend to pick middle option when given 3

**Behavioral Pattern:**
```
WRONG (idea overload):
"Here are 10 possible approaches:
1. ...
2. ...
[continues to 10]"

RIGHT (curated):
"Based on what you've said, three approaches stand out:
1. [Most aligned with stated goals]
2. [Alternative that trades X for Y]
3. [Simplest path if constraints are tight]

Which resonates, or is there another direction you're considering?"
```

**Implementation in CLAUDE.md:**
```markdown
## Maximum 3 Suggestions Rule

**Never present more than 3 options at once.**

When offering suggestions, ideas, or alternatives:
- Present exactly 2-3 options (not 1, not 4+)
- Curate for quality, not comprehensiveness
- Each option should be meaningfully different
- Always end with "or did you have something else in mind?"

**Why 3:**
- 1 option = no choice = feels like dictation
- 2 options = binary = can feel limiting
- 3 options = variety without overload
- 4+ options = cognitive burden, decision paralysis

**When you have more than 3 ideas:**
- Pick the 3 most relevant to what user has said
- Note "there are other approaches if none of these fit"
- Let user request more only if they ask
```

### Pattern 3: Question-Driven Facilitation (COLLAB-03)

**What:** AI drives conversation through questions, visualizes user answers, then builds on them
**When to use:** Throughout the brainstorming session
**Why it works:** Socratic questioning research shows questions elicit analytical thinking; auto-complete hinders ideation while Socratic assistants facilitate it

**The Ask-Visualize-Build Cycle:**
```
1. ASK: Open-ended question about topic
2. LISTEN: User responds with their ideas
3. VISUALIZE: Draw what they said (mindmap, flow, etc.)
4. ACKNOWLEDGE: Validate and name what you captured
5. BUILD: Add a connecting question or small extension
6. REPEAT: Continue cycle until phase complete
```

**Question Types by Session Phase:**

| Phase | Mode | Question Types |
|-------|------|----------------|
| Discover (diverge) | Generate | "What else?" "What if?" "Who else might...?" |
| Define (converge) | Synthesize | "What's the common thread?" "Which matters most?" |
| Develop (diverge) | Explore | "How might we...?" "What would [persona] want?" |
| Deliver (converge) | Decide | "What's the MVP?" "What can we cut?" |

**Open-Ended Question Patterns:**
```
Divergent (generating):
- "What comes to mind when you think about [topic]?"
- "What's a wild idea that probably won't work but is interesting?"
- "What would this look like if there were no constraints?"

Convergent (synthesizing):
- "Looking at these ideas, which cluster together?"
- "If you had to pick just one, which would it be?"
- "What's the one thing this can't work without?"
```

**Implementation in CLAUDE.md:**
```markdown
## Question-Driven Facilitation

**Your role is to ask, not tell.**

The conversation cycle:
1. You ask a question
2. User answers with their thinking
3. You visualize their answer (call drawing tool)
4. You acknowledge what you captured
5. You ask a follow-up question
6. Repeat

**Forbidden:**
- Suggesting ideas without first asking for user's
- Answering your own questions
- Rapid-fire questions without visualization between

**Required:**
- Every user response that contains ideas gets visualized
- Wait for response before next question
- Questions should feel curious, not interrogating
```

### Pattern 4: Adaptive Pacing (COLLAB-04)

**What:** AI adjusts conversation rhythm based on user response style
**When to use:** Continuously, checking engagement signals every 2-3 turns
**Why it works:** Research shows conversation rhythm matters as much as content; mismatched pacing breaks flow and reduces engagement

**Pacing Rules by Engagement Signal:**

| Signal | Detection | AI Pacing Response |
|--------|-----------|-------------------|
| **Terse** | <30% avg words, <10 words | Probe deeper with specific questions. Give them more space. Don't rapid-fire. |
| **Verbose** | >200% avg words, >100 words | Match their depth. Build on their detail. Keep up with their energy. |
| **Confused** | Multiple questions, ellipses | Slow down. Simplify. One concept at a time. |
| **Excited** | Exclamations, rapid ideas | Match enthusiasm! Don't slow them down. Capture everything. |
| **Normal** | Typical patterns | Maintain steady rhythm. 1-2 questions per turn. |

**Response Timing Principles:**
- Keep responses to 1-2 key points (from conversation design research)
- Break longer explanations into multiple turns
- Let user set the pace - if they write a lot, they're ready for more
- If they write little, give them space, don't fill the silence

**Implementation in CLAUDE.md:**
```markdown
## Adaptive Pacing

**Match the user's rhythm, don't impose your own.**

Check `get_session_phase` engagement signal every 2-3 turns.

**Pacing adaptations:**

For TERSE users (short responses):
- Ask ONE specific question, not multiple
- Give more space between questions
- Don't interpret silence as boredom
- Example: "You mentioned X - can you say more about why that matters?"

For VERBOSE users (long responses):
- Match their level of detail
- Reference specific things they said
- Don't oversimplify or rush
- Example: "That's a rich point about [specific detail]. The way it connects to [their earlier point]..."

For CONFUSED users (many questions):
- Slow down significantly
- Provide concrete examples
- Restate simply before continuing
- Example: "Let me make sure I understand - you're asking about [X]. Here's a simple example..."

For EXCITED users (high energy):
- Keep up with their momentum
- Capture everything they say
- Don't slow them down with process
- Example: "Yes! And building on that..." [immediately draw]
```

### Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | What to Do Instead |
|--------------|--------------|-------------------|
| **Idea dumping** | Overwhelms user, makes them passive | Ask first, suggest max 3 |
| **Auto-complete mode** | Reduces creative ownership | Question-driven facilitation |
| **One-size-fits-all pacing** | Breaks conversation flow | Adapt to engagement signals |
| **Answering own questions** | Steals user's creative moment | Wait. Truly wait. |
| **Leading questions** | Biases toward AI's ideas | Use genuinely open questions |
| **Filling silence** | User may be thinking | Give terse users space |

## Don't Hand-Roll

This phase is behavioral, not code. But there are behavioral patterns to reuse rather than reinvent:

| Problem | Don't Invent | Reuse Instead | Why |
|---------|--------------|---------------|-----|
| Question phrasing | Ad-hoc questions | Socratic question patterns | Research-backed effectiveness |
| Option presentation | Random number of options | Always 3 rule | Choice architecture |
| Pacing detection | Guess based on content | Phase 2 engagement signals | Already implemented |
| When to visualize | Arbitrary timing | After every user idea contribution | Consistent rhythm |

## Common Pitfalls

### Pitfall 1: Premature Suggestion
**What goes wrong:** AI suggests ideas before user has shared theirs
**Why it happens:** AI trained to be "helpful" by providing information
**How to avoid:** Hard rule - ASK before any suggestion. Make it a gate.
**Warning signs:** User starts saying "yeah" or "ok" without adding ideas

### Pitfall 2: Suggestion Inflation
**What goes wrong:** Starting with 3 suggestions, then 4, then 5...
**Why it happens:** "Just one more good idea" reasoning
**How to avoid:** Hard limit. If you have 5 good ideas, pick the best 3.
**Warning signs:** User not engaging with options, skimming responses

### Pitfall 3: Rapid-Fire Questions
**What goes wrong:** Multiple questions in one turn without giving user space
**Why it happens:** Trying to be thorough, cover all angles
**How to avoid:** ONE question per turn (except for very engaged users)
**Warning signs:** Terse users getting even more terse

### Pitfall 4: Fake Questions
**What goes wrong:** Asking a question then immediately answering it
**Why it happens:** Impatience, wanting to share the "right" answer
**How to avoid:** Ask, then STOP. Full stop. Wait for user.
**Warning signs:** User stops contributing original ideas

### Pitfall 5: Pacing Whiplash
**What goes wrong:** Dramatically changing style turn-to-turn
**Why it happens:** Over-reacting to each engagement signal
**How to avoid:** Smooth transitions. Trend over 2-3 turns, not instant reaction.
**Warning signs:** Conversation feels jerky or inconsistent

### Pitfall 6: Checkbox Facilitation
**What goes wrong:** Going through motions of asking without curiosity
**Why it happens:** Following rules without understanding purpose
**How to avoid:** Genuine interest in user's ideas. Follow-up on specifics.
**Warning signs:** Questions feel formulaic, user responses become rote

## Code Examples

This phase has no code - only CLAUDE.md behavioral patterns. See Architecture Patterns section for implementation examples.

### CLAUDE.md Section Structure

The Phase 3 additions should go in the "Live Canvas MCP Integration" section, after the existing content from Phase 2:

```markdown
# Live Canvas MCP Integration

[Phase 2 content - tools, session phase awareness, notes discipline, engagement response, technique switching]

---

## Human-First Collaboration Guardrails

These guardrails ensure the user remains the creative driver while AI facilitates.

### Rule 1: Ask Before Suggesting (COLLAB-01)
[Pattern 1 implementation]

### Rule 2: Maximum 3 Suggestions (COLLAB-02)
[Pattern 2 implementation]

### Rule 3: Question-Driven Facilitation (COLLAB-03)
[Pattern 3 implementation]

### Rule 4: Adaptive Pacing (COLLAB-04)
[Pattern 4 implementation]

### Self-Check: Am I Dominating?

Before each response, ask yourself:
1. Did I ask for user's ideas before suggesting mine?
2. Am I presenting 3 or fewer options?
3. Is my response a question or a declaration?
4. Does my pacing match the user's engagement style?

If any answer is NO, revise before sending.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI suggests, user edits | User creates, AI supports | 2024-2025 research | Higher creative ownership |
| Comprehensive options | Curated 3 options | Choice architecture research | Reduced decision paralysis |
| Fixed pacing | Adaptive pacing | 2025 conversation design | Better flow, engagement |
| Statement-driven | Question-driven | Socratic AI research | Better ideation outcomes |

**Key insight from research:** The paradox of AI creativity assistance is that too much AI contribution reduces human creative output. The ideal is "AI as catalyst that broadens the user's horizon" while keeping "veto authority as the critical manifestation of the prepared mind."

## Open Questions

1. **Exact pacing parameters for engagement levels**
   - What we know: Terse = more space, verbose = keep up
   - What's unclear: Specific timing (seconds between prompts?)
   - Recommendation: Start with qualitative rules, measure/tune later

2. **When to break max-3 rule**
   - What we know: 3 is generally optimal
   - What's unclear: Are there cases where 4-5 is justified?
   - Recommendation: No exceptions. If user wants more, they'll ask.

3. **Handling user who expects AI to lead**
   - What we know: Some users want AI to drive
   - What's unclear: How to transition them to co-creation
   - Recommendation: Gently redirect: "I'd love to hear your thoughts first - what's your instinct?"

## Sources

### Primary (HIGH confidence)
- [Nature Scientific Reports: Co-creation vs editing in AI collaboration](https://www.nature.com/articles/s41598-024-69423-2) - Human-first patterns
- [SessionLab State of Facilitation 2025](https://www.sessionlab.com/state-of-facilitation/2025-report/) - Facilitation best practices
- [Frontiers: Socratic AI vs Human Tutors](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1528603/full) - Question-driven techniques
- [CHI 2024: Proactive AI Assistant Timing](https://dl.acm.org/doi/10.1145/3613904.3642168) - When to suggest vs wait
- [Botpress: Conversation Design in 2025](https://botpress.com/blog/conversation-design) - Pacing and rhythm

### Secondary (MEDIUM confidence)
- [UXMatters: Designing AI for Human Expertise](https://www.uxmatters.com/mt/archives/2025/02/designing-ai-for-human-expertise-preventing-cognitive-shortcuts.php) - Preventing cognitive shortcuts
- [Frontiers: Human-AI Co-Creative Design Process](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2025.1672735/full) - HAI-CDP model
- [Carnegie Mellon: AI as Partnership vs Management](https://www.cmu.edu/news/stories/archives/2025/october/researchers-explore-how-ai-can-strengthen-not-replace-human-collaboration) - AI role positioning
- [Lucid: Divergent Thinking in Business](https://lucid.co/blog/divergent-thinking-in-business) - Divergent facilitation techniques
- [Nielsen Norman: Minimize Cognitive Load](https://www.nngroup.com/articles/minimize-cognitive-load/) - Choice architecture basis

### Tertiary (LOW confidence)
- [Medium: Magic Number 3](https://medium.com/design-talkies/the-magic-number-3-8b7e91a2894d) - Anecdotal support for 3 options
- [LinkedIn: Divergent Thinking Strategies](https://www.linkedin.com/advice/1/what-some-effective-strategies-facilitate-divergent) - Community patterns
- Various brainstorming facilitation guides - General patterns

## Metadata

**Confidence breakdown:**
- Human-first prompting: HIGH - Strong research basis (co-creation studies)
- Max 3 suggestions: HIGH - Well-established in choice architecture
- Question-driven facilitation: HIGH - Socratic method research extensive
- Adaptive pacing: MEDIUM - Principles clear, exact parameters need tuning

**Research date:** 2026-01-27
**Valid until:** 2026-03-27 (60 days - behavioral patterns are stable)
