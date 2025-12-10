# E2E Test Specifications

**Project:** Counter Desktop App
**Date:** 2025-12-04
**Total Tests:** 6 main tests + 14 edge case variants = 20 tests
**Coverage:** 100%

---

## Testing Framework

**WebdriverIO + tauri-driver** for E2E testing of the built Tauri application.

| Component | Tool |
|-----------|------|
| Test Runner | WebdriverIO + Mocha |
| Browser Driver | Edge WebDriver (WebView2) |
| App Control | tauri-driver |
| Assertions | Chai/expect |

---

## Epic 1: Login

### E2E-001: App Window Launches with Login (US-001)

**Test:** Verify that the application window opens and displays the login screen on launch.

**WebdriverIO Test (Real Tauri App):**
1. Launch the Tauri application via tauri-driver
2. Wait for window to be displayed
3. Assert window title is "Counter App"
4. Assert login form is visible (data-testid="login-form")
5. Assert username input field is visible (data-testid="username-input")
6. Assert password input field is visible (data-testid="password-input")
7. Assert login button is visible (data-testid="login-button")

**Edge Cases:**
- E2E-001a: Window dimensions are reasonable (min 400x300) → Window should display properly without scrollbars
- E2E-001b: Username field has focus on load → First input should be auto-focused for UX

**Covers Acceptance Criteria:**
- Application window opens on launch
- Window displays "Counter App" title
- Login form is visible with username and password fields
- Login button is visible

---

### E2E-002: User Login (US-002)

**Test:** Verify that users can log in with valid credentials and see error for invalid credentials.

**WebdriverIO Test (Real Tauri App):**
1. Wait for login form to be visible (data-testid="login-form")
2. Enter "user" in username field (data-testid="username-input")
3. Enter "pass" in password field (data-testid="password-input")
4. Click login button (data-testid="login-button")
5. Wait for counter view to appear (data-testid="counter-view")
6. Assert counter display is visible (data-testid="counter-display")
7. Assert counter value shows "0"

**Edge Cases:**
- E2E-002a: Invalid credentials show error → Enter "wrong"/"wrong", click login, assert error message visible (data-testid="login-error"), assert error text contains "Invalid"
- E2E-002b: Empty username rejected → Leave username empty, enter password, click login, assert error message visible
- E2E-002c: Empty password rejected → Enter username, leave password empty, click login, assert error message visible
- E2E-002d: Error clears on typing → Enter invalid credentials, trigger error, type in username field, assert error message is hidden
- E2E-002e: Password field masks input → Enter text in password field, assert input type is "password"

**Covers Acceptance Criteria:**
- Can enter username in text field
- Can enter password in password field
- Clicking Login with valid credentials (user/pass) shows counter view
- Clicking Login with invalid credentials shows error message
- Error message disappears when user starts typing again

---

## Epic 2: Counter

### E2E-003: Counter Display (US-003)

**Test:** Verify that the counter display is visible and shows 0 initially after login.

**WebdriverIO Test (Real Tauri App):**
1. Complete login flow (enter "user"/"pass", click login)
2. Wait for counter view (data-testid="counter-view")
3. Assert counter display is visible (data-testid="counter-display")
4. Get text from counter display
5. Assert text equals "0"
6. Assert increment button visible (data-testid="increment-button")
7. Assert decrement button visible (data-testid="decrement-button")
8. Assert reset button visible (data-testid="reset-button")

**Edge Cases:**
- E2E-003a: Counter display is centered and large → Assert counter display has expected CSS styling (font-size >= 24px, text-align center)

**Covers Acceptance Criteria:**
- Counter value is visible and shows 0 initially
- Counter display is large and centered
- All control buttons are visible below the counter

---

### E2E-004: Increment Counter (US-004)

**Test:** Verify that clicking the increment button increases the counter by 1.

**WebdriverIO Test (Real Tauri App):**
1. Complete login flow
2. Wait for counter view
3. Get initial counter value (should be "0")
4. Click increment button (data-testid="increment-button")
5. Wait for counter display to update
6. Get counter value text
7. Assert value equals "1"
8. Click increment button again
9. Assert value equals "2"

**Edge Cases:**
- E2E-004a: Multiple rapid clicks → Click increment 5 times quickly, assert counter shows "5"
- E2E-004b: Increment from negative → Set counter to -5 (via 5 decrements), click increment, assert counter shows "-4"

**Covers Acceptance Criteria:**
- Plus button (+) is visible
- Clicking + increases counter by 1
- Counter display updates immediately

