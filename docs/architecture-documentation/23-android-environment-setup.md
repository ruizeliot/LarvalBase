# Android Environment Setup Guide

**Created:** 2026-01-12
**Status:** Ready for Implementation
**Platform:** Windows 10/11

---

## Overview

This guide covers setting up the development environment for building Tauri 2.0 Android apps on Windows. After completing this setup, you'll be able to run `tauri android dev` and `tauri android build`.

---

## Prerequisites Check

Before starting, verify these are installed:

| Software | Check Command | Required |
|----------|---------------|----------|
| Node.js 18+ | `node --version` | ✅ |
| pnpm/npm/yarn | `pnpm --version` | ✅ |
| Rust 1.70+ | `rustc --version` | ✅ |
| Tauri CLI | `pnpm tauri --version` | ✅ |

If Tauri CLI isn't installed:
```bash
pnpm add -D @tauri-apps/cli
```

---

## Step 1: Install Android Studio

### Download and Install

1. Download [Android Studio](https://developer.android.com/studio) (latest stable)
2. Run installer, accept defaults
3. Launch Android Studio and complete initial setup

### Install SDK Components

1. Open Android Studio
2. Go to **Tools > SDK Manager** (or **File > Settings > Languages & Frameworks > Android SDK**)
3. **SDK Platforms** tab:
   - Check **Android 14.0 (API 34)** or latest
   - Check **Android 7.0 (API 24)** (minimum for Tauri)
4. **SDK Tools** tab:
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Command-line Tools (latest)
   - ✅ Android SDK Platform-Tools
   - ✅ **NDK (Side by side)** - CRITICAL
5. Click **Apply** and wait for downloads

### Verify Installation

Default SDK location: `%LOCALAPPDATA%\Android\Sdk`

Check these directories exist:
```
%LOCALAPPDATA%\Android\Sdk\
├── build-tools\
├── cmdline-tools\latest\
├── emulator\
├── ndk\<version>\        ← Important!
├── platform-tools\
└── platforms\
```

---

## Step 2: Set Environment Variables

### Using PowerShell (Run as Administrator)

```powershell
# Set JAVA_HOME (points to Android Studio's bundled JDK)
[System.Environment]::SetEnvironmentVariable(
    "JAVA_HOME",
    "C:\Program Files\Android\Android Studio\jbr",
    "User"
)

# Set ANDROID_HOME
[System.Environment]::SetEnvironmentVariable(
    "ANDROID_HOME",
    "$env:LOCALAPPDATA\Android\Sdk",
    "User"
)

# Set NDK_HOME (replace <version> with actual version, e.g., 25.2.9519653)
$NDK_VERSION = Get-ChildItem -Name "$env:LOCALAPPDATA\Android\Sdk\ndk" | Select-Object -Last 1
[System.Environment]::SetEnvironmentVariable(
    "NDK_HOME",
    "$env:LOCALAPPDATA\Android\Sdk\ndk\$NDK_VERSION",
    "User"
)

# Add to PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$additions = @(
    "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin",
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools"
)
foreach ($path in $additions) {
    if ($currentPath -notlike "*$path*") {
        $currentPath = "$currentPath;$path"
    }
}
[System.Environment]::SetEnvironmentVariable("Path", $currentPath, "User")
```

### CRITICAL: Reboot Windows

Environment variables won't be available until you **restart Windows** (or at minimum, log out and back in).

### Verify Environment Variables

After reboot, open new PowerShell window:

```powershell
# Check variables
echo $env:JAVA_HOME       # Should show Android Studio\jbr path
echo $env:ANDROID_HOME    # Should show %LOCALAPPDATA%\Android\Sdk
echo $env:NDK_HOME        # Should show ndk\<version> path

# Check PATH additions
where.exe adb             # Should find adb.exe
where.exe sdkmanager      # Should find sdkmanager.bat
```

---

## Step 3: Add Rust Android Targets

Open terminal and run:

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

### Verify Rust Targets

```bash
rustup target list --installed | grep android
```

Expected output:
```
aarch64-linux-android
armv7-linux-androideabi
i686-linux-android
x86_64-linux-android
```

---

## Step 4: Set Up Android Emulator

### Create Virtual Device (AVD)

1. Open Android Studio
2. Go to **Tools > Device Manager**
3. Click **Create Device**
4. Select device (e.g., **Pixel 7**)
5. Select system image:
   - **x86_64** (faster on Intel/AMD)
   - API 34 or your target API
6. Click **Finish**

### Start Emulator

```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_7_API_34

# Or start from Device Manager in Android Studio
```

### Verify ADB Connection

```bash
# With emulator running or device connected
adb devices

# Expected output:
# List of devices attached
# emulator-5554    device
```

---

## Step 5: Initialize Tauri Android Project

### For New Projects

```bash
# Create new Tauri project with mobile support
pnpm create tauri-app --template react-ts

cd my-app

# Initialize Android
pnpm tauri android init
```

### For Existing Desktop Projects

```bash
cd existing-tauri-project

# Initialize Android (creates gen/android/ directory)
pnpm tauri android init
```

### Project Structure After Init

```
my-app/
├── src/                    # React frontend (shared)
├── src-tauri/
│   ├── src/               # Rust backend (shared)
│   ├── gen/
│   │   └── android/       # Generated Android project
│   │       ├── app/
│   │       │   └── src/main/
│   │       │       ├── kotlin/
│   │       │       └── AndroidManifest.xml
│   │       ├── build.gradle.kts
│   │       └── settings.gradle.kts
│   └── tauri.conf.json
└── package.json
```

---

## Step 6: Run on Android

### Development Mode

```bash
# Run on connected device (prioritized) or emulator
pnpm tauri android dev

# Force emulator
pnpm tauri android dev --emulator

# Open in Android Studio for debugging
pnpm tauri android dev --open
```

First run will:
1. Download Gradle dependencies
2. Compile Rust for Android
3. Build APK
4. Install and run on device/emulator

**This takes 5-10 minutes on first run.** Subsequent runs are much faster due to caching.

### Build Release APK

```bash
# Build debug APK
pnpm tauri android build

# Build release APK (requires signing setup)
pnpm tauri android build --apk

# Build AAB for Google Play
pnpm tauri android build --aab
```

APK location: `src-tauri/gen/android/app/build/outputs/apk/`

---

## Troubleshooting

### "SDK location not found"

**Cause:** ANDROID_HOME not set or wrong path

**Fix:**
```powershell
echo $env:ANDROID_HOME  # Check if set
# Should be: C:\Users\<you>\AppData\Local\Android\Sdk
```

### "NDK not found"

**Cause:** NDK_HOME not set or NDK not installed

**Fix:**
1. Open SDK Manager
2. Install "NDK (Side by side)"
3. Update NDK_HOME environment variable
4. Reboot

### "No connected devices"

**Cause:** ADB not detecting device/emulator

**Fix:**
```bash
# Check ADB
adb devices

# If empty, start emulator or:
# - Enable USB debugging on physical device
# - Accept USB debugging prompt on device
# - Try different USB cable/port
```

### Gradle Build Fails

**Cause:** Usually Java/SDK version mismatch

**Fix:**
```bash
# Clean and rebuild
cd src-tauri/gen/android
./gradlew clean
cd ../../..
pnpm tauri android build
```

### "Unable to find bundletool"

**Cause:** Android SDK Command-line Tools not installed

**Fix:**
1. Open SDK Manager
2. SDK Tools tab
3. Install "Android SDK Command-line Tools (latest)"

### Rust Compilation Errors for Android

**Cause:** Missing Android targets

**Fix:**
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

---

## Alternative: Command-Line Only Setup

If you prefer not to install Android Studio:

```bash
# Create SDK directory
mkdir -p ~/.android/cmdline-tools

# Download command-line tools from:
# https://developer.android.com/studio#command-tools

# Extract to ~/.android/cmdline-tools/latest/

# Set environment variables
export ANDROID_HOME="$HOME/.android"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# Install required components
sdkmanager "platforms;android-34" "platform-tools" "ndk;25.2.9519653" "build-tools;34.0.0"

# Accept licenses
sdkmanager --licenses
```

---

## Quick Reference

### Commands

| Task | Command |
|------|---------|
| Initialize Android | `pnpm tauri android init` |
| Run dev on device | `pnpm tauri android dev` |
| Run dev on emulator | `pnpm tauri android dev --emulator` |
| Build debug APK | `pnpm tauri android build` |
| Build release APK | `pnpm tauri android build --apk` |
| Build AAB | `pnpm tauri android build --aab` |
| Open in Android Studio | `pnpm tauri android dev --open` |

### Environment Variables

| Variable | Value (Windows) |
|----------|-----------------|
| JAVA_HOME | `C:\Program Files\Android\Android Studio\jbr` |
| ANDROID_HOME | `%LOCALAPPDATA%\Android\Sdk` |
| NDK_HOME | `%ANDROID_HOME%\ndk\<version>` |

### File Locations

| File | Path |
|------|------|
| Android project | `src-tauri/gen/android/` |
| AndroidManifest | `src-tauri/gen/android/app/src/main/AndroidManifest.xml` |
| Built APK | `src-tauri/gen/android/app/build/outputs/apk/` |

---

## Resources

- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri Android Setup (Mac)](https://tauritutorials.com/blog/setting-up-your-mac-for-android-development-using-tauri)
- [Android Studio Download](https://developer.android.com/studio)
- [Android SDK Manager Guide](https://developer.android.com/studio/intro/update#sdk-manager)

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Initial setup guide |
