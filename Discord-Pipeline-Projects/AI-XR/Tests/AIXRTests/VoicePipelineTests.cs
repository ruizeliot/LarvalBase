using AIXR.Pipeline;
using AIXR.Input;
using AIXR.Audio;
using AIXR.Providers;
using AIXR.Providers.Registry;
using AIXR.Error;
using UnityEngine;

namespace AIXRTests;

#region ConversationStateMachine Tests

[TestFixture]
public class ConversationStateMachineTests
{
    private ConversationStateMachine _fsm = null!;

    [SetUp]
    public void SetUp()
    {
        _fsm = new ConversationStateMachine();
    }

    // AC5: 5 feedback states
    [Test]
    public void Initial_State_Is_Ready()
    {
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Ready));
    }

    [Test]
    public void All_Five_States_Exist()
    {
        var states = Enum.GetValues(typeof(ConversationState));
        Assert.That(states, Has.Length.EqualTo(5));
    }

    // State transitions per PRD
    [Test]
    public void Ready_To_Recording_On_PTTPressed()
    {
        _fsm.OnPTTPressed();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Recording));
    }

    [Test]
    public void Recording_To_Transcribing_On_PTTReleased_ValidDuration()
    {
        _fsm.OnPTTPressed();
        _fsm.OnPTTReleased(audioDurationSeconds: 1.0f);
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Transcribing));
    }

    // AC9: Minimum 0.5s recording
    [Test]
    public void Recording_To_Ready_On_PTTReleased_TooShort()
    {
        _fsm.OnPTTPressed();
        _fsm.OnPTTReleased(audioDurationSeconds: 0.3f);
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Ready));
    }

    [Test]
    public void Recording_To_Ready_On_Exactly_HalfSecond_Is_Valid()
    {
        _fsm.OnPTTPressed();
        _fsm.OnPTTReleased(audioDurationSeconds: 0.5f);
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Transcribing));
    }

    [Test]
    public void Transcribing_To_Thinking()
    {
        _fsm.OnPTTPressed();
        _fsm.OnPTTReleased(audioDurationSeconds: 1.0f);
        _fsm.OnTranscriptionComplete();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Thinking));
    }

    [Test]
    public void Thinking_To_Talking()
    {
        AdvanceTo(ConversationState.Thinking);
        _fsm.OnLLMComplete();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Talking));
    }

    [Test]
    public void Talking_To_Ready()
    {
        AdvanceTo(ConversationState.Talking);
        _fsm.OnPlaybackComplete();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Ready));
    }

    // AC6: PTT disabled during processing states (anti-spam)
    [Test]
    public void PTT_Ignored_During_Recording()
    {
        _fsm.OnPTTPressed();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Recording));
        _fsm.OnPTTPressed(); // should be ignored
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Recording));
    }

    [Test]
    public void PTT_Ignored_During_Transcribing()
    {
        _fsm.OnPTTPressed();
        _fsm.OnPTTReleased(1.0f);
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Transcribing));
        _fsm.OnPTTPressed();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Transcribing));
    }

    [Test]
    public void PTT_Ignored_During_Thinking()
    {
        AdvanceTo(ConversationState.Thinking);
        _fsm.OnPTTPressed();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Thinking));
    }

    [Test]
    public void PTT_Ignored_During_Talking()
    {
        AdvanceTo(ConversationState.Talking);
        _fsm.OnPTTPressed();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Talking));
    }

    // AC7: PTT re-enables only after playback completes
    [Test]
    public void PTT_Works_After_Full_Cycle()
    {
        AdvanceTo(ConversationState.Talking);
        _fsm.OnPlaybackComplete();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Ready));

        _fsm.OnPTTPressed();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Recording));
    }

    // Error recovery: any state -> Ready
    [Test]
    public void Error_Reset_From_Any_State()
    {
        _fsm.OnPTTPressed();
        _fsm.OnPTTReleased(1.0f);
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Transcribing));

        _fsm.OnError();
        Assert.That(_fsm.CurrentState, Is.EqualTo(ConversationState.Ready));
    }

    // State change events fire
    [Test]
    public void State_Change_Event_Fires()
    {
        ConversationState? oldState = null;
        ConversationState? newState = null;

        _fsm.OnStateChanged += (from, to) =>
        {
            oldState = from;
            newState = to;
        };

        _fsm.OnPTTPressed();

        Assert.That(oldState, Is.EqualTo(ConversationState.Ready));
        Assert.That(newState, Is.EqualTo(ConversationState.Recording));
    }

    [Test]
    public void CanAcceptInput_Only_In_Ready_State()
    {
        Assert.That(_fsm.CanAcceptInput, Is.True);

        _fsm.OnPTTPressed();
        Assert.That(_fsm.CanAcceptInput, Is.False);
    }

    private void AdvanceTo(ConversationState target)
    {
        if (target >= ConversationState.Recording)
            _fsm.OnPTTPressed();
        if (target >= ConversationState.Transcribing)
            _fsm.OnPTTReleased(1.0f);
        if (target >= ConversationState.Thinking)
            _fsm.OnTranscriptionComplete();
        if (target >= ConversationState.Talking)
            _fsm.OnLLMComplete();
    }
}

