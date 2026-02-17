# Pipeline Audit Report — 2026-02-17

> Automated scan of all Discord channels with new messages since last sync.
> Covers: #général (+36), #physics-of-decision (+133 + threads), #audit8 (+100 + threads), #chris (+100 + threads)

---

## Table of Contents

1. [Summary](#summary)
2. [#général](#général)
3. [#physics-of-decision (Pod Decision)](#physics-of-decision-pod-decision)
4. [#audit8 (Beer Game)](#audit8-beer-game)
5. [#chris (EconCast)](#chris-econcast)
6. [Cross-Project Patterns](#cross-project-patterns)
7. [Priority Action Items](#priority-action-items)

---

## Summary

| Channel | ">>" Comments | Other Issues | Total |
|---|---|---|---|
| #général | 1 | 15 | 16 |
| #physics-of-decision | 12 | 1 | 13 |
| #audit8 | 13 | 5 | 18 |
| #chris (EconCast) | 15 | 7 | 22 |
| **Total** | **41** | **28** | **69** |

| Severity | Count |
|---|---|
| Critical | 5 |
| Security | 1 |
| Bug | 25 |
| Rework needed | 5 |
| UX | 8 |
| Improvement | 14 |

---

## #général

### ">>" Review Comments

#### 1. Router language/personality config should come first
- **Who**: anthonyhunt
- **When**: 2026-02-15 12:43
- **Quote**: `>> I think maybe it would be good if one of the first options when we're rooting the project is also to set things like the language for example. I think also another parameter that we can configure is the discussion style. So like maybe multiple personalities of the manager and the user has to select a personality.`
- **Context**: User was testing the audit-test project and noticed that projects always start in English with no way to configure language or interaction personality. The workflow immediately jumped to Step R (Router) without any configuration step.
- **Severity**: Improvement

### Other Issues Identified

#### 1. UTF-8 encoding corruption in logger
- **Evidence**: "les caractères spéciaux (accents, emojis) sont corrompus dans le fichier — problème d'encodage UTF-8 du logger"
- **Description**: The channel logger was corrupting special characters (accents, emojis) when writing to files.
- **Severity**: Bug

#### 2. Thread messages not fully captured by logger
- **Evidence**: User reported "y a beaucoup plus de messages dans le thread taverne qui ne sont pas loggés là"
- **Description**: The original logger only captured messages received in real-time and missed historical thread messages. No backfill mechanism existed.
- **Severity**: Bug

#### 3. WorkflowBot/Manager role confusion causing workflow failures
- **Evidence**: User frustrated with "mess in the stride" in Auto Chess project, bots not working properly
- **Description**: The original architecture had both WorkflowBot and Manager, creating a 3-bot chain (WorkflowBot → Manager → NoteBot) for simple actions. NoteBot was never called by WorkflowBot. Fixed by merging WorkflowBot into Manager.
- **Severity**: Critical

#### 4. Multiple critical agent configuration issues
- **Evidence**: Manager's audit identified 11 issues in agent configurations
- **Description**: Storm and NoteBot had completely empty USER.md files, default AGENTS.md templates with irrelevant instructions (email checking, calendar, weather), stale project data in workspaces, and no workflow context in SOUL.md files.
- **Severity**: Critical

#### 5. Duplicate WORKFLOW-STATE.md entries from failed project creation
- **Evidence**: "WORKFLOW-STATE.md has 4 duplicate entries for audit-test with different channel IDs"
- **Description**: When project creation failed or was reset, old entries remained in WORKFLOW-STATE.md, causing routing confusion.
- **Severity**: Bug

#### 6. OpenClaw intercepts `!` prefix for debug markers
- **Evidence**: `!debug test` got intercepted by OpenClaw with "bash is disabled" error
- **Description**: User wanted `!debug` as a debug marker prefix, but OpenClaw reserves `!` for native commands. Had to switch to `>>` prefix.
- **Severity**: UX

#### 7. React emoji failures on newly created channels
- **Evidence**: "Two issues: the react failed (OpenClaw doesn't know the new channel yet)"
- **Description**: When Manager tried to react with emoji to `>>` debug markers in newly created channels, the reaction would fail because OpenClaw didn't recognize the channel immediately after creation.
- **Severity**: Bug

#### 8. NoteBot model configuration failures
- **Evidence**: Multiple attempts to set Haiku model failed with "Unknown model" errors
- **Description**: Attempted model names `anthropic/claude-haiku-4-5-20241022`, `anthropic/claude-haiku-4.5`, and `anthropic/claude-haiku-4-5-latest` all failed. Correct model identifier unknown.
- **Severity**: Bug

#### 9. No welcome banner or configuration step at project start
- **Evidence**: User complained "there was nothing. The router is very simple. We need proper banner messages at the start"
- **Description**: Projects jumped directly to Router step with no welcome message, no language selection, and no personality configuration. Fixed by adding Step C.
- **Severity**: UX

#### 10. Channel logger using conflicting bot token
- **Evidence**: Logger running but not receiving messages due to token conflicts
- **Description**: Standalone channel logger used Discord.js client with a bot token that conflicted with OpenClaw's gateway connection. Two connections on same token = one killed.
- **Severity**: Bug

#### 11. VoiceScribe crashes when handling /where command
- **Evidence**: "VoiceScribe keeps crashing before it can handle the interaction"
- **Description**: VoiceScribe was added as `/where` handler but kept crashing before responding. OpenClaw's exec kills background processes after timeout. Had to launch in separate conhost.
- **Severity**: Bug

#### 12. Workflow status visual SVG alignment issues
- **Evidence**: "the branches are not done properly"
- **Description**: Workflow status diagram used text arrows instead of SVG lines, making branching paths look disconnected. Fixed but alignment still slightly off.
- **Severity**: UX

#### 13. Discord slash command architecture complexity
- **Evidence**: Multiple failed approaches to implement `/where` command
- **Description**: Required 3 attempts: (1) Manager app — OpenClaw doesn't handle interactions, (2) separate handler script — two gateway connections conflicted, (3) VoiceScribe (separate bot) — finally worked.
- **Severity**: Improvement

#### 14. Standalone logger architecture overcomplicated
- **Evidence**: User suggested simpler on-demand sync script
- **Description**: Original logger needed its own token, persistent connection, and process management. Replaced with on-demand REST API sync script to avoid token conflicts.
- **Severity**: Rework needed

#### 15. WorkflowBot account left inert after removal
- **Evidence**: "WorkflowBot Discord account still has requireMention: false on 3 channels but no agent binding"
- **Description**: After removing WorkflowBot as agent, its Discord account configuration and token remained. Harmless but messy technical debt.
- **Severity**: Improvement

---

## #physics-of-decision (Pod Decision)

### Main Channel

#### ">>" Review Comments

##### 1. Claude Code not launched despite claim
- **Who**: anthonyhunt
- **When**: 2026-02-16 08:26
- **Quote**: `>> did not launch claude code here`
- **Context**: Manager said "A sub-agent is scanning the full codebase now" but no Claude Code session was actually started. The Manager claimed to launch CC for code analysis but didn't.
- **Severity**: Bug

##### 2. Language switch ignored
- **Who**: Alexis
- **When**: 2026-02-16 08:26
- **Quote**: `>> n'est pas repassé en FR`
- **Context**: User selected config option but Manager stayed in English. Language preference not persisted.
- **Severity**: UX

##### 3. Option to re-appropriate existing projects missing
- **Who**: anthonyhunt
- **When**: 2026-02-16 08:34
- **Quote**: `>> should be an option to just re-appropriate the project through the pipeline`
- **Context**: During Step 1E review of existing features, there's no quick way to onboard an existing project. Should be a re-appropriation option.
- **Severity**: Improvement

##### 4. Existing project step needs major rework
- **Who**: anthonyhunt
- **When**: 2026-02-16 08:39
- **Quote**: `>> not ideal, a lot of questions rather than going into sections to do that, this existing project step needs a lot of rework`
- **Context**: Step 1E asks many feature-by-feature A/B/C questions ("garde/modifie/supprime?"). Tedious for existing projects with many features.
- **Severity**: Rework needed

##### 5. Manager proposing in main channel instead of threads
- **Who**: anthonyhunt
- **When**: 2026-02-16 08:46
- **Quote**: `>> the manager should not propose this in the main channel, but in threads`
- **Context**: Manager posted section work mode questions in main channel instead of the appropriate section thread. Workflow organization issue.
- **Severity**: Bug

##### 6. User can't access section threads
- **Who**: Alexis
- **When**: 2026-02-16 08:46
- **Quote**: `>> j'ai pas accès aux sections`
- **Context**: Discord permissions issue — Alexis couldn't see the section threads that were created. Manager had to add him manually.
- **Severity**: Critical

##### 7. Memory loss mid-session — Manager lost project context
- **Who**: anthonyhunt
- **When**: 2026-02-16 09:24
- **Quote**: `>> bug here, the manager is not guiding where to go correctly`
- **Context**: After completing Lobby & Rooms section, Manager couldn't identify which project it belonged to and asked if it should be attached to a project. Complete context loss.
- **Severity**: Critical

##### 8. Storm message leakage — too many incremental updates
- **Who**: Alexis
- **When**: 2026-02-16 09:19
- **Quote**: `>> je pense là c'est abusé tout les messages. Ca aurait pu être regroupé`
- **Context**: Storm posted 10+ incremental update messages when updating light mode mockup. Should batch these internal thoughts into one message.
- **Severity**: Improvement

##### 9. Manager speaks to itself in Discord
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:15
- **Quote**: `>> still leaking issues where manager speaks to itself in discord channel, ignore this bug for now`
- **Context**: Manager posted thinking blocks and internal planning messages publicly in Discord instead of keeping them internal.
- **Severity**: Bug

##### 10. MAJOR ISSUE — Deliverables oversimplified
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:31
- **Quote**: `>> MAJOR ISSUE HERE, simplified version of all the brainstorm, where it should have expanded and detailed every effort done`
- **Context**: Step 3 compilation produced very short brainstorm notes and PRD that didn't capture the full depth of discussions. Critical because implementation depends on these.
- **Severity**: Critical

##### 11. Deliverables too shallow for implementation
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:32
- **Quote**: `>> if deliverables are not rich, then implementation have very limited info to implement properly`
- **Context**: Follow-up to #10 — shallow deliverables directly lead to poor implementation quality.
- **Severity**: Critical

##### 12. SSH suggestion backwards
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:53
- **Quote**: `>> ssh is badly suggested, it's not remote user who connects to my pc, it's them who give an access to their computer`
- **Context**: Step I0 suggested non-host users connect to host's machine. Architecture is backwards — they give SSH access TO their own machine.
- **Severity**: Bug

##### 13. Manager not reacting to workflow transition
- **Who**: anthonyhunt
- **When**: 2026-02-16 14:11
- **Quote**: `>> manager has not reacted`
- **Context**: VoiceScribe transitioned to Step I1 but Manager didn't post anything for 2+ minutes. Workflow handoff issue.
- **Severity**: Bug

### Threads

No ">>" comments found in any of the 7 threads:
- Pod Decision — Components (completed, 1 iteration)
- Lobby & Rooms (completed, 2 iterations: dark → light)
- Pod Definition (completed, 4 iterations)
- Collaboration temps réel (completed, code-first approach)
- Pod Decision — Conditions (completed, 2 iterations)
- Pod Decision — Performance (completed, 4 iterations)
- Brainstorm Notes (meta tracking thread)

---

## #audit8 (Beer Game)

### Main Channel

#### ">>" Review Comments

##### 1. NoteBot answered when it should have just posted research
- **Who**: anthonyhunt
- **When**: 2026-02-16 12:32
- **Quote**: `>> notebot should not have answered, see message just above. Should have just posted the research findings and that's it for this step`
- **Context**: Manager asked which reference to orient on (Forio, beergame.org, Inchainge, or Mix). NoteBot jumped in with "D) Mix" and reasoning. At this step, NoteBot should only post research, not make decisions.
- **Severity**: Rework needed

##### 2. Quality requirements should include full user journey
- **Who**: anthonyhunt
- **When**: 2026-02-16 12:40
- **Quote**: `>> on top of these quality requirements, I would add: existing mock up interactions, like a full user journey working and testable`
- **Context**: Manager posted quality requirements for mockups (CSS animations, clickable nav, realistic data, mobile-responsive, polished design, dark theme). User wants full testable user journey added.
- **Severity**: Improvement

##### 3. Manager updated brainstorm notes before user approval
- **Who**: anthonyhunt
- **When**: 2026-02-16 12:47
- **Quote**: `>> manager should call notebot to update brainstorm notes with sections only once user has approved`
- **Context**: Storm posted 6 mockups, Manager immediately called NoteBot to update notes before asking user "Everything good?" User approved after notes were already written.
- **Severity**: Bug

##### 4. Missing project summary before compilation
- **Who**: anthonyhunt
- **When**: 2026-02-16 12:50
- **Quote**: `>> manager could add a summary here of the project, and then suggest to go into brainstorm notes for details`
- **Context**: At Step 3A, Manager asked "Anything missing or wrong before we compile?" without any project summary. Should show high-level summary first.
- **Severity**: Improvement

##### 5. CC posted in wrong channel (webhook bug)
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:01
- **Quote**: `>> CC posted in wrong channel again`
- **Context**: After compilation, CC posted to wrong Discord channel. Webhook in `.claude/CLAUDE.md` pointed to #général instead of project channel.
- **Severity**: Bug

##### 6. Manager not identified at workflow transitions
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:09
- **Quote**: `>> manager should be identified here, like other transitions`
- **Context**: VoiceScribe posted I0 banner without tagging Manager. Other transitions include bot identification.
- **Severity**: UX

##### 7. Manager must launch CC itself, not ask user
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:14
- **Quote**: `>> manager must not ask me to launch CC, it must do it itself`
- **Context**: Manager prepared CC prompt and said "ready to launch CC? I'll save the prompt for you to run." Manager should launch CC autonomously.
- **Severity**: Bug

##### 8. Webhook bug noted (repeat)
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:40
- **Quote**: `>> note this bug`
- **Context**: Manager asked for correct webhook URL because config.json pointed to #général. Same webhook issue as #5.
- **Severity**: Bug

##### 9. Manager unclear what to do — should jump to QA
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:43
- **Quote**: `>> it's clearly not clear for the manager what to do, it should jump to qa and evaluation`
- **Context**: After Epic 1 build, Manager asked "Build Epic 2 now or QA Epic 1 first?" instead of auto-proceeding to QA per workflow.
- **Severity**: Bug

##### 10. Manager not following implementation workflow
- **Who**: anthonyhunt
- **When**: 2026-02-16 13:43
- **Quote**: `>> it is not following the implementation workflow`
- **Context**: Same as #9 — Manager should follow I1→I2 loop, not ask user what to do next.
- **Severity**: Bug

##### 11. Should setup workflow next and go back to I1
- **Who**: anthonyhunt
- **When**: 2026-02-16 14:10
- **Quote**: `>> it should setup to do workflow next, and it should go back to I1 here`
- **Context**: When rolling back from I2 to I1, Manager wrote a CC prompt and told user to run it. Should handle workflow state and I1 automatically.
- **Severity**: Bug

##### 12. Did not start app before testing
- **Who**: anthonyhunt
- **When**: 2026-02-16 14:37
- **Quote**: `>> did not start the app and therefore was not ready for testing, nothing major but annoying`
- **Context**: At I2 (QA), Manager posted test report and demo instructions but didn't start the dev server. User had to manually ask "start the app."
- **Severity**: UX

##### 13. Should use /workflow step for transitions
- **Who**: anthonyhunt
- **When**: 2026-02-16 14:56
- **Quote**: `>> we're supposed to be back to I1, in the future, it's probably best to use /workflow step`
- **Context**: After Epic 1 QA passed, VoiceScribe posted I2 banner when it should be I1 for Epic 2. Suggests using `/workflow step` command.
- **Severity**: Improvement

#### Other Issues Identified

##### 1. CC builds in wrong directory
- **Evidence**: "CC created the project in the wrong directory (`~/.moltbot/beergame`). I've moved everything to the correct project folder"
- **Description**: CC consistently builds in `C:\Users\ahunt\.moltbot\beergame` instead of the project directory. Manager has to manually move files after each build. Caused by CC launch script running from wrong working directory.
- **Severity**: Critical

##### 2. Epic 2 test failure — scenario selection doesn't deselect
- **Evidence**: "clicking a different scenario doesn't deselect the previous one (`data-selected` stays true)"
- **Description**: Scenario picker bug — selecting a new card doesn't deselect the previous one. Multiple cards can have `data-selected="true"` simultaneously.
- **Severity**: Bug

##### 3. Workflow state confusion between I1 and I2
- **Evidence**: "VoiceScribe jumped to I2, but Epic 2 hasn't been built yet"
- **Description**: After Epic 1 QA, VoiceScribe transitions to I2 when it should go back to I1. The I1→I2→I1 loop logic isn't working.
- **Severity**: Bug

##### 4. Manager doesn't know PRD already contains user stories
- **Evidence**: Manager plans Phase 1 (generate user stories) even though PRD already has them
- **Description**: Manager initially confused about gate requirements vs actual PRD structure. Tried to regenerate existing content.
- **Severity**: Bug

##### 5. No resolution shown for Epic 2 test failure
- **Evidence**: Test failure reported but no follow-up
- **Description**: Manager offered bugfix session or skip, but log ends without showing resolution.
- **Severity**: UX

### Threads

No ">>" comments found in any of the 7 threads:
- Landing & Lobby, Game Setup, Game Board, Live Dashboard, Post-Game Debrief, Scenario Editor (each contain only Storm's mockup delivery)
- Brainstorm Notes (progressive NoteBot updates only)

---

## #chris (EconCast)

### Main Channel

#### ">>" Review Comments

##### 1. Workflow step transition issue
- **Who**: anthonyhunt
- **When**: 2026-02-16 17:20
- **Quote**: `>> did not move on to next step ? maybe it's not useful`
- **Context**: After Epic 1 QA passed, Manager stated it was building Epic 2, but workflow didn't advance to next step as expected.
- **Severity**: Bug

##### 2. Implementation workflow rework needed
- **Who**: anthonyhunt
- **When**: 2026-02-16 17:22
- **Quote**: `>> maybe need to rework implementation workflow`
- **Context**: Following transition issue, user suggests the entire I1→I2→I3 loop may need redesign for epic-by-epic iteration.
- **Severity**: Rework needed

##### 3. Claude Code transcript logging needed
- **Who**: anthonyhunt
- **When**: 2026-02-16 17:24
- **Quote**: `>> we will need to log claude code transcript, maybe directly in the prompt instructions ?`
- **Context**: CC sessions have no permanent record. Transcripts needed for debugging, auditing, and understanding what was built.
- **Severity**: Improvement

##### 4. Demo message needs more guidance
- **Who**: anthonyhunt
- **When**: 2026-02-16 17:27
- **Quote**: `>> the demo message need more guidance on where and how to test user stories`
- **Context**: When testing Epic 2, user couldn't find the Settings page. Demo brief said "what to test" but not "where to go."
- **Severity**: UX

##### 5. Demo checklist needs more detail
- **Who**: anthonyhunt
- **When**: 2026-02-16 17:32
- **Quote**: `>> maybe need more details on what to test like the message above`
- **Context**: After Manager provided detailed step-by-step walkthrough, user confirmed this level of detail should be default.
- **Severity**: UX

##### 6. Need policy for adapting outside workflow
- **Who**: anthonyhunt
- **When**: 2026-02-16 18:17
- **Quote**: `>> The AI has been needing to adapt here to the situation. It would be good to have some policy for adapting all sorts of situations outside of the workflow.`
- **Context**: During FRED API integration (not part of original epic plan), Manager had to improvise. System needs better handling of off-script tasks.
- **Severity**: Improvement

##### 7. More technical thinking needed in planning
- **Who**: anthonyhunt
- **When**: 2026-02-16 18:23
- **Quote**: `>> clearly more technical thinking is needed in planning`
- **Context**: Manager gave wrong API endpoint in demo brief (`/api/predictions/GDPC1` instead of `/api/forecasts`). Planning phase needs more technical depth.
- **Severity**: Bug

##### 8. CC transcript logging (repeated)
- **Who**: anthonyhunt
- **When**: 2026-02-16 18:38
- **Quote**: `>> between each claude code task once it's done, It would be good to call a notepad which task is to save the transcript of this specific claude code session for later analysis`
- **Context**: Repeat of #3 — NoteBot should archive CC transcripts automatically after each session.
- **Severity**: Improvement

##### 9. Pitch deck should have full app mockup
- **Who**: anthonyhunt
- **When**: 2026-02-16 18:45
- **Quote**: `>> The implementation is kind of matching the pitch deck which is fine. It makes me think that probably we will need to rework the pitch deck section in the brainstorm to have a full mock-up of the application.`
- **Context**: Implementation matches pitch deck well, but brainstorm should produce full app mockups (not just section mockups) for better holistic planning.
- **Severity**: Improvement

##### 10. Default tutorial epic should be standard
- **Who**: anthonyhunt
- **When**: 2026-02-16 19:02
- **Quote**: `>> Maybe additional epics could be added by default such as like a tutorial and stuff like that.`
- **Context**: User had to manually request Epic 7 (tutorial). Some epics (tutorial, deployment, docs) should be standard additions.
- **Severity**: Improvement

##### 11. QA rework needed
- **Who**: anthonyhunt
- **When**: 2026-02-16 19:16
- **Quote**: `>> qa might need some rework`
- **Context**: QA step (I3) should include visual comparison against pitch deck mockups, not just exploratory testing.
- **Severity**: Rework needed

##### 12. Mockup vs implementation comparison in QA
- **Who**: anthonyhunt
- **When**: 2026-02-16 19:17
- **Quote**: `>> in evaluation and qa, mockup should be compared to section implemented`
- **Context**: Each epic's QA should compare the built section against its original mockup HTML file for visual fidelity.
- **Severity**: Rework needed

##### 13. SSH password exposed in logs
- **Who**: anthonyhunt
- **When**: 2026-02-16 19:20
- **Quote**: `>> ssh password deleted`
- **Context**: Manager posted SSH password in plaintext in channel messages during VPS deployment.
- **Severity**: Security

##### 14. Use maximum test workers
- **Who**: anthonyhunt
- **When**: 2026-02-16 19:28
- **Quote**: `>> when running tests, it's important to use as many active workers as possible`
- **Context**: During Epic 7 testing, Manager wasn't using parallel workers. Tests would run faster with `--workers=max`.
- **Severity**: Improvement

##### 15. CC needs project context continuity
- **Who**: anthonyhunt
- **When**: 2026-02-16 19:31
- **Quote**: `>> claude code building the project needs updated context and doc about the project, shouldn't start from scratch again`
- **Context**: Each CC session starts fresh without awareness of prior work. Should receive updated context (existing code, decisions made, architecture).
- **Severity**: Bug

#### Other Issues Identified

##### 1. Workflow state exec error at project start
- **Evidence**: `⚠️ Exec: cat memory/projects/chris/workflow-state.md 2>nul failed`
- **Description**: Workflow state file doesn't exist at project start, causing error.
- **Severity**: Bug

##### 2. Manager marked I1 complete without building anything
- **Evidence**: Manager claims Epic 1 complete but no code exists, CLAUDE.md shows "NOT STARTED"
- **Description**: Manager advanced to I2 without actually running the build. Workflow state tracking disconnected from actual work.
- **Severity**: Critical

##### 3. Epic 3 initial build incomplete
- **Evidence**: Predictions page shows only 2 cards when user stories specified 5 models + leaderboard + accuracy tracking
- **Description**: CC delivered incomplete implementation. Tests passed but functional requirements weren't met.
- **Severity**: Bug

##### 4. Indicators route missing
- **Evidence**: `/indicators` route doesn't exist, causes blank page
- **Description**: Sidebar has "Indicators" link but no matching route. Quick fix redirected to Dashboard, proper page created later.
- **Severity**: Bug

##### 5. Dashboard and Indicators page duplication
- **Evidence**: Both pages showed same content initially
- **Description**: Quick fix for missing `/indicators` pointed it to Dashboard component. Confusing UX.
- **Severity**: UX

##### 6. CC launch failures (Enter key injection)
- **Evidence**: Multiple instances of CC not starting, PID found but Enter keys didn't land
- **Description**: Inject-message script for launching CC in Windows Terminal is unreliable. Enter key injection fails randomly.
- **Severity**: Bug

##### 7. Pitch deck navigation bug
- **Evidence**: User reports pitch deck navigation is broken, Manager checked and claimed fine
- **Description**: Pitch deck HTML has section navigation bug. Might be environment-specific. Not fully resolved.
- **Severity**: Bug

### Threads

No ">>" comments found in any threads:
- Epic 3 — QA Feedback (empty — only creation message)
- Settings & Config, Data Sources, Predictions Hub, Indicator Detail, Dashboard Home (mockup deliveries + notes updates)
- Brainstorm Notes (step summaries and documentation)

---

## Cross-Project Patterns

These issues appeared across multiple projects, indicating systemic problems:

### 1. Workflow State Management (all 3 projects)
- Manager doesn't auto-advance through I1→I2→I1 loop
- VoiceScribe transitions to wrong step
- Manager asks user what to do instead of following workflow
- **Impact**: Every project requires manual workflow nudging

### 2. CC Wrong Working Directory (audit8, chris)
- CC builds in `~/.moltbot/` instead of project folder
- Manager has to manually move files after each build
- **Impact**: High friction, risk of missing files

### 3. CC Wrong Webhook (audit8, chris)
- `.claude/CLAUDE.md` contains #général webhook
- Project-specific webhook not created at project setup
- CC posts completion messages to wrong channel
- **Impact**: User misses important build notifications

### 4. CC Context Loss Between Sessions (chris, physics-of-decision)
- Each CC session starts from scratch
- No project memory, no previous decisions, no architecture context
- **Impact**: Slower builds, repeated mistakes, incomplete implementations

### 5. Manager Internal Thought Leakage (physics-of-decision, audit8)
- Manager's thinking blocks and planning messages appear in Discord
- "Let me check...", "Now I need to..." messages visible to users
- **Impact**: Channel pollution, confusing for non-technical users

### 6. Step 3 Deliverable Quality (physics-of-decision, audit8)
- Compilation produces shallow summaries instead of detailed documents
- PRD and brainstorm notes don't capture discussion depth
- **Impact**: Implementation gets insufficient guidance

### 7. Manager Asks User to Launch CC (audit8, physics-of-decision)
- Manager prepares prompt but asks user to run it
- Should launch CC autonomously
- **Impact**: Breaks user experience, adds unnecessary friction

### 8. Thread Permission Issues (physics-of-decision)
- Users not auto-added to threads when created
- Requires manual intervention
- **Impact**: Users can't see section work

---

## Priority Action Items

### CRITICAL (must fix before next audit)

1. **Fix CC working directory** — CC launch script must `cd` to project folder before starting
2. **Fix CC webhook** — project setup must create project-specific webhook and pass it to CC prompt (not read from global `.claude/CLAUDE.md`)
3. **Fix Step 3 deliverable quality** — compilation must expand and detail all brainstorm work, not summarize
4. **Fix workflow I1→I2→I1 loop** — Manager must auto-advance through workflow steps without asking user
5. **Fix thread permissions** — auto-add project participants to new threads

### HIGH (should fix soon)

6. **CC context continuity** — pass project context, prior decisions, and current codebase state to each CC session
7. **Manager must launch CC autonomously** — never ask user to run CC themselves
8. **CC transcript logging** — archive each CC session transcript for later analysis (NoteBot task)
9. **Fix Manager I1 completion without building** — gate I1→I2 transition on actual code output verification
10. **Language persistence** — user's language choice must persist throughout session

### MEDIUM (next iteration)

11. **Rework Step 1E** — section-based approach instead of feature-by-feature A/B/C questions for existing projects
12. **Rework QA** — add mockup-vs-implementation visual comparison
13. **Detailed demo briefs** — include navigation steps, not just "what to test"
14. **Add default tutorial epic** — tutorial should be standard in all project plans
15. **Batch Storm messages** — group incremental mockup updates into single messages
16. **Filter Manager internal thoughts** — prevent thinking blocks from appearing in Discord
17. **Off-workflow adaptation policy** — formal handling of tasks outside the workflow
18. **Full app mockup in pitch deck** — brainstorm should produce holistic app mockup, not just section mockups
19. **Max test workers** — default to `--workers=max` for test execution
20. **Fix SSH suggestion direction** — remote users give access TO their machine, not access host's

### LOW (nice to have)

21. **Fix NoteBot role boundaries** — research only in Step 1, no decision-making
22. **Manager identity in VoiceScribe transitions** — tag bot in all workflow banners
23. **Project summary before compilation** — show high-level summary at Step 3A
24. **Manager notes update after approval** — wait for user OK before calling NoteBot
25. **Clean up inert WorkflowBot account** — remove stale config entries

---

*Report generated 2026-02-17 by Claude Code audit scan.*
*Source: Discord channel logs synced via `channel-logger/sync.js`*
