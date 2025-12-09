#!/usr/bin/env bash
# Verify edge cases exist in E2E test specs

SPECS_FILE="${1:-docs/e2e-test-specs.md}"

if [ ! -f "$SPECS_FILE" ]; then
  echo "ERROR: $SPECS_FILE not found" >&2
  exit 1
fi

# Count main tests (### E2E-NNN format)
if grep -q "^### E2E-[0-9]\+:" "$SPECS_FILE"; then
  MAIN_TESTS=$(grep "^### E2E-[0-9]\+:" "$SPECS_FILE" | wc -l | awk '{print $1}')
else
  MAIN_TESTS=0
fi

# Count edge cases (E2E-NNNa, E2E-NNNb format in bullet points)
if grep -qE "E2E-[0-9]+[a-z]" "$SPECS_FILE"; then
  EDGE_CASES=$(grep -oE "E2E-[0-9]+[a-z]" "$SPECS_FILE" | wc -l | awk '{print $1}')
else
  EDGE_CASES=0
fi

# Verify each test has "Edge Cases:" section
if grep -q "^\*\*Edge Cases:\*\*" "$SPECS_FILE"; then
  EDGE_SECTIONS=$(grep "^\*\*Edge Cases:\*\*" "$SPECS_FILE" | wc -l | awk '{print $1}')
else
  EDGE_SECTIONS=0
fi

echo "Main tests: $MAIN_TESTS"
echo "Edge case variants: $EDGE_CASES"
echo "Edge case sections: $EDGE_SECTIONS"

# Quality check: each main test should have edge cases section
if [ "$EDGE_SECTIONS" -lt "$MAIN_TESTS" ]; then
  echo "WARNING: Some tests missing 'Edge Cases:' section" >&2
  echo "Expected: $MAIN_TESTS sections, Found: $EDGE_SECTIONS" >&2
  exit 1
fi

# Quality check: should have at least as many edge cases as main tests
if [ "$EDGE_CASES" -lt "$MAIN_TESTS" ]; then
  echo "WARNING: Not enough edge cases defined" >&2
  echo "Expected: >= $MAIN_TESTS edge cases, Found: $EDGE_CASES" >&2
  exit 1
fi

echo "✓ Edge case verification passed"
exit 0