#endregion

#region AudioClipToWav Tests

[TestFixture]
public class AudioClipToWavTests
{
    // AC3: PCM 16-bit 16kHz mono WAV
    [Test]
    public void Convert_Returns_Valid_WAV_Header()
    {
        var samples = new float[16000]; // 1 second at 16kHz
        var wavBytes = AudioClipToWav.Convert(samples, 1, 16000);

        // WAV RIFF header
        Assert.That(wavBytes[0], Is.EqualTo((byte)'R'));
        Assert.That(wavBytes[1], Is.EqualTo((byte)'I'));
        Assert.That(wavBytes[2], Is.EqualTo((byte)'F'));
        Assert.That(wavBytes[3], Is.EqualTo((byte)'F'));
    }

    [Test]
    public void Convert_Has_Correct_Format_Chunk()
    {
        var samples = new float[16000];
        var wavBytes = AudioClipToWav.Convert(samples, 1, 16000);

        // fmt chunk starts at byte 12
        Assert.That(wavBytes[12], Is.EqualTo((byte)'f'));
        Assert.That(wavBytes[13], Is.EqualTo((byte)'m'));
        Assert.That(wavBytes[14], Is.EqualTo((byte)'t'));

        // Audio format = 1 (PCM) at byte 20
        var audioFormat = BitConverter.ToInt16(wavBytes, 20);
        Assert.That(audioFormat, Is.EqualTo(1)); // PCM

        // Channels = 1 (mono) at byte 22
        var channels = BitConverter.ToInt16(wavBytes, 22);
        Assert.That(channels, Is.EqualTo(1));

        // Sample rate = 16000 at byte 24
        var sampleRate = BitConverter.ToInt32(wavBytes, 24);
        Assert.That(sampleRate, Is.EqualTo(16000));

        // Bits per sample = 16 at byte 34
        var bitsPerSample = BitConverter.ToInt16(wavBytes, 34);
        Assert.That(bitsPerSample, Is.EqualTo(16));
    }

    [Test]
    public void Convert_Data_Length_Matches_Samples()
    {
        var samples = new float[800]; // 50ms at 16kHz
        var wavBytes = AudioClipToWav.Convert(samples, 1, 16000);

        // Data chunk header at byte 36
        Assert.That(wavBytes[36], Is.EqualTo((byte)'d'));
        Assert.That(wavBytes[37], Is.EqualTo((byte)'a'));
        Assert.That(wavBytes[38], Is.EqualTo((byte)'t'));
        Assert.That(wavBytes[39], Is.EqualTo((byte)'a'));

        // Data size = samples * 2 bytes (16-bit)
        var dataSize = BitConverter.ToInt32(wavBytes, 40);
        Assert.That(dataSize, Is.EqualTo(800 * 2));
    }

    [Test]
    public void Convert_Sample_Values_Are_Correct()
    {
        var samples = new float[] { 0f, 1f, -1f, 0.5f };
        var wavBytes = AudioClipToWav.Convert(samples, 1, 16000);

        // Data starts at byte 44
        var s0 = BitConverter.ToInt16(wavBytes, 44);
        var s1 = BitConverter.ToInt16(wavBytes, 46);
        var s2 = BitConverter.ToInt16(wavBytes, 48);
        var s3 = BitConverter.ToInt16(wavBytes, 50);

        Assert.That(s0, Is.EqualTo(0));
        Assert.That(s1, Is.EqualTo(short.MaxValue));
        Assert.That(s2, Is.EqualTo(short.MinValue));
        Assert.That(s3, Is.InRange(16000, 16500)); // ~0.5 * 32767
    }

