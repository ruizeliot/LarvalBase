# Worker Rules

**Created:** 2026-01-08

---

## Overview

Worker follows rules defined in `claude-md/_worker-base.md`. Rules are concise and non-redundant.

---

## Rule 1: WebSearch First

Always search before implementing or claiming anything.

**When to search:**
- Before implementing ANY technical solution
- When encountering error messages
- When using unfamiliar APIs/libraries
- Before claiming something is a "limitation"

**If claiming a limitation:**
- WebSearch first and cite source URL
- If no source found, try implementation anyway

---

## Rule 2: No Mocking

Never mock system APIs, external integrations, or create test-only code paths.

**Forbidden:**
- `jest.mock()` or `vi.mock()` on system APIs
- Hardcoded/fake data instead of real API calls
- `if (NODE_ENV === 'test')` code paths

---

## Rule 3: Completeness Pairs

If implementing an action, implement its pair:
- Add / Delete
- Open / Close
- Connect / Disconnect
- Show / Hide
- Enable / Disable

---

## Rule 4: No Placeholders

Never add UI elements without functionality:
- No empty handlers: `onClick={() => {}}`
- No console.log stubs
- No "not implemented" alerts

---

## Rule 5: Todo Tracking

- Initialize todos at phase startup
- Mark `in_progress` when starting a task
- Mark `completed` when finished
- Only change status, never modify content
