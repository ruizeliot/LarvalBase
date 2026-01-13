# Worker Rules

**Created:** 2026-01-08
**Status:** Complete Reference

---

## Overview

Workers follow rules defined in `claude-md/_worker-base.md`. These rules ensure consistent, high-quality execution across all phases. Rules are mandatory and non-negotiable.

---

## Rule 1: WebSearch First

**Always search before implementing or claiming anything.**

### When to Search

| Situation | Action |
|-----------|--------|
| Before implementing ANY technical solution | WebSearch first |
| When encountering error messages | WebSearch the exact error |
| When using unfamiliar APIs/libraries | WebSearch for documentation |
| Before claiming something is a "limitation" | WebSearch to verify |
| After 2 failed attempts at same approach | WebSearch for alternatives |

### Claiming Limitations

If you believe something is a limitation:
1. WebSearch first for confirmation
2. Cite source URL if limitation exists
3. If no source found, try implementation anyway (assumption may be wrong)

### Example

```
BAD:  "WebDriver doesn't support wheel scroll" (from memory)
GOOD: WebSearch "WebDriver wheel scroll support" -> cite source if true
```

---

## Rule 2: No Mocking

**Never mock system APIs, external integrations, or create test-only code paths.**

### Forbidden Patterns

```typescript
// ❌ FORBIDDEN - Mocking system APIs
jest.mock('@tauri-apps/plugin-dialog')
vi.mock('@tauri-apps/plugin-fs')

// ❌ FORBIDDEN - Hardcoded fake data
const mockData = { nodes: [], edges: [] }  // in production code

// ❌ FORBIDDEN - Test-only code paths
if (process.env.NODE_ENV === 'test') {
  return mockData;
}
if (import.meta.env.MODE === 'test') {
  // different behavior
}
```

### The Principle

**If a test cannot pass without a mock, THE FEATURE IS NOT IMPLEMENTED.**

Fix the implementation. Install the integration. Make it real.

---

## Rule 3: Completeness Pairs

**If implementing an action, you MUST implement its pair.**

| Action | Required Pair |
|--------|---------------|
| Add / Create | Delete / Remove |
| Open / Expand | Close / Collapse |
| Connect | Disconnect |
| Show | Hide |
| Enable | Disable |
| Select | Deselect |
| Start | Stop / Pause |
| Zoom in | Zoom out |
| Lock | Unlock |
| Pin | Unpin |
| Subscribe | Unsubscribe |
| Undo | Redo |

### Self-Check

After implementing any action, ask: "Did I implement the pair?"

---

## Rule 4: No Placeholders

**Never add UI elements without functionality.**

### Forbidden Patterns

```tsx
// ❌ FORBIDDEN - Empty handlers
<button onClick={() => {}}>Edit</button>

// ❌ FORBIDDEN - Console.log stubs
<button onClick={() => console.log('TODO')}>Delete</button>

// ❌ FORBIDDEN - Alert placeholders
<button onClick={() => alert('Not implemented')}>Save</button>

// ❌ FORBIDDEN - Buttons without handlers
<button>Submit</button>  // No onClick = forbidden

// ❌ FORBIDDEN - Menu promises without delivery
<div aria-haspopup="menu">Options</div>  // No actual menu
```

### The Principle

**If it looks interactive, it MUST be interactive.**

If you can't implement it now, don't add the element.

---

## Rule 5: Todo Tracking

**Orchestrator tracks progress via the todo list. Keep it updated.**

### Rules

| Rule | Description |
|------|-------------|
| Initialize at startup | Use todo list from phase instructions |
| One `in_progress` at a time | Helps orchestrator track current work |
| Mark `completed` immediately | When task is done, not batched later |
| Never modify content | Only change `status` field |
| Sequential execution | Complete task N before starting N+1 |

### Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Not yet started |
| `in_progress` | Currently working on |
| `completed` | Finished successfully |

### Example Update

```javascript
// ✅ CORRECT - Only status changes
TodoWrite([
  { content: "1. Define user stories", status: "completed", activeForm: "Defining stories" },
  { content: "2. Create test specs", status: "in_progress", activeForm: "Creating specs" },
  { content: "3. Review output", status: "pending", activeForm: "Reviewing output" }
])
```