    [Test]
    public void Convert_Total_Length_Is_Header_Plus_Data()
    {
        var samples = new float[100];
        var wavBytes = AudioClipToWav.Convert(samples, 1, 16000);
        Assert.That(wavBytes.Length, Is.EqualTo(44 + 100 * 2)); // 44 byte header + data
    }
}

#endregion

#region AudioPlayback Tests

[TestFixture]
public class AudioPlaybackTests
{
    private AudioPlayback _playback = null!;

    [SetUp]
    public void SetUp()
    {
        _playback = new AudioPlayback();
    }

    [Test]
    public void IsPlaying_Initially_False()
    {
        Assert.That(_playback.IsPlaying, Is.False);
    }

    [Test]
    public void Play_Sets_IsPlaying()
    {
        var clip = new AudioClip { length = 2.0f };
        _playback.Play(clip);
        Assert.That(_playback.IsPlaying, Is.True);
    }

    [Test]
    public void SimulatePlaybackComplete_Fires_Event()
    {
        bool completed = false;
        _playback.OnPlaybackComplete += () => completed = true;

        var clip = new AudioClip { length = 1.0f };
        _playback.Play(clip);
        _playback.SimulateComplete();

        Assert.That(completed, Is.True);
        Assert.That(_playback.IsPlaying, Is.False);
    }

    [Test]
    public void Amplitude_Callback_Fires()
    {
        float? reportedAmplitude = null;
        _playback.OnAmplitude += (amp) => reportedAmplitude = amp;

        _playback.ReportAmplitude(0.75f);

        Assert.That(reportedAmplitude, Is.EqualTo(0.75f).Within(0.01f));
    }

    [Test]
    public void Stop_Stops_Playback()
    {
        var clip = new AudioClip { length = 2.0f };
        _playback.Play(clip);
        _playback.Stop();
        Assert.That(_playback.IsPlaying, Is.False);
    }
}

#endregion

#region PTTController Tests

[TestFixture]
public class PTTControllerTests
{
    private PTTController _ptt = null!;

    [SetUp]
    public void SetUp()
    {
        _ptt = new PTTController();
    }

    // AC1: PTT activation: right trigger OR hand pinch
    [Test]
    public void Controller_Trigger_Starts_PTT()
    {
        bool pressed = false;
        _ptt.OnPTTPressed += () => pressed = true;

        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, true);
        Assert.That(pressed, Is.True);
    }

    [Test]
    public void Hand_Pinch_Starts_PTT()
    {
        bool pressed = false;
        _ptt.OnPTTPressed += () => pressed = true;

        _ptt.SimulateInput(PTTInputSource.HandPinch, true);
        Assert.That(pressed, Is.True);
    }

    // AC2: Recording starts on button down, stops on button up
    [Test]
    public void Release_Fires_PTTReleased()
    {
        bool released = false;
        _ptt.OnPTTReleased += () => released = true;

        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, true);
        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, false);
        Assert.That(released, Is.True);
    }

    // AC6: PTT disabled when not accepting input
    [Test]
    public void PTT_Blocked_When_Disabled()
    {
        _ptt.SetEnabled(false);

        bool pressed = false;
        _ptt.OnPTTPressed += () => pressed = true;

        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, true);
        Assert.That(pressed, Is.False);
    }

    [Test]
    public void PTT_Re_Enabled_After_Disable()
    {
        _ptt.SetEnabled(false);
        _ptt.SetEnabled(true);

        bool pressed = false;
        _ptt.OnPTTPressed += () => pressed = true;

        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, true);
        Assert.That(pressed, Is.True);
    }

    [Test]
    public void Duplicate_Press_Ignored()
    {
        int pressCount = 0;
        _ptt.OnPTTPressed += () => pressCount++;

        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, true);
        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, true); // duplicate
        Assert.That(pressCount, Is.EqualTo(1));
    }

    [Test]
    public void Release_Without_Press_Ignored()
    {
        int releaseCount = 0;
        _ptt.OnPTTReleased += () => releaseCount++;

        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, false);
        Assert.That(releaseCount, Is.EqualTo(0));
    }
}

