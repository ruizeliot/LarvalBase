# Verification Gates for Orchestrator v8.0

**Add these sections after Section 8.1 and before Section 8.2 in orchestrator-desktop-v8.0.md**

---

### 8.1b GATE 1: E2E Test Integrity Check (After Phase 3)

**Purpose:** Verify E2E test code actually tests what the specs describe. Workers often shortcut tests using browser.execute() to inject synthetic events instead of real WebdriverIO actions.

**Run this gate ONLY after Phase 3 completes.**

```bash
PHASE=$(cat ".pipeline/manifest.json" | jq -r '.currentPhase')

if [ "$PHASE" = "3" ]; then
  echo "=== GATE 1: E2E Test Integrity Check ==="

  CHEATS_FOUND=0

  # Pattern 1: browser.execute() with synthetic events
  SYNTHETIC_EVENTS=$(grep -rn "browser\.execute.*\(DragEvent\|MouseEvent\|KeyboardEvent\|dispatchEvent\)" e2e/specs/*.js 2>/dev/null | wc -l)
  if [ "$SYNTHETIC_EVENTS" -gt 0 ]; then
    echo "VIOLATION: Found $SYNTHETIC_EVENTS instances of synthetic event injection"
    grep -rn "browser\.execute.*\(DragEvent\|MouseEvent\|KeyboardEvent\|dispatchEvent\)" e2e/specs/*.js 2>/dev/null | head -10
    CHEATS_FOUND=1
  fi

  # Pattern 2: browser.execute() with DataTransfer
  DATA_TRANSFER=$(grep -rn "browser\.execute.*DataTransfer" e2e/specs/*.js 2>/dev/null | wc -l)
  if [ "$DATA_TRANSFER" -gt 0 ]; then
    echo "VIOLATION: Found $DATA_TRANSFER instances of synthetic DataTransfer"
    CHEATS_FOUND=1
  fi

  if [ "$CHEATS_FOUND" -eq 1 ]; then
    echo "=== GATE 1 FAILED ==="
    echo "E2E tests use synthetic events instead of real WebdriverIO actions."
    echo "Tests MUST use: \$().click(), \$().dragAndDrop(), browser.keys()"
    
    GATE1_RETRIES=$(cat ".pipeline/manifest.json" | jq -r '.phases["3"].gate1Retries // 0')
    GATE1_RETRIES=$((GATE1_RETRIES + 1))

    if [ "$GATE1_RETRIES" -gt 2 ]; then
      echo "ERROR: Gate 1 failed 3 times. Escalating to user."
      cat ".pipeline/manifest.json" | jq '.phases["3"].gate1Failed = true' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
    else
      cat ".pipeline/manifest.json" | jq '.phases["3"].status = "running" | .phases["3"].gate1Retries = '$GATE1_RETRIES > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
      
      WORKER_PID=$(cat ".pipeline/manifest.json" | jq -r '.workerPid // empty')
      if [ -n "$WORKER_PID" ]; then
        powershell.exe -ExecutionPolicy Bypass -File "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office/lib/inject-worker-message.ps1" -WorkerPID $WORKER_PID -Message "GATE 1 FAILED: Rewrite E2E tests to use real WebdriverIO actions instead of browser.execute() with synthetic events."
      fi
    fi
  else
    echo "=== GATE 1 PASSED ==="
  fi
fi
```

---

### 8.1c GATE 2: Implementation Verification (After Phase 4/5)

**Purpose:** Verify implementation works as user stories describe. Don't trust test results alone.

```bash
PHASE=$(cat ".pipeline/manifest.json" | jq -r '.currentPhase')
RUN_GATE2=""

if [ "$PHASE" = "4" ]; then
  COMPLETE=$(cat ".pipeline/manifest.json" | jq '[.epics[] | select(.status == "complete")] | length')
  TOTAL=$(cat ".pipeline/manifest.json" | jq '.epics | length')
  [ "$COMPLETE" -eq "$TOTAL" ] && RUN_GATE2="true"
elif [ "$PHASE" = "5" ]; then
  RUN_GATE2="true"
fi

if [ "$RUN_GATE2" = "true" ]; then
  echo "=== GATE 2: Implementation Verification ==="
  IMPL_ISSUES=0

  # Check 1: No empty event handlers
  EMPTY_HANDLERS=$(grep -rn "onClick={\s*(\s*)\s*=>\s*{\s*}\s*}" src --include="*.tsx" 2>/dev/null | wc -l)
  [ "$EMPTY_HANDLERS" -gt 0 ] && echo "VIOLATION: $EMPTY_HANDLERS empty onClick handlers" && IMPL_ISSUES=1

  # Check 2: No test-only code paths
  TEST_ONLY=$(grep -rn "NODE_ENV.*===.*test" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
  [ "$TEST_ONLY" -gt 0 ] && echo "VIOLATION: $TEST_ONLY test-only code paths" && IMPL_ISSUES=1

  if [ "$IMPL_ISSUES" -eq 1 ]; then
    echo "=== GATE 2 FAILED ==="
    GATE2_RETRIES=$(cat ".pipeline/manifest.json" | jq -r '.phases["'$PHASE'"].gate2Retries // 0')
    GATE2_RETRIES=$((GATE2_RETRIES + 1))

    if [ "$GATE2_RETRIES" -gt 2 ]; then
      cat ".pipeline/manifest.json" | jq '.phases["'$PHASE'"].gate2Failed = true' > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
    else
      cat ".pipeline/manifest.json" | jq '.phases["'$PHASE'"].gate2Retries = '$GATE2_RETRIES > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
    fi
  else
    echo "=== GATE 2 PASSED ==="
  fi
fi
```

---

## What the Gates Catch

**Gate 1 (After Phase 3):**
- browser.execute() with synthetic DragEvent/MouseEvent/KeyboardEvent
- DataTransfer objects created inside browser.execute()

**Gate 2 (After Phase 4/5):**
- Empty event handlers: onClick={() => {}}
- Test-only code paths: if (NODE_ENV === 'test')
- Drag handlers with no real logic

## Retry Logic

Both gates allow 3 attempts before escalating to user.
