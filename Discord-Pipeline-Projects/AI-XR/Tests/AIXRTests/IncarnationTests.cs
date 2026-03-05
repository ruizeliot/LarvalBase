using AIXR.Incarnation;
using AIXR.Pipeline;
using AIXR.Providers.Registry;
using UnityEngine;

namespace AIXRTests;

#region IncarnationBase Tests

[TestFixture]
public class IncarnationBaseTests
{
    private TestIncarnation _incarnation = null!;

    [SetUp]
    public void SetUp()
    {
        _incarnation = new TestIncarnation();
    }

    [Test]
    public void Initial_Visibility_Is_False()
    {
        Assert.That(_incarnation.IsVisible, Is.False);
    }

    [Test]
    public void Show_Sets_Visible()
    {
        _incarnation.Show();
        Assert.That(_incarnation.IsVisible, Is.True);
    }

    [Test]
    public void Hide_Sets_Not_Visible()
    {
        _incarnation.Show();
        _incarnation.Hide();
        Assert.That(_incarnation.IsVisible, Is.False);
    }

    [Test]
    public void OnStateChanged_Updates_CurrentState()
    {
        _incarnation.OnStateChanged(ConversationState.Ready, ConversationState.Recording);
        Assert.That(_incarnation.CurrentState, Is.EqualTo(ConversationState.Recording));
    }

    [Test]
    public void OnStateChanged_Calls_HandleStateChange()
    {
        _incarnation.OnStateChanged(ConversationState.Ready, ConversationState.Thinking);
        Assert.That(_incarnation.LastHandledState, Is.EqualTo(ConversationState.Thinking));
    }

    [Test]
    public void OnAudioAmplitude_Stores_Value()
    {
        _incarnation.OnAudioAmplitude(0.75f);
        Assert.That(_incarnation.LastAmplitude, Is.EqualTo(0.75f).Within(0.01f));
    }

    [Test]
    public void SetPosition_Stores_Position_And_Rotation()
    {
        var pos = new Vector3(1f, 2f, 3f);
        var rot = Quaternion.identity;

        _incarnation.SetPosition(pos, rot);

        Assert.That(_incarnation.Position.x, Is.EqualTo(1f));
        Assert.That(_incarnation.Position.y, Is.EqualTo(2f));
        Assert.That(_incarnation.Position.z, Is.EqualTo(3f));
    }

    [Test]
    public void All_Five_Conversation_States_Handled()
    {
        var states = new[]
        {
            ConversationState.Ready,
            ConversationState.Recording,
            ConversationState.Transcribing,
            ConversationState.Thinking,
            ConversationState.Talking
        };

        foreach (var state in states)
        {
            _incarnation.OnStateChanged(ConversationState.Ready, state);
            Assert.That(_incarnation.LastHandledState, Is.EqualTo(state),
                $"State {state} was not handled");
        }
    }

    [Test]
    public void Mode_Property_Returns_Correct_Type()
    {
        Assert.That(_incarnation.Mode, Is.EqualTo(IncarnationMode.Avatar));
    }

    [Test]
    public void Opacity_Default_Is_One()
    {
        Assert.That(_incarnation.Opacity, Is.EqualTo(1.0f));
    }

    [Test]
    public void SetOpacity_Clamps_To_Zero_One()
    {
        _incarnation.SetOpacity(1.5f);
        Assert.That(_incarnation.Opacity, Is.EqualTo(1.0f));

        _incarnation.SetOpacity(-0.5f);
        Assert.That(_incarnation.Opacity, Is.EqualTo(0.0f));
    }
}

/// <summary>
/// Concrete test implementation of IncarnationBase for testing.
/// </summary>
internal class TestIncarnation : IncarnationBase
{
    public ConversationState? LastHandledState { get; private set; }
    public float LastAmplitude { get; private set; }

    public override IncarnationMode Mode => IncarnationMode.Avatar;