#endregion

#region MicrophoneInput Tests

[TestFixture]
public class MicrophoneInputTests
{
    private MicrophoneInput _mic = null!;

    [SetUp]
    public void SetUp()
    {
        _mic = new MicrophoneInput(sampleRate: 16000, channels: 1);
    }

    [Test]
    public void Default_SampleRate_Is_16000()
    {
        Assert.That(_mic.SampleRate, Is.EqualTo(16000));
    }

    [Test]
    public void Default_Channels_Is_Mono()
    {
        Assert.That(_mic.Channels, Is.EqualTo(1));
    }

    [Test]
    public void StartRecording_Sets_IsRecording()
    {
        _mic.StartRecording();
        Assert.That(_mic.IsRecording, Is.True);
    }

    [Test]
    public void StopRecording_Returns_Duration()
    {
        _mic.StartRecording();
        // Simulate adding samples (16000 samples = 1 second)
        _mic.AddSamples(new float[16000]);
        var result = _mic.StopRecording();

        Assert.That(result.DurationSeconds, Is.EqualTo(1.0f).Within(0.01f));
        Assert.That(_mic.IsRecording, Is.False);
    }

    [Test]
    public void StopRecording_Returns_Samples()
    {
        _mic.StartRecording();
        _mic.AddSamples(new float[800]); // 50ms
        var result = _mic.StopRecording();

        Assert.That(result.Samples, Has.Length.EqualTo(800));
    }

    [Test]
    public void StopRecording_Without_Start_Returns_Empty()
    {
        var result = _mic.StopRecording();
        Assert.That(result.DurationSeconds, Is.EqualTo(0f));
        Assert.That(result.Samples, Has.Length.EqualTo(0));
    }

    [Test]
    public void Multiple_AddSamples_Accumulate()
    {
        _mic.StartRecording();
        _mic.AddSamples(new float[8000]);
        _mic.AddSamples(new float[8000]);
        var result = _mic.StopRecording();

        Assert.That(result.Samples, Has.Length.EqualTo(16000));
        Assert.That(result.DurationSeconds, Is.EqualTo(1.0f).Within(0.01f));
    }
}

#endregion

#region VoicePipeline Tests

[TestFixture]
public class VoicePipelineTests
{
    private VoicePipeline _pipeline = null!;
    private ConversationStateMachine _fsm = null!;
    private FakeSTTProviderEx _stt = null!;
    private FakeLLMProvider _llm = null!;
    private FakeTTSProvider _tts = null!;
    private ProviderConfig _config = null!;
    private ProviderRegistry _registry = null!;
    private DegradationManager _degradation = null!;
    private string _tempDir = null!;

    [SetUp]
    public void SetUp()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"aixr-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        _config = new ProviderConfig(_tempDir);
        _registry = new ProviderRegistry(_config);
        _fsm = new ConversationStateMachine();
        _degradation = new DegradationManager();

        _stt = new FakeSTTProviderEx("test-stt");
        _llm = new FakeLLMProvider("test-llm");
        _tts = new FakeTTSProvider("test-tts");

        _registry.Register<ISTTProvider>(BrickType.STT, SlotType.Cloud1, _stt);
        _registry.Register<ILLMProvider>(BrickType.LLM, SlotType.Cloud1, _llm);
        _registry.Register<ITTSProvider>(BrickType.TTS, SlotType.Cloud1, _tts);

        _pipeline = new VoicePipeline(_fsm, _registry, _degradation);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    // AC4: Full pipeline executes sequentially: STT -> LLM -> TTS -> playback
    [Test]
    public async Task Pipeline_Executes_STT_LLM_TTS_Sequentially()
    {
        var audioWav = new byte[100];
        var result = await _pipeline.ExecuteAsync(audioWav);

        Assert.That(result.Transcript, Is.EqualTo("fake transcript"));
        Assert.That(result.Response, Is.EqualTo("fake response"));
        Assert.That(result.AudioClip, Is.Not.Null);
    }