---

## Rule 6: Test Investigation Order

**When a test fails, ALWAYS investigate in this order:**

1. **FIRST** - Check implementation code (is the code wrong?)
2. **ONLY THEN** - Check test code (is the test wrong?)

### Why This Order

| Order | Result |
|-------|--------|
| Code first, test second | Bugs get fixed, tests remain reliable |
| Test first (WRONG) | Bugs get hidden, tests become worthless |

**NEVER fix a test without first verifying the implementation is correct.**

---

## Rule 7: No Test Cheating

**Never change what a test verifies to avoid implementing the hard part.**

### What is Test Cheating?

When a test fails, you might be tempted to:
1. Change the test to test something easier
2. Implement the easier thing instead
3. Declare success because "tests pass"

**This is CHEATING.** The original functionality was never implemented.

### Self-Check

1. "Does my test still verify the ORIGINAL requirement?"
   - YES → OK to commit
   - NO → You changed the requirement. Revert.

2. "Am I testing what the user story says, or something easier?"
   - If easier → You're cheating. Implement the hard thing.

---

## Rule 8: Edge Case Matrix

**Every E2E test must cover at least 2 edge cases:**

| Category | Edge Cases |
|----------|------------|
| Empty state | No items, first item, single item |
| Boundaries | Min value, max value, at limit |
| Invalid input | Empty string, special chars, too long |
| Rapid actions | Double-click, spam clicks, drag cancel |
| Interruption | Action during loading, mid-drag escape |
| State conflicts | Delete while editing, move while drag |

---

## Rule 9: Code Patterns First

**Read existing code BEFORE implementing anything.**

### What to Check

```bash
# Tauri command patterns
cat src-tauri/src/lib.rs | head -100

# React component patterns
find src/components -name "*.tsx" | head -3 | xargs cat

# Invoke patterns
grep -r "invoke" src --include="*.tsx" | head -20

# State management patterns
grep -r "useState\|useStore" src --include="*.tsx" | head -10
```

### Benefits
- Reduces Edit tool calls from 60+ to ~20
- Prevents style inconsistencies
- Catches existing utilities you can reuse
- Reveals project conventions

---

## Rule 10: Git Discipline

**Commit at phase end with conventional format.**

### Commit Format

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<body with details>

<test counts if applicable>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Types by Phase

| Phase | Type | Example |
|-------|------|---------|
| 1 | `docs` | `docs: define user stories for TaskFlow` |
| 2 | `test` | `test: add multi-layer test specs` |
| 3 | `feat` | `feat: bootstrap skeleton with RED tests` |
| 4 | `feat` | `feat(epic-1): implement Task Management` |
| 5 | `chore` | `chore: finalize for production` |

---

## Rule 11: Autonomous Execution

**For phases 2-5: No user interaction.**

### Rules
- Do NOT ask user questions - make reasonable decisions
- Do NOT wait for user input
- Do NOT use AskUserQuestion tool
- Complete the phase - keep trying until success
- If stuck on error for 3+ attempts, try different approach

### Exception
Phase 1 (brainstorm) IS interactive - uses AskUserQuestion for design decisions.

---

## Summary: You MUST

- WebSearch before implementing or claiming limitations
- Read existing code patterns before implementing
- Implement BOTH halves of completeness pairs
- Run empty handler detection before committing
- Handle edge cases from the matrix
- Check implementation code before test code
- Keep todos updated in real-time
- Commit at phase completion

## Summary: You MUST NOT

- Mock system APIs (Tauri, OS, filesystem, dialog, network)
- Use hardcoded/fake data instead of real API calls
- Create test-only code paths (`if NODE_ENV === 'test'`)
- Add placeholder/empty handlers
- Add UI elements without functionality
- Implement one action without its pair
- Change what a test verifies
- Modify todo content (only change status)
- Skip any test layer
- Ask user questions in autonomous phases (2-5)

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-08 | Initial document |
| 2026-01-13 | Made standalone (expanded all rules with examples) |