    protected override void HandleStateChange(ConversationState newState)
    {
        LastHandledState = newState;
    }

    protected override void HandleAudioAmplitude(float amplitude)
    {
        LastAmplitude = amplitude;
    }
}

#endregion

#region AvatarIncarnation Tests

[TestFixture]
public class AvatarIncarnationTests
{
    private AvatarIncarnation _avatar = null!;

    [SetUp]
    public void SetUp()
    {
        _avatar = new AvatarIncarnation();
    }

    [Test]
    public void Mode_Is_Avatar()
    {
        Assert.That(_avatar.Mode, Is.EqualTo(IncarnationMode.Avatar));
    }

    [Test]
    public void State_Ready_Sets_Idle_Animation()
    {
        _avatar.OnStateChanged(ConversationState.Talking, ConversationState.Ready);
        Assert.That(_avatar.CurrentAnimation, Is.EqualTo(AvatarAnimation.Idle));
    }

    [Test]
    public void State_Recording_Sets_Idle_Animation()
    {
        _avatar.OnStateChanged(ConversationState.Ready, ConversationState.Recording);
        Assert.That(_avatar.CurrentAnimation, Is.EqualTo(AvatarAnimation.Idle));
    }

    [Test]
    public void State_Transcribing_Sets_Idle_Animation()
    {
        _avatar.OnStateChanged(ConversationState.Recording, ConversationState.Transcribing);
        Assert.That(_avatar.CurrentAnimation, Is.EqualTo(AvatarAnimation.Idle));
    }

    [Test]
    public void State_Thinking_Sets_Thinking_Animation()
    {
        _avatar.OnStateChanged(ConversationState.Transcribing, ConversationState.Thinking);
        Assert.That(_avatar.CurrentAnimation, Is.EqualTo(AvatarAnimation.Thinking));
    }

    [Test]
    public void State_Talking_Sets_Talking_Animation()
    {
        _avatar.OnStateChanged(ConversationState.Thinking, ConversationState.Talking);
        Assert.That(_avatar.CurrentAnimation, Is.EqualTo(AvatarAnimation.Talking));
    }

    // AC: lip sync driven by audio amplitude
    [Test]
    public void Audio_Amplitude_Updates_LipSyncValue()
    {
        _avatar.OnStateChanged(ConversationState.Thinking, ConversationState.Talking);
        _avatar.OnAudioAmplitude(0.6f);
        Assert.That(_avatar.LipSyncAmplitude, Is.EqualTo(0.6f).Within(0.01f));
    }

    [Test]
    public void LipSync_Only_Active_During_Talking()
    {
        // Not talking - lip sync amplitude should be clamped to 0
        _avatar.OnStateChanged(ConversationState.Ready, ConversationState.Thinking);
        _avatar.OnAudioAmplitude(0.8f);
        Assert.That(_avatar.LipSyncAmplitude, Is.EqualTo(0f));

        // Now talking - lip sync should work
        _avatar.OnStateChanged(ConversationState.Thinking, ConversationState.Talking);
        _avatar.OnAudioAmplitude(0.8f);
        Assert.That(_avatar.LipSyncAmplitude, Is.EqualTo(0.8f).Within(0.01f));
    }

    // AC: Spatial anchor, 1.5m in front of user at eye height
    [Test]
    public void Default_Offset_Is_1_5m_Forward()
    {
        Assert.That(_avatar.DefaultOffset.z, Is.EqualTo(1.5f));
        Assert.That(_avatar.DefaultOffset.y, Is.EqualTo(0f));
    }
}

#endregion

#region OrbeIncarnation Tests

[TestFixture]
public class OrbeIncarnationTests
{
    private OrbeIncarnation _orbe = null!;

    [SetUp]
    public void SetUp()
    {
        _orbe = new OrbeIncarnation();
    }

    [Test]
    public void Mode_Is_Orbe()
    {
        Assert.That(_orbe.Mode, Is.EqualTo(IncarnationMode.Orbe));
    }