    [Test]
    public async Task Pipeline_Transitions_Through_States()
    {
        var states = new List<ConversationState>();
        _fsm.OnStateChanged += (_, to) => states.Add(to);

        // Start from Transcribing (after PTT release)
        _fsm.OnPTTPressed();
        _fsm.OnPTTReleased(1.0f);
        states.Clear(); // clear the initial transitions

        var audioWav = new byte[100];
        await _pipeline.ExecuteAsync(audioWav);

        // Pipeline should transition: Transcribing -> Thinking -> Talking
        Assert.That(states, Does.Contain(ConversationState.Thinking));
        Assert.That(states, Does.Contain(ConversationState.Talking));
    }

    [Test]
    public async Task Pipeline_STT_Failure_Resets_To_Ready()
    {
        _stt.ShouldFail = true;

        var audioWav = new byte[100];
        var result = await _pipeline.ExecuteAsync(audioWav);

        Assert.That(result.Success, Is.False);
        Assert.That(result.Error, Is.Not.Null);
    }

    [Test]
    public async Task Pipeline_LLM_Failure_Resets_To_Ready()
    {
        _llm.ShouldFail = true;

        var audioWav = new byte[100];
        var result = await _pipeline.ExecuteAsync(audioWav);

        Assert.That(result.Success, Is.False);
    }

    [Test]
    public async Task Pipeline_TTS_Failure_Resets_To_Ready()
    {
        _tts.ShouldFail = true;

        var audioWav = new byte[100];
        var result = await _pipeline.ExecuteAsync(audioWav);

        Assert.That(result.Success, Is.False);
    }

    [Test]
    public async Task Pipeline_Uses_ConversationContext()
    {
        var context = new ConversationContext();
        context.SetSystemPrompt("You are a helpful assistant.");

        var pipelineWithContext = new VoicePipeline(_fsm, _registry, _degradation, context);

        var audioWav = new byte[100];
        await pipelineWithContext.ExecuteAsync(audioWav);

        // LLM should have received messages including system prompt
        Assert.That(_llm.LastMessages, Is.Not.Null);
        Assert.That(_llm.LastMessages!.Count, Is.GreaterThanOrEqualTo(1));
        Assert.That(_llm.LastMessages[0].Role, Is.EqualTo("system"));
    }

    [Test]
    public async Task Pipeline_Adds_Messages_To_Context()
    {
        var context = new ConversationContext();
        var pipelineWithContext = new VoicePipeline(_fsm, _registry, _degradation, context);

        var audioWav = new byte[100];
        await pipelineWithContext.ExecuteAsync(audioWav);

        // Context should now have user + assistant messages
        Assert.That(context.MessageCount, Is.EqualTo(2)); // user + assistant
    }
}

#endregion

#region Test Doubles for Epic 2

internal class FakeSTTProviderEx : ISTTProvider
{
    public string ProviderName { get; }
    public bool ShouldFail { get; set; }

    public FakeSTTProviderEx(string name) => ProviderName = name;

    public Task<string> TranscribeAsync(byte[] audioWav, System.Threading.CancellationToken ct = default)
    {
        if (ShouldFail) throw new Exception("STT provider failed");
        return Task.FromResult("fake transcript");
    }

    public Task<bool> TestConnectionAsync(System.Threading.CancellationToken ct = default)
        => Task.FromResult(true);
}

internal class FakeLLMProvider : ILLMProvider
{
    public string ProviderName { get; }
    public bool ShouldFail { get; set; }
    public List<ConversationMessage>? LastMessages { get; private set; }

    public FakeLLMProvider(string name) => ProviderName = name;

    public Task<string> CompleteAsync(List<ConversationMessage> messages, System.Threading.CancellationToken ct = default)
    {
        LastMessages = messages;
        if (ShouldFail) throw new Exception("LLM provider failed");
        return Task.FromResult("fake response");
    }

    public Task<bool> TestConnectionAsync(System.Threading.CancellationToken ct = default)
        => Task.FromResult(true);
}

internal class FakeTTSProvider : ITTSProvider
{
    public string ProviderName { get; }
    public bool ShouldFail { get; set; }

    public FakeTTSProvider(string name) => ProviderName = name;

    public Task<AudioClip> SynthesizeAsync(string text, System.Threading.CancellationToken ct = default)
    {
        if (ShouldFail) throw new Exception("TTS provider failed");
        return Task.FromResult(new AudioClip { length = 1.0f });
    }

    public Task<bool> TestConnectionAsync(System.Threading.CancellationToken ct = default)
        => Task.FromResult(true);
}

#endregion
