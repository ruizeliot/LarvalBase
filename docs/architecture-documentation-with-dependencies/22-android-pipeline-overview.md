# Android Pipeline Overview

**Created:** 2026-01-12
**Status:** Design Draft
**Stack:** Tauri 2.0 (Mobile)

---

## Overview

The Android pipeline extends the desktop (Tauri) pipeline to target Android devices. Rather than introducing a new framework, we leverage **Tauri 2.0's mobile support** to build Android apps from the same codebase as desktop apps.

### Why Tauri 2.0 for Mobile?

| Factor | Tauri 2.0 | Flutter | React Native |
|--------|-----------|---------|--------------|
| **Code reuse** | 100% (same codebase as desktop) | 0% (new Dart codebase) | ~50% (React knowledge transfers) |
| **Backend language** | Rust | Dart | JavaScript/Native |
| **Performance** | ~95% native | ~97% native | ~85-90% native |
| **Learning curve** | None (if you know Tauri desktop) | High (Dart + Flutter widgets) | Medium |
| **Existing tests** | Reusable | Need rewrite | Need adaptation |

**Key advantage:** Build desktop AND mobile from a single codebase, reusing all React components, Rust backend, and test infrastructure.

---

## Architecture

### Single Codebase, Multiple Targets

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Tauri 2.0 Project                              │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │   src/ (React)  │  │  src-tauri/     │  │  Tests              │ │
│  │   Components    │  │  (Rust Backend) │  │  Jest + WebdriverIO │ │
│  │   Shared 100%   │  │  Shared 95%     │  │  + Appium (mobile)  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘ │
│           │                    │                      │            │
└───────────┼────────────────────┼──────────────────────┼────────────┘
            │                    │                      │
            ▼                    ▼                      ▼
     ┌──────────────────────────────────────────────────────────┐
     │                    Build Targets                          │
     ├──────────────┬──────────────┬──────────────┬─────────────┤
     │   Windows    │    macOS     │    Linux     │   Android   │
     │   .exe       │    .app      │  .AppImage   │    .apk     │
     └──────────────┴──────────────┴──────────────┴─────────────┘
```

### Mobile-Specific Components

```
src-tauri/
├── src/
│   ├── lib.rs           # Shared Tauri commands
│   ├── mobile.rs        # Mobile-specific code (optional)
│   └── desktop.rs       # Desktop-specific code (optional)
├── gen/
│   └── android/         # Generated Android Studio project
│       ├── app/
│       │   └── src/main/
│       │       ├── kotlin/        # Kotlin plugins (optional)
│       │       └── AndroidManifest.xml
│       ├── build.gradle.kts
│       └── settings.gradle.kts
├── Cargo.toml
└── tauri.conf.json      # Includes mobile configuration
```

---

## Phase Structure

The Android pipeline uses the **same 5-phase structure** as desktop, with mobile-specific adaptations.

### Phase 1: Brainstorm & User Stories (Interactive)

**Same as desktop**, with mobile-specific considerations:

| Aspect | Desktop | Mobile (Android) |
|--------|---------|------------------|
| **Input methods** | Mouse, keyboard | Touch, gestures, back button |
| **Screen sizes** | Fixed window, resizable | Various phone/tablet sizes |
| **Navigation** | Sidebars, menus | Bottom nav, drawer, back stack |
| **Offline support** | Optional | Often expected |
| **Permissions** | Tauri capabilities | Android runtime permissions |

**Additional questions to ask:**
- Target screen sizes (phone only? tablet?)
- Offline requirements
- Android permissions needed (camera, storage, location?)
- Minimum Android version (default: Android 7.0 / SDK 24)

**Output:** `docs/user-stories.md`, `docs/brainstorm-notes.md`

### Phase 2: Technical Specifications (Autonomous)

**Key additions for mobile:**

```markdown
## Mobile Configuration

### Target Devices
- Minimum SDK: 24 (Android 7.0)
- Target SDK: 34 (Android 14)
- Supported ABIs: arm64-v8a, armeabi-v7a, x86_64

### Required Permissions
- `android.permission.INTERNET` - Network access
- `android.permission.CAMERA` - (if camera needed)
- `android.permission.READ_EXTERNAL_STORAGE` - (if file access needed)