    // AC: 4 state colors
    [Test]
    public void Thinking_Color_Is_Blue()
    {
        _orbe.OnStateChanged(ConversationState.Ready, ConversationState.Thinking);
        AssertColorEqual(_orbe.CurrentColor, OrbeIncarnation.ThinkingColor);
    }

    [Test]
    public void Talking_Color_Is_Green()
    {
        _orbe.OnStateChanged(ConversationState.Thinking, ConversationState.Talking);
        AssertColorEqual(_orbe.CurrentColor, OrbeIncarnation.SpeakingColor);
    }

    [Test]
    public void Recording_Color_Is_Orange()
    {
        _orbe.OnStateChanged(ConversationState.Ready, ConversationState.Recording);
        AssertColorEqual(_orbe.CurrentColor, OrbeIncarnation.ListeningColor);
    }

    [Test]
    public void Ready_Color_Is_Gray()
    {
        _orbe.OnStateChanged(ConversationState.Talking, ConversationState.Ready);
        AssertColorEqual(_orbe.CurrentColor, OrbeIncarnation.IdleColor);
    }

    [Test]
    public void Transcribing_Color_Is_Orange()
    {
        _orbe.OnStateChanged(ConversationState.Recording, ConversationState.Transcribing);
        AssertColorEqual(_orbe.CurrentColor, OrbeIncarnation.ListeningColor);
    }

    // AC: glow intensity pulses with audio amplitude
    [Test]
    public void Audio_Amplitude_Updates_GlowIntensity()
    {
        _orbe.OnAudioAmplitude(0.9f);
        Assert.That(_orbe.GlowIntensity, Is.GreaterThan(0f));
    }

    [Test]
    public void GlowIntensity_Scales_With_Amplitude()
    {
        _orbe.OnAudioAmplitude(0.5f);
        float halfGlow = _orbe.GlowIntensity;

        _orbe.OnAudioAmplitude(1.0f);
        float fullGlow = _orbe.GlowIntensity;

        Assert.That(fullGlow, Is.GreaterThan(halfGlow));
    }

    // AC: ~30cm diameter
    [Test]
    public void Sphere_Diameter_Is_30cm()
    {
        Assert.That(_orbe.SphereDiameter, Is.EqualTo(0.3f).Within(0.01f));
    }

    // AC: 1.2m in front, 0.3m above eye height
    [Test]
    public void Default_Offset_Is_Correct()
    {
        Assert.That(_orbe.DefaultOffset.z, Is.EqualTo(1.2f));
        Assert.That(_orbe.DefaultOffset.y, Is.EqualTo(0.3f));
    }

    private static void AssertColorEqual(Color actual, Color expected)
    {
        Assert.That(actual.r, Is.EqualTo(expected.r).Within(0.02f), "Red mismatch");
        Assert.That(actual.g, Is.EqualTo(expected.g).Within(0.02f), "Green mismatch");
        Assert.That(actual.b, Is.EqualTo(expected.b).Within(0.02f), "Blue mismatch");
    }
}

#endregion

#region InvisibleIncarnation Tests

[TestFixture]
public class InvisibleIncarnationTests
{
    private InvisibleIncarnation _invisible = null!;

    [SetUp]
    public void SetUp()
    {
        _invisible = new InvisibleIncarnation();
    }

    [Test]
    public void Mode_Is_Invisible()
    {
        Assert.That(_invisible.Mode, Is.EqualTo(IncarnationMode.Invisible));
    }

    // AC: floor circle 1m diameter
    [Test]
    public void FloorCircle_Diameter_Is_1m()
    {
        Assert.That(_invisible.FloorCircleDiameter, Is.EqualTo(1.0f));
    }

    // AC: monospace HUD text
    [Test]
    public void HUD_Text_Initially_Empty()
    {
        Assert.That(_invisible.HUDText, Is.EqualTo(""));
    }

