# Android Testing Setup Guide

**Created:** 2026-01-12
**Status:** Ready for Implementation
**Stack:** WebdriverIO + Appium 2

---

## Overview

This guide covers setting up E2E testing for Tauri Android apps using WebdriverIO and Appium 2. The setup enables the same test framework used for desktop (WebdriverIO) to work with mobile apps.

### Test Stack Comparison

| Layer | Desktop | Mobile (Android) |
|-------|---------|------------------|
| Unit | Jest | Jest (same) |
| Integration | Jest + MSW | Jest + MSW (same) |
| E2E | WebdriverIO + tauri-driver | WebdriverIO + Appium |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Test Script   │────▶│   WebdriverIO    │────▶│    Appium 2     │
│   (*.spec.ts)   │     │   (wdio.conf.ts) │     │    Server       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ Android Device  │
                                                 │ or Emulator     │
                                                 │ (via ADB)       │
                                                 └─────────────────┘
```

---

## Prerequisites

- Android environment set up (see [23-android-environment-setup.md](./23-android-environment-setup.md))
- Emulator running or device connected
- Built APK available

---

## Step 1: Install Appium 2

### Install as Project Dependency (Recommended)

```bash
# Install Appium and drivers as dev dependencies
pnpm add -D appium @appium/uiautomator2-driver
```

### Install Globally (Alternative)

```bash
npm install -g appium
appium driver install uiautomator2
```

### Verify Installation

```bash
# Check Appium version (should be 2.x)
pnpm exec appium --version

# Check installed drivers
pnpm exec appium driver list --installed
```

---

## Step 2: Install WebdriverIO

```bash
# Install WebdriverIO with Appium service
pnpm add -D @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter
pnpm add -D @wdio/appium-service webdriverio
```

---

## Step 3: Configure WebdriverIO for Android

Create `wdio.android.conf.ts`:

```typescript
import type { Options } from '@wdio/types';
import path from 'path';

export const config: Options.Testrunner = {
  runner: 'local',

  specs: ['./test/specs/**/*.spec.ts'],

  maxInstances: 1,

  capabilities: [{
    platformName: 'Android',
    'appium:deviceName': 'Android Emulator',  // or specific device name
    'appium:platformVersion': '14.0',          // your emulator/device version
    'appium:automationName': 'UiAutomator2',
    'appium:app': path.resolve('./src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk'),
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 240,
  }],

  services: [
    ['appium', {
      args: {
        relaxedSecurity: true,
        log: './appium.log',
      },
    }],
  ],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,  // 2 minutes for mobile tests
  },

  // Auto-start Appium
  onPrepare: function () {
    console.log('Starting Appium server...');
  },
};
```

---

## Step 4: Add Accessibility IDs

For cross-platform testing, use accessibility IDs (testID in React):

### In React Components

```tsx
// Add testID prop for testing
<button
  testID="submit-button"
  onClick={handleSubmit}
>
  Submit
</button>

<input
  testID="email-input"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

<div testID="user-list">
  {users.map(user => (
    <div key={user.id} testID={`user-item-${user.id}`}>
      {user.name}
    </div>
  ))}
</div>
```

### Custom Hook for Platform-Specific Props

```tsx
// hooks/useTestId.ts
export function useTestId(id: string) {
  // React Native / Tauri mobile use testID
  // Web uses data-testid
  return {
    testID: id,
    'data-testid': id,
    accessibilityLabel: id,  // For Appium
  };
}