### Mobile-Specific Tests
- Touch gesture tests (swipe, pinch, long press)
- Back button navigation
- Screen rotation handling
- Permission request flows
```

**Output:** `docs/test-specs.md` (includes mobile test specs)

### Phase 3: Bootstrap/Skeleton (Autonomous)

**Mobile-specific setup:**

1. **Initialize Android target**
   ```bash
   pnpm tauri android init
   ```

2. **Configure mobile permissions** in `gen/android/app/src/main/AndroidManifest.xml`

3. **Set up Appium** for mobile E2E tests

4. **Create mobile-specific tests** (touch, gestures, back button)

**Output:** Tauri project with Android support and failing tests

### Phase 4: Implementation (Autonomous - Free Zone)

**Same structure** (Fixed Start → Free Zone → Fixed End), with:

- Use `tauri android dev` instead of `tauri dev`
- Test on emulator or connected device
- Handle mobile-specific APIs (haptic feedback, sensors, etc.)

**Mobile testing commands:**
```bash
# Run on emulator
pnpm tauri android dev --emulator

# Run on connected device
pnpm tauri android dev

# Run E2E tests with Appium
pnpm test:mobile
```

### Phase 5: Quality & Build (Autonomous)

**Android-specific tasks:**

1. **Build release APK/AAB**
   ```bash
   pnpm tauri android build --apk    # APK for direct install
   pnpm tauri android build --aab    # AAB for Google Play
   ```

2. **App signing** (required for distribution)

3. **Quality checks**
   - APK size check
   - Minimum SDK compatibility
   - Permission audit

4. **Distribution**
   - Direct APK install
   - Google Play Store submission

---

## Configuration

### tauri.conf.json Mobile Section

```json
{
  "productName": "My App",
  "identifier": "com.example.myapp",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true
  },
  "bundle": {
    "android": {
      "minSdkVersion": 24
    }
  }
}
```

### Capabilities (Mobile Permissions)

Tauri capabilities map to Android permissions:

| Tauri Capability | Android Permission |
|------------------|-------------------|
| `fs:read` | `READ_EXTERNAL_STORAGE` |
| `fs:write` | `WRITE_EXTERNAL_STORAGE` |
| `http:request` | `INTERNET` |
| `geolocation` | `ACCESS_FINE_LOCATION` |

---

## Testing Strategy

### Test Layers

| Layer | Desktop | Mobile |
|-------|---------|--------|
| **Unit** | Jest | Jest (same) |
| **Integration** | Jest + MSW | Jest + MSW (same) |
| **E2E** | WebdriverIO + tauri-driver | WebdriverIO + Appium |

### Mobile-Specific Tests

```typescript
// Touch gesture test example
describe('Touch Interactions', () => {
  it('should handle swipe to delete', async () => {
    const item = await $('~list-item-1');
    await item.touchAction([
      { action: 'press', x: 200, y: 0 },
      { action: 'moveTo', x: 0, y: 0 },
      { action: 'release' }
    ]);
    await expect(item).not.toBeDisplayed();
  });

  it('should handle back button', async () => {
    await $('~detail-screen').waitForDisplayed();
    await driver.back();
    await expect($('~list-screen')).toBeDisplayed();
  });
});
```

---

## Differences from Desktop Pipeline

### What Changes

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| **Dev command** | `tauri dev` | `tauri android dev` |
| **Build command** | `tauri build` | `tauri android build` |
| **E2E driver** | tauri-driver | Appium |
| **Test device** | Local window | Emulator or physical device |
| **Input events** | Mouse/keyboard | Touch gestures |
| **Navigation** | Window management | Back stack |

### What Stays the Same

- Phase structure (1-5)
- React frontend code
- Most Rust backend code
- Unit and integration tests
- User story format
- Review loops with Haiku
- Progress tracking via manifest
- Todo-based orchestration

---

## Implementation Status

| Component | Status |
|-----------|--------|
| Tauri 2.0 mobile support | ✅ Stable (Oct 2024) |
| Android environment setup | ❌ Needs documentation |
| Appium test setup | ❌ Needs documentation |
| Phase commands (1-5) | ❌ Not created |
| Mobile worker base rules | ❌ Not created |

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Android Studio | Latest | SDK Manager, emulators |
| Android SDK | API 24+ | Build target |
| Android NDK | 25.x | Rust compilation |
| Java JDK | 17+ | Android toolchain |
| Rust | 1.70+ | Tauri backend |
| Node.js | 18+ | Frontend build |
| Appium | 2.x | Mobile E2E testing |

### Environment Variables (Windows)

```powershell
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
ANDROID_HOME = %LOCALAPPDATA%\Android\Sdk
NDK_HOME = %ANDROID_HOME%\ndk\<version>
PATH += %ANDROID_HOME%\cmdline-tools\latest\bin
PATH += %ANDROID_HOME%\platform-tools
```

---

## Resources

- [Tauri 2.0 Prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri Android Development](https://deepwiki.com/tauri-apps/tauri/7.3-android-development-and-build)
- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/)
- [Google Play Distribution](https://v2.tauri.app/distribute/google-play/)
- [WebdriverIO Appium Setup](https://webdriver.io/docs/appium/)

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Initial design draft |