    // AC: live transcript updates
    [Test]
    public void SetTranscript_Updates_HUDText()
    {
        _invisible.SetTranscript("Hello world");
        Assert.That(_invisible.HUDText, Is.EqualTo("Hello world"));
    }

    // AC: typewriter effect for AI response
    [Test]
    public void TypewriterEffect_Returns_Partial_Text()
    {
        _invisible.StartTypewriter("Hello world");

        // Advance a few characters
        _invisible.AdvanceTypewriter(5);
        Assert.That(_invisible.TypewriterText, Is.EqualTo("Hello"));
    }

    [Test]
    public void TypewriterEffect_Completes()
    {
        _invisible.StartTypewriter("Hi");
        _invisible.AdvanceTypewriter(100); // more than text length
        Assert.That(_invisible.TypewriterText, Is.EqualTo("Hi"));
        Assert.That(_invisible.IsTypewriterComplete, Is.True);
    }

    // AC: States reflected
    [Test]
    public void State_Ready_Shows_Ready_Status()
    {
        _invisible.OnStateChanged(ConversationState.Talking, ConversationState.Ready);
        Assert.That(_invisible.StatusText, Is.EqualTo("READY"));
    }

    [Test]
    public void State_Recording_Shows_Recording_Status()
    {
        _invisible.OnStateChanged(ConversationState.Ready, ConversationState.Recording);
        Assert.That(_invisible.StatusText, Is.EqualTo("RECORDING"));
    }

    [Test]
    public void State_Thinking_Shows_Thinking_Status()
    {
        _invisible.OnStateChanged(ConversationState.Recording, ConversationState.Thinking);
        Assert.That(_invisible.StatusText, Is.EqualTo("THINKING"));
    }

    [Test]
    public void State_Talking_Shows_Talking_Status()
    {
        _invisible.OnStateChanged(ConversationState.Thinking, ConversationState.Talking);
        Assert.That(_invisible.StatusText, Is.EqualTo("TALKING"));
    }

    [Test]
    public void State_Transcribing_Shows_Transcribing_Status()
    {
        _invisible.OnStateChanged(ConversationState.Recording, ConversationState.Transcribing);
        Assert.That(_invisible.StatusText, Is.EqualTo("TRANSCRIBING"));
    }
}

#endregion

#region IncarnationManager Tests

[TestFixture]
public class IncarnationManagerTests
{
    private IncarnationManager _manager = null!;
    private AvatarIncarnation _avatar = null!;
    private OrbeIncarnation _orbe = null!;
    private InvisibleIncarnation _invisible = null!;
    private ProviderConfig _config = null!;
    private string _tempDir = null!;

    [SetUp]
    public void SetUp()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"aixr-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        _config = new ProviderConfig(_tempDir);
        _avatar = new AvatarIncarnation();
        _orbe = new OrbeIncarnation();
        _invisible = new InvisibleIncarnation();

        _manager = new IncarnationManager(_avatar, _orbe, _invisible, _config);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    // AC1: Floating spatial selector panel with 3 modes
    [Test]
    public void Three_Modes_Registered()
    {
        Assert.That(_manager.AvailableModes, Has.Length.EqualTo(3));
        Assert.That(_manager.AvailableModes, Does.Contain(IncarnationMode.Avatar));
        Assert.That(_manager.AvailableModes, Does.Contain(IncarnationMode.Orbe));
        Assert.That(_manager.AvailableModes, Does.Contain(IncarnationMode.Invisible));
    }

    // AC2: Switch is cosmetic only — no impact on pipeline
    [Test]
    public void Default_Mode_Is_Orbe()
    {
        Assert.That(_manager.CurrentMode, Is.EqualTo(IncarnationMode.Orbe));
    }

    // AC3: Current mode highlighted; tap to switch
    [Test]
    public void SwitchMode_Changes_Active_Incarnation()
    {
        _manager.SwitchMode(IncarnationMode.Avatar);
        Assert.That(_manager.CurrentMode, Is.EqualTo(IncarnationMode.Avatar));
    }