// Usage
<button {...useTestId('submit-button')}>Submit</button>
```

---

## Step 5: Write Mobile Tests

### Basic Test Example

```typescript
// test/specs/login.spec.ts
describe('Login Flow', () => {
  it('should login with valid credentials', async () => {
    // Find elements by accessibility ID
    const emailInput = await $('~email-input');
    const passwordInput = await $('~password-input');
    const submitButton = await $('~submit-button');

    // Interact with elements
    await emailInput.setValue('user@example.com');
    await passwordInput.setValue('password123');
    await submitButton.click();

    // Assert result
    const welcomeText = await $('~welcome-message');
    await expect(welcomeText).toBeDisplayed();
    await expect(welcomeText).toHaveText('Welcome, User!');
  });
});
```

### Touch Gesture Tests

```typescript
// test/specs/gestures.spec.ts
describe('Touch Gestures', () => {
  it('should swipe to delete item', async () => {
    const listItem = await $('~list-item-1');

    // Swipe left to reveal delete
    await listItem.touchAction([
      { action: 'press', x: 300, y: 0 },
      { action: 'wait', ms: 100 },
      { action: 'moveTo', x: 0, y: 0 },
      { action: 'release' }
    ]);

    // Tap delete button
    const deleteButton = await $('~delete-button');
    await deleteButton.click();

    // Verify item removed
    await expect(listItem).not.toBeDisplayed();
  });

  it('should handle pinch to zoom', async () => {
    const canvas = await $('~zoomable-canvas');

    // Pinch out (zoom in)
    await driver.execute('mobile: pinchOpen', {
      elementId: canvas.elementId,
      percent: 0.5,
    });

    // Verify zoom level changed
    const zoomIndicator = await $('~zoom-level');
    await expect(zoomIndicator).toHaveText('150%');
  });

  it('should handle long press', async () => {
    const item = await $('~context-menu-item');

    await item.touchAction([
      { action: 'press' },
      { action: 'wait', ms: 1000 },
      { action: 'release' }
    ]);

    // Context menu should appear
    const contextMenu = await $('~context-menu');
    await expect(contextMenu).toBeDisplayed();
  });
});
```

### Back Button Navigation

```typescript
// test/specs/navigation.spec.ts
describe('Navigation', () => {
  it('should navigate back with Android back button', async () => {
    // Navigate to detail screen
    const item = await $('~list-item-1');
    await item.click();

    // Verify on detail screen
    const detailScreen = await $('~detail-screen');
    await expect(detailScreen).toBeDisplayed();

    // Press Android back button
    await driver.back();

    // Verify back on list screen
    const listScreen = await $('~list-screen');
    await expect(listScreen).toBeDisplayed();
  });

  it('should handle deep navigation stack', async () => {
    // Navigate: Home -> Category -> Item -> Edit
    await $('~category-link').click();
    await $('~item-link').click();
    await $('~edit-button').click();

    // Go back through stack
    await driver.back();  // Edit -> Item
    await expect($('~item-screen')).toBeDisplayed();

    await driver.back();  // Item -> Category
    await expect($('~category-screen')).toBeDisplayed();

    await driver.back();  // Category -> Home
    await expect($('~home-screen')).toBeDisplayed();
  });
});
```

### Screen Rotation

```typescript
// test/specs/rotation.spec.ts
describe('Screen Rotation', () => {
  afterEach(async () => {
    // Reset to portrait after each test
    await driver.setOrientation('PORTRAIT');
  });

  it('should maintain state after rotation', async () => {
    // Enter some data
    const input = await $('~data-input');
    await input.setValue('Important data');

    // Rotate to landscape
    await driver.setOrientation('LANDSCAPE');

    // Data should persist
    await expect(input).toHaveValue('Important data');
  });

  it('should adapt layout to landscape', async () => {
    await driver.setOrientation('LANDSCAPE');

    // Sidebar should be visible in landscape
    const sidebar = await $('~sidebar');
    await expect(sidebar).toBeDisplayed();

    await driver.setOrientation('PORTRAIT');

    // Sidebar should be hidden in portrait
    await expect(sidebar).not.toBeDisplayed();
  });
});
```

---

## Step 6: Add npm Scripts

Update `package.json`:

```json
{
  "scripts": {
    "test:unit": "jest",
    "test:e2e": "wdio run wdio.conf.ts",
    "test:e2e:desktop": "wdio run wdio.conf.ts",
    "test:e2e:android": "wdio run wdio.android.conf.ts",
    "test:mobile": "pnpm test:e2e:android",
    "test": "pnpm test:unit && pnpm test:e2e",
    "test:all": "pnpm test:unit && pnpm test:e2e:desktop && pnpm test:e2e:android"
  }
}
```

---

## Step 7: Run Tests

### Prerequisites Before Running

1. **Build the APK:**
   ```bash
   pnpm tauri android build
   ```

2. **Start emulator or connect device:**
   ```bash
   # Check device is connected
   adb devices
   ```

### Run Mobile E2E Tests

```bash
# Run all Android E2E tests
pnpm test:e2e:android

