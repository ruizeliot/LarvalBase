# Step 0b: Edge Case Verification

## Purpose

Ensure E2E test specs include edge cases for comprehensive test coverage.

## Verification Command

After writing `docs/e2e-test-specs.md`, run:

```bash
./lib/verify-edge-cases.sh docs/e2e-test-specs.md
```

## Expected Output

```
Main tests: 12
Edge case variants: 24
Edge case sections: 12
✓ Edge case verification passed
```

## Quality Criteria

1. **Edge Cases Section:** Every main test must have `**Edge Cases:**` section
2. **Edge Case Variants:** At least one edge case per main test (E2E-001a, E2E-001b, etc.)
3. **Pattern:** Edge cases use format `E2E-NNNa`, `E2E-NNNb` where NNN matches main test number

## Example Format

```markdown
### E2E-001: User Registration (US-001)

**Test:** User can create new account

**Steps:**
1. Navigate to /register
2. Fill in email, password
3. Click "Create Account"
4. Verify redirect to /dashboard

**Edge Cases:**
- E2E-001a: Invalid email format → Error message displayed
- E2E-001b: Password too short → Error message displayed
- E2E-001c: Email already exists → Error message displayed

**Covers Acceptance Criteria:**
- Users can register with valid email/password
- System validates email format
- System enforces password requirements
```

## Integration with Analysis

The verification script is called during pipeline analysis to extract the `edge_case_count` metric:

```json
{
  "edge_case_count": {
    "type": "int",
    "measure": "script:lib/verify-edge-cases.sh | grep 'Edge case variants:' | awk '{print $4}'",
    "target": ">=test_count",
    "weight": 0.05
  }
}
```

## Troubleshooting

**Verification fails:**
- Check that edge cases use correct format: `E2E-NNNa` (not `E2E-NNN-a` or `edge-case-a`)
- Ensure `**Edge Cases:**` section exists for every test
- Edge cases should be in bullet point lists under the section

**No edge cases extracted:**
- Pattern must be: `- E2E-001a: Description → Result`
- Must be under `**Edge Cases:**` header