    [Test]
    public void SwitchMode_Hides_Previous_Shows_New()
    {
        _manager.SwitchMode(IncarnationMode.Orbe);
        Assert.That(_orbe.IsVisible, Is.True);
        Assert.That(_avatar.IsVisible, Is.False);
        Assert.That(_invisible.IsVisible, Is.False);

        _manager.SwitchMode(IncarnationMode.Avatar);
        Assert.That(_avatar.IsVisible, Is.True);
        Assert.That(_orbe.IsVisible, Is.False);
    }

    // AC4: Smooth fade transition 0.3s
    [Test]
    public void Fade_Duration_Is_0_3_Seconds()
    {
        Assert.That(IncarnationManager.FadeDuration, Is.EqualTo(0.3f));
    }

    // AC5: Mode persists in config between sessions
    [Test]
    public void SwitchMode_Persists_To_Config()
    {
        _manager.SwitchMode(IncarnationMode.Invisible);

        // Create new manager with same config to simulate restart
        var newManager = new IncarnationManager(
            new AvatarIncarnation(),
            new OrbeIncarnation(),
            new InvisibleIncarnation(),
            _config);

        Assert.That(newManager.CurrentMode, Is.EqualTo(IncarnationMode.Invisible));
    }

    // AC6: All 3 modes reflect 5 conversation states
    [Test]
    public void StateChanged_Forwarded_To_Active_Incarnation()
    {
        _manager.SwitchMode(IncarnationMode.Orbe);
        _manager.OnStateChanged(ConversationState.Ready, ConversationState.Thinking);

        Assert.That(_orbe.CurrentColor.r, Is.EqualTo(OrbeIncarnation.ThinkingColor.r).Within(0.02f));
    }

    [Test]
    public void AudioAmplitude_Forwarded_To_Active_Incarnation()
    {
        _manager.SwitchMode(IncarnationMode.Orbe);
        _manager.OnAudioAmplitude(0.5f);

        Assert.That(_orbe.GlowIntensity, Is.GreaterThan(0f));
    }

    [Test]
    public void SwitchMode_To_Same_Mode_Is_NoOp()
    {
        _manager.SwitchMode(IncarnationMode.Orbe);
        var prevVisible = _orbe.IsVisible;

        _manager.SwitchMode(IncarnationMode.Orbe);
        Assert.That(_orbe.IsVisible, Is.EqualTo(prevVisible));
    }

    [Test]
    public void GetActiveIncarnation_Returns_Current()
    {
        _manager.SwitchMode(IncarnationMode.Avatar);
        Assert.That(_manager.GetActiveIncarnation(), Is.SameAs(_avatar));

        _manager.SwitchMode(IncarnationMode.Invisible);
        Assert.That(_manager.GetActiveIncarnation(), Is.SameAs(_invisible));
    }

    // Position forwarding
    [Test]
    public void SetPosition_Forwarded_To_Active()
    {
        _manager.SwitchMode(IncarnationMode.Avatar);
        var pos = new Vector3(1f, 2f, 3f);
        _manager.SetPosition(pos, Quaternion.identity);

        Assert.That(_avatar.Position.x, Is.EqualTo(1f));
    }
}

#endregion

#region IncarnationMode Enum Tests

[TestFixture]
public class IncarnationModeTests
{
    [Test]
    public void Three_Modes_Exist()
    {
        var modes = Enum.GetValues(typeof(IncarnationMode));
        Assert.That(modes, Has.Length.EqualTo(3));
    }

    [Test]
    public void Modes_Are_Named_Correctly()
    {
        Assert.That(Enum.IsDefined(typeof(IncarnationMode), "Avatar"), Is.True);
        Assert.That(Enum.IsDefined(typeof(IncarnationMode), "Orbe"), Is.True);
        Assert.That(Enum.IsDefined(typeof(IncarnationMode), "Invisible"), Is.True);
    }
}

#endregion
