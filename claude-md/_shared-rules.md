# Shared Rules (All Agents)

These rules apply to ALL pipeline agents (orchestrator and workers). They MUST be followed at all times.

---

## Rule 1: WebSearch First

**Always search for anything technical. Don't rely on training knowledge.**

### When to Search

| Situation | Action |
|-----------|--------|
| Before implementing ANY technical solution | WebSearch first |
| Before claiming something is a "limitation" | WebSearch to verify |
| When encountering an error message | WebSearch the exact error |
| When using a library/API | WebSearch for current documentation |
| When unsure about syntax or patterns | WebSearch for examples |
| Before saying "this doesn't work" | WebSearch for workarounds |

### Examples

```
BAD:  "I'll use React.memo for optimization" (from memory)
GOOD: WebSearch "React.memo best practices 2025" → then implement

BAD:  "Wheel scroll doesn't work in WebView2, this is a known issue"
GOOD: WebSearch "WebView2 wheel scroll issue" → cite source if true

BAD:  "I'll configure Tauri like this..." (guessing)
GOOD: WebSearch "Tauri v2 configuration example" → follow docs
```

### The Rule

**If you're about to write code based on memory, STOP and search first.**

Training data has a cutoff date. Libraries change. Best practices evolve. Always verify with current sources.

---

## Rule 2: Self-Reflection After Every Task

**After completing each task, run this checklist before moving on.**

### Fixed Checklist

Ask yourself:

- [ ] **Did I search before implementing?**
  - If NO: Go back and search, then verify my implementation is correct.

- [ ] **Did I check existing code patterns first?**
  - If NO: Read similar code in the project to match style.

- [ ] **Did I avoid placeholders?**
  - No empty handlers: `onClick={() => {}}`
  - No console.log stubs: `onClick={() => console.log('TODO')}`
  - No "not implemented" alerts
  - If I added a button, it MUST do something real.

- [ ] **Did I implement both halves of completeness pairs?**
  - Add → Delete
  - Open → Close
  - Connect → Disconnect
  - Select → Deselect
  - Show → Hide
  - Enable → Disable
  - If I implemented one, I MUST implement the other.

- [ ] **Did I handle edge cases?**
  - Empty state (no items)
  - Boundaries (min/max values)
  - Invalid input
  - Rapid actions (double-click, spam)
  - Interruption (action during loading)

- [ ] **Did I use real actions, not synthetic events?**
  - In E2E tests: Use WebdriverIO `.click()`, `.setValue()`, `.dragAndDrop()`
  - NOT: `browser.execute(() => el.dispatchEvent(...))`

- [ ] **Did I test what was asked, not something easier?**
  - If the test was hard, I didn't change the test to test something simpler.
  - The original requirement is still being verified.

- [ ] **If I struggled, did I search for solutions rather than guess repeatedly?**
  - After 2-3 failed attempts, I should WebSearch for solutions.
  - Random guessing wastes time and tokens.

- [ ] **If I claimed a limitation, did I verify it exists?**
  - I searched and found documentation/issues confirming the limitation.
  - I have a source URL to cite.

### Open Reflection

After the checklist, ask:

1. **What did I just do?** (Brief summary)
2. **Did I cut any corners?** (Be honest)
3. **What could I have missed?** (Think critically)

### Action on Failure

**If any checklist item is NO:**
- STOP
- Fix the issue
- Re-run the checklist
- Only then move to the next task

---

## Rule 3: Research Before Claiming Limitations

**You MUST search online BEFORE claiming something is a "known limitation" or "doesn't work."**

### Forbidden Pattern

```
"This is a known WebDriver limitation" ← WITHOUT searching first
"X doesn't support Y" ← WITHOUT documentation
"This won't work because..." ← WITHOUT verification
```

### Required Pattern

```
1. WebSearch "[tool] [action] [environment]"
2. If search finds solution → Use it
3. If search confirms limitation → Document the source URL
4. If search finds nothing → Try implementation anyway (assumption may be wrong)
```

---

## Summary

| Rule | Action |
|------|--------|
| WebSearch First | Search before implementing anything technical |
| Self-Reflection | Run checklist after every task |
| Verify Limitations | Search before claiming something doesn't work |

These rules prevent the most common failure modes in pipeline execution.
