# Worker Base Rules: Android (Tauri Mobile)

**Stack:** Android
**Framework:** Tauri v2 Mobile
**Frontend:** React + TypeScript
**Backend:** Rust
**Test Framework:** Jest/Vitest + Appium

---

## Package Management

### Frontend (npm)
```bash
npm install [package]
```

### Backend (cargo)
```bash
cd src-tauri
cargo add [package]
```

### Packages (Same as Desktop)

Tauri Mobile uses the same packages as Desktop Tauri:

| Feature | npm Package | cargo Package |
|---------|-------------|---------------|
| File Dialog | @tauri-apps/plugin-dialog | tauri-plugin-dialog |
| File System | @tauri-apps/plugin-fs | tauri-plugin-fs |
| Notifications | @tauri-apps/plugin-notification | tauri-plugin-notification |
| Shell/URLs | @tauri-apps/plugin-shell | tauri-plugin-shell |
| Store/Prefs | @tauri-apps/plugin-store | tauri-plugin-store |

### Android-Specific Packages

| Feature | Package |
|---------|---------|
| Biometrics | @tauri-apps/plugin-biometric |
| Barcode Scanner | @tauri-apps/plugin-barcode-scanner |
| Haptics | @tauri-apps/plugin-haptics |

---

## Capabilities (Permissions)

**Location:** `src-tauri/gen/android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
```

**Tauri Capabilities (same as desktop):**
```json
{
  "permissions": [
    "dialog:allow-open",
    "fs:allow-read",
    "notification:allow-notify"
  ]
}
```

---

## Test Framework

### Unit Tests (Jest/Vitest) - Same as Desktop

**Location:** `src/__tests__/*.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../utils';

describe('myFunction', () => {
  it('calculates correctly', () => {
    expect(myFunction(2, 3)).toBe(5);
  });
});
```

### E2E Tests (Appium)

**Location:** `tests/e2e/*.spec.ts`

```typescript
import { remote } from 'webdriverio';

describe('Mobile App', () => {
  let driver;

  before(async () => {
    driver = await remote({
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:app': './src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk'
      }
    });
  });

  it('should tap button and see result', async () => {
    // Real touch interactions
    const button = await driver.$('~add-button');
    await button.click();

    // Swipe gesture
    await driver.touchAction([
      { action: 'press', x: 200, y: 500 },
      { action: 'moveTo', x: 200, y: 100 },
      { action: 'release' }
    ]);

    // Assert
    const result = await driver.$('~result-text');
    expect(await result.getText()).toBe('Added');
  });

  after(async () => {
    await driver.deleteSession();
  });
});
```

### Mobile-Specific Test Patterns

```typescript
// Tap
await driver.$('~button').click();

// Long press
await driver.$('~item').touchAction('longPress');

// Swipe
await driver.touchAction([
  { action: 'press', x: startX, y: startY },
  { action: 'wait', ms: 100 },
  { action: 'moveTo', x: endX, y: endY },
  { action: 'release' }
]);

// Pinch zoom
// Use multi-touch actions

// Scroll
await driver.execute('mobile: scroll', { direction: 'down' });
```

---

## Forbidden Patterns

### NO Mocking (Same as Desktop)

```typescript
// ❌ FORBIDDEN
jest.mock('@tauri-apps/plugin-dialog');

// ✅ REQUIRED - Real API calls
import { open } from '@tauri-apps/plugin-dialog';
```

### NO Synthetic Touch Events

```typescript
// ❌ FORBIDDEN
driver.execute(() => {
  element.dispatchEvent(new TouchEvent('touchstart'));
});

// ✅ REQUIRED - Real Appium actions
await driver.$('~button').click();
await driver.touchAction('longPress');
```

---

## Integration Extraction Table

| Story Contains | Implies Integration |
|----------------|---------------------|
| "opens file", "browse" | @tauri-apps/plugin-dialog |
| "saves file" | @tauri-apps/plugin-fs |
| "notification" | @tauri-apps/plugin-notification |
| "scan barcode", "QR" | @tauri-apps/plugin-barcode-scanner |
| "fingerprint", "face ID" | @tauri-apps/plugin-biometric |
| "vibrate", "haptic" | @tauri-apps/plugin-haptics |
| "swipe", "gesture" | Touch gesture handling |
| "pull to refresh" | Gesture + state management |

---

## Build Commands

```bash
# Development (requires connected device or emulator)
npm run tauri android dev

# Build APK
npm run tauri android build

# Build AAB (for Play Store)
npm run tauri android build --aab

# Run tests
npm test                    # Unit tests
npm run test:e2e:android   # Appium E2E tests
```

---

## File Structure

```
project/
├── src/                    # React frontend (same as desktop)
│   ├── components/
│   ├── hooks/
│   └── __tests__/
├── src-tauri/
│   ├── src/
│   ├── capabilities/
│   ├── gen/
│   │   └── android/       # Generated Android project
│   └── Cargo.toml
├── tests/
│   └── e2e/
│       ├── desktop/       # WebdriverIO tests
│       └── android/       # Appium tests
├── docs/
│   ├── brainstorm-notes.md
│   ├── user-stories.md
│   └── functionality-specs.md
└── .pipeline/
    └── manifest.json
```

---

## Mobile-Specific Considerations

### Touch Gestures to Document

| Gesture | Use Case |
|---------|----------|
| Tap | Button clicks, selection |
| Long press | Context menus, selection mode |
| Swipe | Navigation, dismiss, lists |
| Pinch | Zoom in/out |
| Double tap | Zoom, quick actions |
| Drag | Reordering, moving items |

### Responsive Design

- Test on multiple screen sizes
- Handle orientation changes
- Consider keyboard visibility
- Safe area insets

### Offline Support

- Cache critical data
- Queue actions when offline
- Sync when connection restored

---

## Differences from Desktop

| Aspect | Desktop | Android |
|--------|---------|---------|
| E2E Framework | WebdriverIO | Appium |
| Selectors | `$('[data-testid="x"]')` | `$('~x')` (accessibility ID) |
| Gestures | Mouse/keyboard | Touch |
| Build | `npm run tauri build` | `npm run tauri android build` |
| Debug | Browser DevTools | Android Studio / ADB |
