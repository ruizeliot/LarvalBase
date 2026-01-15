# Worker Base Rules: Unity (Meta XR)

**Stack:** Unity
**Framework:** Unity 6+ with Meta XR SDK
**Language:** C#
**Target:** Meta Quest (Android)
**Test Framework:** Unity Test Framework (EditMode + PlayMode)

---

## Package Management (UPM)

### Via Unity Package Manager

**Location:** `Packages/manifest.json`

```json
{
  "dependencies": {
    "com.meta.xr.sdk.core": "69.0.0",
    "com.meta.xr.sdk.interaction": "69.0.0"
  }
}
```

### Common Meta XR Packages

| Feature | UPM Package |
|---------|-------------|
| Core XR | com.meta.xr.sdk.core |
| Interactions | com.meta.xr.sdk.interaction |
| OVR Interactions | com.meta.xr.sdk.interaction.ovr |
| Platform Services | com.meta.xr.sdk.platform |
| Spatial Audio | com.meta.xr.sdk.audio |
| Avatars | com.meta.xr.sdk.avatars |

---

## Capabilities (Permissions)

**Location:** `Assets/Plugins/Android/AndroidManifest.xml`

```xml
<uses-permission android:name="com.oculus.permission.HAND_TRACKING" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-feature android:name="android.hardware.vr.headtracking" android:required="true" />
```

**OVRManager Settings:**
- Hand Tracking enabled
- Controller support enabled
- Passthrough (if MR app)

---

## Test Framework

### EditMode Tests (Unit Tests)

**Location:** `Assets/Tests/EditMode/`

```csharp
using NUnit.Framework;

public class ScoreCalculatorTests
{
    [Test]
    public void Calculate_ReturnsCorrectSum()
    {
        var calculator = new ScoreCalculator();
        Assert.AreEqual(15, calculator.Calculate(10, 5));
    }
}
```

### PlayMode Tests (Integration/E2E)

**Location:** `Assets/Tests/PlayMode/`

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

public class GrabInteractionTests
{
    [UnityTest]
    public IEnumerator ObjectCanBeGrabbed()
    {
        // Arrange
        var grabbable = Object.Instantiate(Resources.Load<GameObject>("TestGrabbable"));
        var hand = CreateTestHandInteractor();

        // Act - Simulate grab
        yield return SimulateHandApproach(hand, grabbable.transform.position);
        yield return SimulateGrabGesture(hand);
        yield return new WaitForSeconds(0.1f);

        // Assert
        Assert.IsTrue(grabbable.GetComponent<Grabbable>().IsGrabbed);
    }

    private IEnumerator SimulateHandApproach(Transform hand, Vector3 target)
    {
        // Move hand toward target over time
        float duration = 0.5f;
        float elapsed = 0;
        Vector3 start = hand.position;

        while (elapsed < duration)
        {
            hand.position = Vector3.Lerp(start, target, elapsed / duration);
            elapsed += Time.deltaTime;
            yield return null;
        }
    }
}
```

---

## Forbidden Patterns

### NO Mocking OVR/XR APIs

```csharp
// ❌ FORBIDDEN
var mockOVRInput = Substitute.For<IOVRInput>();
var fakeHandState = new OVRHand.HandState { IsTracked = true };

// ✅ REQUIRED - Use real XR systems (or simulation)
OVRInput.Get(OVRInput.Button.PrimaryHandTrigger);
```

### NO Direct State Manipulation

```csharp
// ❌ FORBIDDEN - Bypasses real interaction
grabbable.isGrabbed = true;
interactable.OnSelect.Invoke(fakeInteractor);

// ✅ REQUIRED - Simulate real interaction
yield return SimulateGrabGesture(hand);
Assert.IsTrue(grabbable.selectingInteractor != null);
```

### NO Hardcoded Transforms

```csharp
// ❌ FORBIDDEN - Cheating physics
objectToGrab.transform.position = hand.transform.position;
objectToGrab.transform.SetParent(hand);

// ✅ REQUIRED - Let interaction system handle it
yield return SimulateGrabGesture(hand);
// Grabbable component handles parenting
```

---

## Integration Extraction Table

Use this when scanning user stories:

| Story Contains | Implies Integration |
|----------------|---------------------|
| "grab", "pick up", "hold" | com.meta.xr.sdk.interaction (Grabbable) |
| "poke", "press button" | com.meta.xr.sdk.interaction (PokeInteractor) |
| "point at", "ray select" | com.meta.xr.sdk.interaction (RayInteractor) |
| "hand tracking", "gesture" | com.meta.xr.sdk.core (OVRHand) |
| "controller", "trigger" | com.meta.xr.sdk.core (OVRInput) |
| "passthrough", "mixed reality" | com.meta.xr.sdk.core (OVRPassthroughLayer) |
| "spatial audio", "3D sound" | com.meta.xr.sdk.audio |
| "avatar", "social" | com.meta.xr.sdk.avatars, com.meta.xr.sdk.platform |

---

## Build Commands

```bash
# Build via Unity (use Unity MCP or manual)
# Menu: File > Build Settings > Build

# Run tests
# Menu: Window > General > Test Runner
# Or via Unity MCP: run_tests tool
```

---

## File Structure

```
project/
├── Assets/
│   ├── Scripts/           # C# scripts
│   ├── Prefabs/           # Prefab assets
│   ├── Scenes/            # Unity scenes
│   ├── Resources/         # Runtime-loadable assets
│   └── Tests/
│       ├── EditMode/      # Unit tests
│       └── PlayMode/      # Integration tests
├── Packages/
│   └── manifest.json      # UPM dependencies
├── ProjectSettings/
│   └── *.asset
├── docs/
│   ├── brainstorm-notes.md
│   ├── user-stories.md
│   └── functionality-specs.md
└── .pipeline/
    └── manifest.json
```

---

## Performance Requirements

| Metric | Quest 2 | Quest 3 |
|--------|---------|---------|
| Frame Rate | 72 FPS | 90 FPS |
| Memory | < 2GB | < 4GB |
| APK Size | < 1GB | < 2GB |

**Include performance specs in functionality-specs.md.**

---

## MCP Tools Available

### Unity MCP
- `manage_gameobject` - Create/modify GameObjects
- `manage_script` - Read/write C# scripts
- `manage_prefabs` - Create prefabs
- `run_tests` - Execute tests
- `read_console` - Check errors

### Meta MQDH MCP
- Documentation search
- Device debugging (logcat)
- 3D asset search