# Run specific test file
pnpm exec wdio run wdio.android.conf.ts --spec test/specs/login.spec.ts
```

---

## Cross-Platform Test Organization

### Directory Structure

```
test/
├── specs/
│   ├── shared/           # Tests that work on both platforms
│   │   ├── login.spec.ts
│   │   └── crud.spec.ts
│   ├── desktop/          # Desktop-only tests
│   │   ├── keyboard.spec.ts
│   │   └── window.spec.ts
│   └── mobile/           # Mobile-only tests
│       ├── gestures.spec.ts
│       ├── backButton.spec.ts
│       └── rotation.spec.ts
├── wdio.conf.ts          # Desktop config
└── wdio.android.conf.ts  # Android config
```

### Shared Tests Configuration

```typescript
// wdio.android.conf.ts
export const config: Options.Testrunner = {
  // ... other config

  specs: [
    './test/specs/shared/**/*.spec.ts',   // Run shared tests
    './test/specs/mobile/**/*.spec.ts',   // Run mobile-specific tests
  ],

  exclude: [
    './test/specs/desktop/**/*.spec.ts',  // Exclude desktop-only tests
  ],
};
```

---

## Troubleshooting

### "Appium not found"

```bash
# Install Appium
pnpm add -D appium

# Or install globally
npm install -g appium
```

### "UiAutomator2 driver not installed"

```bash
# Install driver
pnpm exec appium driver install uiautomator2
```

### "No device found"

```bash
# Check ADB
adb devices

# If empty:
# 1. Start emulator: emulator -avd <name>
# 2. Or connect device and enable USB debugging
```

### "App not found"

Ensure APK path is correct in `wdio.android.conf.ts`:
```typescript
'appium:app': path.resolve('./src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk'),
```

Build APK first if missing:
```bash
pnpm tauri android build
```

### "Element not found"

1. Verify accessibility ID is set:
   ```tsx
   <button testID="my-button">Click</button>
   ```

2. Use Appium Inspector to find elements:
   ```bash
   # Install Appium Inspector
   # https://github.com/appium/appium-inspector/releases
   ```

3. Wait for element:
   ```typescript
   const btn = await $('~my-button');
   await btn.waitForDisplayed({ timeout: 5000 });
   ```

### Tests Timeout

Increase timeout in config:
```typescript
mochaOpts: {
  timeout: 180000,  // 3 minutes
},
```

Or per-test:
```typescript
it('slow test', async function () {
  this.timeout(300000);  // 5 minutes
  // ...
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/android-test.yml
name: Android E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install dependencies
        run: pnpm install

      - name: Build APK
        run: pnpm tauri android build

      - name: Start emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          script: pnpm test:e2e:android
```

---

## Quick Reference

### Selectors

| Strategy | Syntax | Example |
|----------|--------|---------|
| Accessibility ID | `~id` | `$('~submit-button')` |
| Android UIAutomator | `android=` | `$('android=new UiSelector().text("Submit")')` |
| XPath | `//*` | `$('//*[@content-desc="submit"]')` |
| Class name | `.class` | `$('android.widget.Button')` |

### Common Actions

| Action | Code |
|--------|------|
| Tap | `element.click()` |
| Type | `element.setValue('text')` |
| Clear | `element.clearValue()` |
| Back button | `driver.back()` |
| Swipe | `element.touchAction([...])` |
| Rotate | `driver.setOrientation('LANDSCAPE')` |
| Screenshot | `driver.saveScreenshot('path.png')` |

### Wait Commands

| Wait | Code |
|------|------|
| Displayed | `element.waitForDisplayed()` |
| Clickable | `element.waitForClickable()` |
| Exist | `element.waitForExist()` |
| Custom | `browser.waitUntil(async () => ...)` |

---

## Resources

- [WebdriverIO Appium Docs](https://webdriver.io/docs/appium/)
- [WebdriverIO Appium Boilerplate](https://github.com/webdriverio/appium-boilerplate)
- [Tauri WebDriver Example](https://github.com/tauri-apps/webdriver-example)
- [Appium UiAutomator2 Driver](https://github.com/appium/appium-uiautomator2-driver)
- [Mobile Testing with Appium 2 & WebdriverIO](https://medium.com/@babiyno/building-a-test-automation-framework-for-native-mobile-applications-with-webdriverio-v9-and-appium-f5cc8f001057)

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Initial testing guide |
