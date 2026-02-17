# Pipeline Audit — Cross-Correlation Analysis

> Cross-referencing all 69 issues from the [audit report](audit-report-2026-02-17.md) to identify systemic patterns.
> Date: 2026-02-17

---

## How to Read This Document

Each **cluster** groups issues that share a common root cause or theme. Within each cluster:
- **Occurrences** lists every instance across all channels, with the original issue ID for traceability
- **Root Cause** explains why these issues keep happening
- **Fix Scope** indicates what needs to change (code, config, SOUL.md, workflow, etc.)

---

## Cluster Map

| # | Cluster | Occurrences | Channels Affected | Severity |
|---|---|---|---|---|
| C1 | [Workflow State Machine Broken](#c1-workflow-state-machine-broken) | 10 | général, physics, audit8, chris | Critical |
| C2 | [Claude Code Session Management](#c2-claude-code-session-management) | 9 | physics, audit8, chris | Critical |
| C3 | [Manager Autonomy Deficit](#c3-manager-autonomy-deficit) | 6 | physics, audit8, chris | Bug |
| C4 | [Internal Message Leakage](#c4-internal-message-leakage) | 4 | physics, audit8 | Bug |
| C5 | [Deliverable & Planning Quality](#c5-deliverable--planning-quality) | 6 | physics, audit8, chris | Critical |
| C6 | [QA Process Gaps](#c6-qa-process-gaps) | 7 | audit8, chris | Rework |
| C7 | [Language & Localization](#c7-language--localization) | 3 | général, physics | UX |
| C8 | [Discord Permission & Channel Issues](#c8-discord-permission--channel-issues) | 5 | général, physics, audit8 | Bug |
| C9 | [Agent Role Boundaries](#c9-agent-role-boundaries) | 5 | général, physics, audit8 | Rework |
| C10 | [Infrastructure & Token Conflicts](#c10-infrastructure--token-conflicts) | 6 | général | Bug |
| C11 | [Step 1E — Existing Project Onboarding](#c11-step-1e--existing-project-onboarding) | 3 | physics | Rework |
| C12 | [Security & Credential Handling](#c12-security--credential-handling) | 2 | chris, physics | Security |
| C13 | [Brainstorm → Implementation Handoff](#c13-brainstorm--implementation-handoff) | 4 | audit8, chris | Improvement |

---

## C1. Workflow State Machine Broken

**The single most reported issue cluster (10 occurrences across all channels).**

The implementation workflow's I1→I2→I1 epic loop does not function correctly. Manager doesn't know what step comes next, VoiceScribe transitions to wrong steps, and the user has to manually nudge the workflow forward every time.

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| général #3 | WorkflowBot/Manager role confusion | 3-bot chain caused workflow breakdowns |
| général #5 | Duplicate WORKFLOW-STATE.md entries | "4 duplicate entries for audit-test with different channel IDs" |
| audit8 #9 | Manager unclear what to do after build | `>> it's clearly not clear for the manager what to do, it should jump to qa` |
| audit8 #10 | Manager not following workflow | `>> it is not following the implementation workflow` |
| audit8 #11 | Should go back to I1 | `>> it should setup to do workflow next, and it should go back to I1 here` |
| audit8 #13 | Wrong step after QA | `>> we're supposed to be back to I1, use /workflow step` |
| audit8 other #3 | VoiceScribe I1/I2 confusion | "VoiceScribe jumped to I2, but Epic 2 hasn't been built yet" |
| chris #1 | Workflow didn't advance | `>> did not move on to next step ? maybe it's not useful` |
| chris #2 | Implementation workflow rework | `>> maybe need to rework implementation workflow` |
| chris other #2 | Manager marked I1 complete without building | Manager advanced to I2 without running the build |

### Root Cause

1. **No explicit state machine**: WORKFLOW-STATE.md is a text file that Manager reads/writes manually. There's no enforced state transition logic — Manager uses judgment to decide what step comes next, and that judgment is often wrong.
2. **VoiceScribe and Manager disagree**: VoiceScribe posts banners based on its own understanding of the step, which can differ from Manager's actual state.
3. **No completion gates**: Nothing validates that I1 actually produced code before transitioning to I2. Manager can claim completion without verification.
4. **Stale entries accumulate**: Failed project creates leave ghost entries that confuse routing.

### Fix Scope

- `workflow-next.js` — needs enforced state transitions with validation gates
- `WORKFLOW-STATE.md` — needs cleanup on project deletion/reset
- Manager SOUL.md — needs clearer "after I1, always go to I2" rules
- VoiceScribe — should read state from same source as Manager, not infer

---

## C2. Claude Code Session Management

**9 occurrences — CC launches wrong, builds in wrong place, posts to wrong channel, and loses all context between sessions.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| physics #1 | CC not launched despite claim | `>> did not launch claude code here` |
| audit8 #5 | CC posted to wrong channel | `>> CC posted in wrong channel again` |
| audit8 #7 | Manager asked user to launch CC | `>> manager must not ask me to launch CC, it must do it itself` |
| audit8 #8 | Webhook bug (repeat) | `>> note this bug` |
| audit8 other #1 | CC builds in wrong directory | "CC created the project in the wrong directory (~/.moltbot/beergame)" |
| chris #3 | CC transcript logging needed | `>> we will need to log claude code transcript` |
| chris #8 | CC transcript logging (repeat) | `>> save the transcript of this specific claude code session for later analysis` |
| chris #15 | CC needs project context | `>> CC needs updated context and doc about the project, shouldn't start from scratch` |
| chris other #6 | CC launch failures | "PID found but Enter keys didn't land" |

### Root Cause

1. **Launch script uses wrong CWD**: `cc-run-v2.ps1` launches CC from `~/.moltbot/` — CC then creates files in that directory instead of the project folder.
2. **Global webhook overrides project webhook**: `.claude/CLAUDE.md` contains the #général webhook. CC reads this file and uses it for status posts. No mechanism to inject a project-specific webhook.
3. **No session persistence**: Each CC invocation starts a fresh Claude session. Prior work, architectural decisions, and project context are lost. The CC prompt includes the PRD but not the current state of the codebase or decisions from previous sessions.
4. **Windows Terminal injection unreliable**: The `inject-message.ps1` script uses `WriteConsoleInput` to send Enter keys, which sometimes fails silently. No retry or verification mechanism.
5. **No transcript archival**: CC session output vanishes when the terminal closes. No hook to save transcripts.

### Fix Scope

- `cc-run-v2.ps1` — must `cd` to project directory and pass project-specific webhook
- CC prompt template — must include current CLAUDE.md, prior session summary, and project-specific webhook
- New `cc-transcript-save.ps1` — post-session hook to archive transcripts
- `inject-message.ps1` — needs verification loop (check if CC actually received input)

---

## C3. Manager Autonomy Deficit

**6 occurrences — Manager asks the user questions it should answer itself, or fails to act when the workflow demands it.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| physics #1 | Didn't launch CC when it said it would | `>> did not launch claude code here` |
| physics #13 | Didn't react to workflow transition | `>> manager has not reacted` |
| audit8 #7 | Asked user to launch CC | `>> manager must not ask me to launch CC, it must do it itself` |
| audit8 #9 | Asked user whether to QA or build next | `>> it should jump to qa and evaluation` |
| audit8 #11 | Told user to run CC prompt manually | `>> it should setup to do workflow next` |
| chris other #2 | Marked I1 complete without building | Manager advanced to I2 without actual code |

### Root Cause

1. **SOUL.md lacks "always do" rules**: Manager's instructions describe the workflow but don't enforce autonomous action. When uncertain, Manager defaults to asking the user instead of following the workflow.
2. **CC launch is technically complex on Windows**: Manager may hesitate because past launches have failed (inject script issues), leading it to ask the user as a safer option.
3. **No workflow enforcement**: Manager can skip steps or ask questions because nothing prevents it from deviating.

### Fix Scope

- Manager SOUL.md — add explicit "NEVER ask user to launch CC" and "ALWAYS auto-advance workflow" rules
- `cc-run-v2.ps1` — make launch reliable enough that Manager trusts it
- Workflow engine — enforce transitions so Manager can't skip or ask

---

## C4. Internal Message Leakage

**4 occurrences — Bot internal reasoning, thinking blocks, and incremental updates appear as user-visible messages in Discord.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| physics #8 | Storm message spam (10+ msgs for one edit) | `>> c'est abusé tout les messages. Ca aurait pu être regroupé` |
| physics #9 | Manager speaks to itself | `>> still leaking issues where manager speaks to itself in discord channel` |
| audit8 #3 | Manager updated notes before asking user | `>> manager should call notebot only once user has approved` |
| général #3 | WorkflowBot chain confusion | 3-bot chain creating unnecessary visible handoffs |

### Root Cause

1. **OpenClaw doesn't filter internal tool-use reasoning**: When Manager calls tools or reasons about next steps, those messages get posted to Discord. There's no "internal monologue" suppression.
2. **Storm has no message batching**: Each CSS tweak or layout adjustment triggers a new message. Storm should accumulate changes and post one final update.
3. **Premature NoteBot calls**: Manager triggers NoteBot updates as soon as content exists, not after user validation. This creates visible noise.

### Fix Scope

- OpenClaw config — investigate `suppressInternalMessages` or similar setting
- Storm SOUL.md — add "batch all incremental changes into ONE final message" rule
- Manager SOUL.md — add "wait for user approval before calling NoteBot to update notes"

---

## C5. Deliverable & Planning Quality

**6 occurrences — Step 3 deliverables are too shallow, technical planning lacks depth, and CC builds don't match requirements.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| physics #10 | MAJOR: deliverables oversimplified | `>> MAJOR ISSUE HERE, simplified version of all the brainstorm` |
| physics #11 | Shallow deliverables → poor implementation | `>> if deliverables are not rich, implementation has very limited info` |
| chris #7 | Wrong API endpoint in demo brief | `>> clearly more technical thinking is needed in planning` |
| chris #9 | Pitch deck should have full app mockup | `>> rework the pitch deck to have a full mock-up of the application` |
| chris other #3 | Epic 3 build incomplete | Predictions page had 2 cards instead of specified 5 models |
| audit8 other #4 | Manager didn't know PRD had user stories | Tried to regenerate content that already existed |

### Root Cause

1. **Step 3 compilation summarizes instead of expanding**: The compilation prompt likely says "summarize" or "create concise deliverables." It should say "expand and detail every discussion point."
2. **No technical review in brainstorm phase**: Mockups are visual-only. No one validates API endpoints, data models, or technical feasibility before implementation begins.
3. **CC prompt doesn't reference all deliverables**: CC may receive the PRD but not the mockup HTMLs, brainstorm notes, or pitch deck — so it builds from incomplete context.
4. **No validation between deliverables**: PRD says one thing, mockup shows another, pitch deck has a third version. No cross-check step.

### Fix Scope

- Step 3 compilation prompt — change from "summarize" to "expand with full detail from all threads"
- Add Step 3B: Technical Review — validate APIs, data models, routes before implementation
- CC prompt template — include links/content from ALL deliverables (PRD + mockups + notes)
- Add deliverable consistency check — PRD user stories must map 1:1 to mockup sections

---

## C6. QA Process Gaps

**7 occurrences — QA is incomplete, lacks visual comparison, has no proper demo instructions, and skips basic steps like starting the app.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| audit8 #12 | Didn't start app before testing | `>> did not start the app and therefore was not ready for testing` |
| chris #4 | Demo message too vague | `>> demo message needs more guidance on where and how to test` |
| chris #5 | Demo checklist needs detail | `>> need more details on what to test` |
| chris #11 | QA rework needed | `>> qa might need some rework` |
| chris #12 | Mockup vs implementation comparison | `>> mockup should be compared to section implemented` |
| chris #14 | Test workers not maximized | `>> use as many active workers as possible` |
| audit8 other #5 | Epic 2 test failure unresolved | No follow-up on scenario selection bug |

### Root Cause

1. **I2 has no checklist**: There's no mandatory pre-QA checklist (start dev server, run automated tests, prepare demo brief with navigation steps). Manager improvises each time.
2. **No visual regression**: Mockup HTMLs exist but are never compared to the built product. QA is purely exploratory.
3. **Demo briefs are freeform**: No template for demo instructions. Some are detailed, others just list user story titles.
4. **Test configuration not standardized**: No default `--workers=max` flag, no standard test runner configuration.

### Fix Scope

- I2 checklist in workflow.yaml — mandatory steps: `start dev server`, `run tests with --workers=max`, `generate demo brief from template`
- Demo brief template — must include: page URL, navigation path, what to click, expected result
- Add visual comparison step — screenshot each mockup section, screenshot each built page, generate side-by-side diff
- Unresolved test failures must be tracked — create bug tickets, don't just offer A/B choice and move on

---

## C7. Language & Localization

**3 occurrences — Language selection doesn't persist, and there was no config step at all initially.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| général #1 | Need language/personality config at start | `>> set things like the language... also the discussion style` |
| général #9 | No welcome banner or config step | "there was nothing. We need proper banner messages at the start" |
| physics #2 | Language switch ignored | `>> n'est pas repassé en FR` |

### Root Cause

1. **Step C was missing entirely**: Originally projects jumped straight to Router with no configuration. Step C (Welcome & Configuration) was added during this audit period.
2. **Language stored but not enforced**: Even after Step C was added, Manager doesn't consistently read the language preference and apply it to all subsequent messages.
3. **No session-level language flag**: Language is stored in workflow state but not propagated to agent instructions. Each bot must independently remember to use the chosen language.

### Fix Scope

- Step C — already added, verify it works consistently
- Language propagation — store language in project config, inject into every agent's session bootstrap
- Add language check to Manager SOUL.md — "Always respond in the project's configured language"

---

## C8. Discord Permission & Channel Issues

**5 occurrences — Thread access, channel recognition delays, and emoji reaction failures.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| physics #6 | Users can't access section threads | `>> j'ai pas accès aux sections` |
| général #7 | React emoji fails on new channels | "OpenClaw doesn't know the new channel yet" |
| audit8 #5 | CC posted to wrong channel | `>> CC posted in wrong channel again` |
| audit8 #8 | Webhook wrong channel (repeat) | `>> note this bug` |
| physics #5 | Manager posts in main instead of threads | `>> should not propose this in the main channel, but in threads` |

### Root Cause

1. **Thread creation doesn't set permissions**: When Manager creates threads via the message tool, participants aren't auto-added. Discord requires explicit permission grants for private threads.
2. **OpenClaw channel cache delay**: After creating a new channel, OpenClaw's internal channel list doesn't update immediately. Actions on the new channel (reactions, messages) fail until the cache refreshes.
3. **Webhook architecture is per-server, not per-channel**: The global `.claude/CLAUDE.md` webhook points to #général. There's no mechanism to create or store per-project webhooks during project setup.
4. **Manager doesn't know which thread to post in**: When starting section work, Manager sometimes posts in the main channel instead of the appropriate section thread.

### Fix Scope

- Thread creation script — must add all project participants after creating thread
- OpenClaw — file bug/request for channel cache invalidation after create
- Project setup — create per-channel webhook and store in project config
- Manager SOUL.md — "Section-specific questions must go in section threads, never main channel"

---

## C9. Agent Role Boundaries

**5 occurrences — Bots overstep their roles, answer questions meant for users, or have misconfigured instructions.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| audit8 #1 | NoteBot answered user's question | `>> notebot should not have answered, should have just posted research` |
| général #4 | Agent configs had irrelevant instructions | Empty USER.md, default AGENTS.md with email/calendar |
| général #3 | WorkflowBot/Manager role overlap | 3-bot chain, NoteBot never called |
| audit8 #3 | Manager updated notes before approval | `>> update brainstorm notes only once user has approved` |
| physics #8 | Storm posts incremental internal updates | `>> ça aurait pu être regroupé` |

### Root Cause

1. **SOUL.md doesn't define negative boundaries**: Agents know what they CAN do but not what they MUST NOT do. NoteBot's SOUL.md doesn't say "never answer user questions" — it only says "post research findings."
2. **Stale default templates**: When agents are created, they inherit default AGENTS.md templates (email, calendar, weather) that don't apply. Nobody cleaned them up until the audit.
3. **No approval gates between agents**: Manager can call NoteBot any time. There's no rule that says "only call NoteBot after user says OK."

### Fix Scope

- All agent SOUL.md files — add explicit "DO NOT" sections (negative boundaries)
- NoteBot SOUL.md — "NEVER answer questions. NEVER make decisions. Only post research and notes."
- Storm SOUL.md — "NEVER post incremental updates. Batch all changes into ONE final message."
- Manager SOUL.md — "NEVER call NoteBot to update notes before user approval."
- Template cleanup — remove default AGENTS.md content from all worker bots

---

## C10. Infrastructure & Token Conflicts

**6 occurrences — All in #général. Bot tokens, process management, and architectural complexity cause crashes and silent failures.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| général #1 | UTF-8 encoding corruption | "caractères spéciaux corrompus dans le fichier" |
| général #2 | Thread messages not captured | "beaucoup plus de messages qui ne sont pas loggés" |
| général #10 | Logger token conflict | "Two connections on same token = one killed" |
| général #11 | VoiceScribe crashes | "OpenClaw's exec kills background processes" |
| général #13 | Slash command architecture | 3 failed approaches to implement /where |
| général #14 | Logger architecture overcomplicated | Replaced with on-demand sync script |

### Root Cause

1. **Token scarcity**: The system has 5 bot tokens but some are shared or repurposed, causing Discord to kill duplicate connections.
2. **OpenClaw process management**: OpenClaw's exec tool kills background processes after timeout, which breaks persistent services like VoiceScribe's interaction handler.
3. **No native interaction support in OpenClaw**: Slash commands require a separate handler outside OpenClaw, adding architectural complexity.
4. **Original logger was a persistent service**: Running a standalone Discord.js bot for logging competed with OpenClaw for the same token. Solved by switching to REST API sync.

### Fix Scope

- Token audit — verify no two services share the same bot token
- VoiceScribe — launch interaction handler outside OpenClaw's exec (separate process)
- Logger — already fixed (switched to sync.js REST API approach)
- Consider filing OpenClaw feature request for native interaction/slash command support

---

## C11. Step 1E — Existing Project Onboarding

**3 occurrences — All in #physics-of-decision. Importing existing projects into the pipeline is tedious and poorly designed.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| physics #3 | No re-appropriation option | `>> should be an option to just re-appropriate the project through the pipeline` |
| physics #4 | Too many A/B/C questions | `>> a lot of questions rather than going into sections, needs a lot of rework` |
| physics #7 | Manager lost context during review | `>> the manager is not guiding where to go correctly` |

### Root Cause

1. **Step 1E treats every feature as a question**: For a project with 20 features, that's 20 separate A/B/C questions. Should instead show all features at once and ask "which to keep/modify/remove?"
2. **No batch mode**: Can't say "keep all" and then selectively modify a few.
3. **Context window pressure**: With many features to review, Manager's context fills up and it loses track of what project/section it's working on.

### Fix Scope

- Redesign Step 1E — present all features in a table, allow batch "keep all" with selective overrides
- Add project re-appropriation shortcut — "import this project as-is, skip to Step 2"
- Consider context compression — summarize reviewed features to free context for current work

---

## C12. Security & Credential Handling

**2 occurrences — Credentials posted in plaintext in Discord channels.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| chris #13 | SSH password in chat | `>> ssh password deleted` |
| physics #12 | SSH architecture backwards | `>> it's them who give access to their computer` |

### Root Cause

1. **No credential handling policy**: Manager has no rule saying "never post passwords or API keys in Discord." When a user shares credentials, Manager uses them in plaintext exec commands visible to all channel members.
2. **SSH flow misunderstood**: The build delegation flow is backwards in Manager's instructions. It suggests remote users connect to the host, when actually they should provide access to their own machine.

### Fix Scope

- Manager SOUL.md — add "NEVER post passwords, API keys, or tokens in Discord messages. Use DMs or secure storage."
- SSH documentation — fix direction (remote user gives access TO their machine)
- Consider credential store — encrypted project credentials file, not plaintext in chat

---

## C13. Brainstorm → Implementation Handoff

**4 occurrences — The transition from brainstorm output to implementation input is lossy and incomplete.**

### Occurrences

| Channel | Issue | Quote |
|---|---|---|
| chris #6 | No policy for off-workflow adaptation | `>> have some policy for adapting situations outside the workflow` |
| chris #10 | Default tutorial epic missing | `>> additional epics could be added by default` |
| audit8 #4 | No project summary before compilation | `>> manager could add a summary here` |
| audit8 #2 | Quality requirements incomplete | `>> add: full user journey working and testable` |

### Root Cause

1. **No standard epic list**: Each project creates epics from scratch. Common epics (tutorial, deployment, documentation, error handling) are never suggested by default.
2. **No handoff checklist**: When transitioning from brainstorm to implementation, there's no verification that all necessary artifacts exist and are complete.
3. **Quality requirements are ad-hoc**: Mockup quality standards are mentioned but not codified. Each project gets a slightly different list.
4. **Off-workflow tasks have no protocol**: When the user needs something outside the planned workflow (e.g., "integrate this API"), Manager improvises rather than following a defined adaptation protocol.

### Fix Scope

- Default epic template — include Tutorial, Deployment, Error Handling as suggested defaults
- Brainstorm→Implementation checklist — verify PRD, mockups, pitch deck, brainstorm notes all exist and are complete before I0
- Codified quality requirements — standard list stored in config, applied to every project
- Off-workflow protocol — define how Manager handles requests outside the current step (pause workflow, execute, resume)

---

## Correlation Matrix

This matrix shows which clusters share root causes, indicating where a single fix addresses multiple problems.

| | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **C1 Workflow** | — | `cc-run` | autonomy | | | QA loop | | | | | | | handoff |
| **C2 CC Sessions** | `cc-run` | — | launch | | context | | | webhook | | | | | |
| **C3 Autonomy** | autonomy | launch | — | approval | | | | | roles | | | | |
| **C4 Leakage** | | | approval | — | | | | | roles | | | | |
| **C5 Quality** | | context | | | — | compare | | | | | | | handoff |
| **C6 QA** | QA loop | | | | compare | — | | | | | | | |
| **C7 Language** | | | | | | | — | | | | | | |
| **C8 Discord** | | webhook | | | | | | — | | tokens | | | |
| **C9 Roles** | | | roles | roles | | | | | — | | | | |
| **C10 Infra** | | | | | | | | tokens | | — | | | |
| **C11 Step 1E** | | | | | | | | | | | — | | |
| **C12 Security** | | | | | | | | | | | | — | |
| **C13 Handoff** | handoff | | | | handoff | | | | | | | | — |

### Key Correlations

1. **C1 ↔ C2 ↔ C3 (Workflow × CC × Autonomy)**: These three clusters are deeply intertwined. The workflow doesn't advance (C1) because Manager doesn't act autonomously (C3), and CC sessions fail or launch incorrectly (C2). Fixing the workflow engine and CC launch script would address all three.

2. **C4 ↔ C9 (Leakage × Roles)**: Internal message leakage happens because agent role boundaries aren't enforced. Storm posts incremental updates because its SOUL.md doesn't forbid it. Manager calls NoteBot prematurely because there's no approval gate. Both are SOUL.md fixes.

3. **C5 ↔ C6 ↔ C13 (Quality × QA × Handoff)**: Deliverables are shallow (C5), QA doesn't catch the gap (C6), and the handoff to implementation is lossy (C13). These form a pipeline quality chain — fixing compilation depth + adding visual comparison + standardizing handoff checklist addresses all three.

4. **C2 ↔ C8 (CC Sessions × Discord)**: CC posts to wrong channel because the webhook is wrong (C8), and the webhook is wrong because project setup doesn't create per-channel webhooks (C2). One fix (per-project webhook at setup time) solves both.

---

## Recommended Fix Order

Based on the correlation matrix, fixing these in dependency order maximizes impact:

### Wave 1 — Foundation (fixes 4 clusters)
| Fix | Clusters Addressed |
|---|---|
| Implement enforced workflow state machine with validation gates | C1, C3 |
| Fix `cc-run-v2.ps1` (CWD + per-project webhook + context injection) | C2, C8 |

### Wave 2 — Quality Chain (fixes 3 clusters)
| Fix | Clusters Addressed |
|---|---|
| Rewrite Step 3 compilation prompt (expand, don't summarize) | C5, C13 |
| Add I2 mandatory checklist (start server, run tests, demo template, visual comparison) | C6, C5 |
| Create per-project webhook at project setup time | C2, C8 |

### Wave 3 — Agent Behavior (fixes 3 clusters)
| Fix | Clusters Addressed |
|---|---|
| Add DO NOT sections to all agent SOUL.md files | C4, C9 |
| Add "wait for approval" gates to Manager→NoteBot calls | C4, C9 |
| Add language propagation to session bootstrap | C7 |

### Wave 4 — Design Rework (fixes 2 clusters)
| Fix | Clusters Addressed |
|---|---|
| Redesign Step 1E (batch review, re-appropriation shortcut) | C11 |
| Add credential handling policy + fix SSH direction | C12 |
| Add default epic template + off-workflow protocol | C13 |

### Wave 5 — Infrastructure (fixes 1 cluster)
| Fix | Clusters Addressed |
|---|---|
| Token audit + VoiceScribe process isolation | C10 |
| CC transcript archival hook | C2 |
| Thread permission auto-grant | C8 |

---

*Cross-correlation analysis generated 2026-02-17 by Claude Code.*
*Source: [audit-report-2026-02-17.md](audit-report-2026-02-17.md)*