---

### E2E-005: Decrement Counter (US-005)

**Test:** Verify that clicking the decrement button decreases the counter by 1.

**WebdriverIO Test (Real Tauri App):**
1. Complete login flow
2. Wait for counter view
3. Get initial counter value (should be "0")
4. Click decrement button (data-testid="decrement-button")
5. Wait for counter display to update
6. Get counter value text
7. Assert value equals "-1"
8. Click decrement button again
9. Assert value equals "-2"

**Edge Cases:**
- E2E-005a: Counter can go negative from zero → Start at 0, click decrement, assert counter shows "-1"
- E2E-005b: Multiple rapid decrements → Click decrement 5 times quickly, assert counter shows "-5"

**Covers Acceptance Criteria:**
- Minus button (-) is visible
- Clicking - decreases counter by 1
- Counter can go negative

---

### E2E-006: Reset Counter (US-006)

**Test:** Verify that clicking the reset button sets the counter to 0.

**WebdriverIO Test (Real Tauri App):**
1. Complete login flow
2. Wait for counter view
3. Click increment 5 times (counter at 5)
4. Assert counter shows "5"
5. Click reset button (data-testid="reset-button")
6. Wait for counter display to update
7. Assert counter value equals "0"

**Edge Cases:**
- E2E-006a: Reset from negative → Click decrement 3 times (counter at -3), click reset, assert counter shows "0"
- E2E-006b: Reset when already zero → With counter at 0, click reset, assert counter still shows "0" (no error)

**Covers Acceptance Criteria:**
- Reset button is visible
- Clicking Reset sets counter to 0
- Works regardless of current counter value

---

## Test Independence Matrix

### Epic 1: Login
- **Test file:** `tests/e2e/epic1-login.spec.ts`
- **Prerequisites:** None (app launch is the starting point)
- **Test fixtures needed:** None
- **Can run alone:** ✅ Yes

### Epic 2: Counter
- **Test file:** `tests/e2e/epic2-counter.spec.ts`
- **Prerequisites:** Login required (Epic 1)
- **Test fixtures needed:** `beforeEach` performs login with valid credentials ("user"/"pass")
- **Can run alone:** ✅ Yes (with beforeEach login fixture)

**Fixture for Epic 2:**
```typescript
// tests/e2e/epic2-counter.spec.ts
beforeEach(async () => {
  // Login fixture - ensures counter view is accessible
  await $('[data-testid="username-input"]').setValue('user');
  await $('[data-testid="password-input"]').setValue('pass');
  await $('[data-testid="login-button"]').click();
  await $('[data-testid="counter-view"]').waitForDisplayed();
});
```

---

## Data-TestID Reference

| Element | data-testid |
|---------|-------------|
| Login form container | login-form |
| Username input | username-input |
| Password input | password-input |
| Login button | login-button |
| Login error message | login-error |
| Counter view container | counter-view |
| Counter display | counter-display |
| Increment button | increment-button |
| Decrement button | decrement-button |
| Reset button | reset-button |

---

## Coverage Matrix

| User Story | E2E Tests | Criteria Covered |
|------------|-----------|------------------|
| US-001 | E2E-001, E2E-001a, E2E-001b | 4/4 |
| US-002 | E2E-002, E2E-002a, E2E-002b, E2E-002c, E2E-002d, E2E-002e | 5/5 |
| US-003 | E2E-003, E2E-003a | 3/3 |
| US-004 | E2E-004, E2E-004a, E2E-004b | 3/3 |
| US-005 | E2E-005, E2E-005a, E2E-005b | 3/3 |
| US-006 | E2E-006, E2E-006a, E2E-006b | 3/3 |

**Total Coverage:** 21/21 acceptance criteria (100%)

---

## Test File Structure

```
tests/
└── e2e/
    ├── epic1-login.spec.ts      # E2E-001, E2E-002 + edge cases
    └── epic2-counter.spec.ts    # E2E-003, E2E-004, E2E-005, E2E-006 + edge cases
```

---

## Test Execution Order

Tests should be runnable in any order. Each epic's test file is self-contained:

1. **Epic 1 tests** - Test login functionality directly
2. **Epic 2 tests** - Use `beforeEach` login fixture, then test counter

**No cross-file dependencies.** Each test file can run independently via:
```bash
npx wdio run wdio.conf.ts --spec tests/e2e/epic1-login.spec.ts
npx wdio run wdio.conf.ts --spec tests/e2e/epic2-counter.spec.ts
```
