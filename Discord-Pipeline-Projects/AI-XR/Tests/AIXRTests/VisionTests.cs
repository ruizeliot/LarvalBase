using AIXR.Vision;
using AIXR.Pipeline;
using AIXR.Providers;
using AIXR.Providers.Registry;
using AIXR.Error;
using AIXR.Audio;
using UnityEngine;

namespace AIXRTests;

#region VisionCapture Tests

[TestFixture]
public class VisionCaptureTests
{
    private VisionCapture _capture = null!;

    [SetUp]
    public void SetUp()
    {
        _capture = new VisionCapture(jpegQuality: 80);
    }

    // AC4: WebCamTexture frame captured and encoded as JPEG (quality 80)
    [Test]
    public void Default_JPEG_Quality_Is_80()
    {
        Assert.That(_capture.JpegQuality, Is.EqualTo(80));
    }

    [Test]
    public void CaptureFrame_Returns_JPEG_Bytes()
    {
        // Simulate a 4x4 pixel frame (RGBA)
        var pixels = new Color32[16];
        for (int i = 0; i < pixels.Length; i++)
            pixels[i] = new Color32(255, 0, 0, 255);

        var result = _capture.CaptureFrame(pixels, 4, 4);

        Assert.That(result, Is.Not.Null);
        Assert.That(result.Length, Is.GreaterThan(0));
    }

    // AC5: Image sent as-is -- no quality check, no preprocessing
    [Test]
    public void CaptureFrame_No_Quality_Check()
    {
        // All-black image (simulating very dark/degraded image -- EC-2)
        var pixels = new Color32[16];
        for (int i = 0; i < pixels.Length; i++)
            pixels[i] = new Color32(0, 0, 0, 255);

        var result = _capture.CaptureFrame(pixels, 4, 4);

        // Should still return bytes, no rejection
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Length, Is.GreaterThan(0));
    }

    [Test]
    public void CaptureFrame_Empty_Pixels_Returns_Empty()
    {
        var result = _capture.CaptureFrame(new Color32[0], 0, 0);
        Assert.That(result, Has.Length.EqualTo(0));
    }

    [Test]
    public void IsCapturing_Initially_False()
    {
        Assert.That(_capture.IsCapturing, Is.False);
    }

    [Test]
    public void StartCapture_Sets_IsCapturing()
    {
        _capture.StartCapture();
        Assert.That(_capture.IsCapturing, Is.True);
    }

    [Test]
    public void StopCapture_Clears_IsCapturing()
    {
        _capture.StartCapture();
        _capture.StopCapture();
        Assert.That(_capture.IsCapturing, Is.False);
    }
}

#endregion

#region ViewfinderOverlay Tests

[TestFixture]
public class ViewfinderOverlayTests
{
    private ViewfinderOverlay _overlay = null!;

    [SetUp]
    public void SetUp()
    {
        _overlay = new ViewfinderOverlay();
    }

    // AC2: On trigger: crosshair + green corner brackets appear
    [Test]
    public void Initial_State_Is_Hidden()
    {
        Assert.That(_overlay.IsVisible, Is.False);
        Assert.That(_overlay.State, Is.EqualTo(ViewfinderState.Hidden));
    }

    [Test]
    public void Show_Sets_Aiming_State()
    {
        _overlay.Show();
        Assert.That(_overlay.IsVisible, Is.True);
        Assert.That(_overlay.State, Is.EqualTo(ViewfinderState.Aiming));
    }

    // AC3: After 0.5s hold: capture fires, brief white flash
    [Test]
    public void Hold_Duration_Required_Is_Half_Second()
    {
        Assert.That(ViewfinderOverlay.HoldDuration, Is.EqualTo(0.5f));
    }

    [Test]
    public void UpdateHold_Incomplete_Stays_Aiming()
    {
        _overlay.Show();
        bool captured = _overlay.UpdateHold(0.3f); // less than 0.5s
        Assert.That(captured, Is.False);
        Assert.That(_overlay.State, Is.EqualTo(ViewfinderState.Aiming));
    }

    [Test]
    public void UpdateHold_Complete_Triggers_Capture()
    {
        _overlay.Show();
        bool captured = _overlay.UpdateHold(0.5f);
        Assert.That(captured, Is.True);
        Assert.That(_overlay.State, Is.EqualTo(ViewfinderState.Flash));
    }

    [Test]
    public void Flash_Duration_Is_100ms()
    {
        Assert.That(ViewfinderOverlay.FlashDuration, Is.EqualTo(0.1f));
    }

    [Test]
    public void Hide_Returns_To_Hidden()
    {
        _overlay.Show();
        _overlay.Hide();
        Assert.That(_overlay.IsVisible, Is.False);
        Assert.That(_overlay.State, Is.EqualTo(ViewfinderState.Hidden));
    }

    [Test]
    public void Hold_Progress_Percentage()
    {
        _overlay.Show();
        _overlay.UpdateHold(0.25f);
        Assert.That(_overlay.HoldProgress, Is.EqualTo(0.5f).Within(0.01f)); // 0.25/0.5 = 50%
    }

    [Test]
    public void Reset_Clears_Hold_Progress()
    {
        _overlay.Show();
        _overlay.UpdateHold(0.3f);
        _overlay.Reset();
        Assert.That(_overlay.HoldProgress, Is.EqualTo(0f));
        Assert.That(_overlay.State, Is.EqualTo(ViewfinderState.Hidden));
    }
}

#endregion

#region VisionResponsePanel Tests

[TestFixture]
public class VisionResponsePanelTests
{
    private VisionResponsePanel _panel = null!;

    [SetUp]
    public void SetUp()
    {
        _panel = new VisionResponsePanel();
    }

    // AC7: VLM response: text displayed as floating panel above incarnation
    [Test]
    public void Initially_Not_Visible()
    {
        Assert.That(_panel.IsVisible, Is.False);
    }

    [Test]
    public void Show_Displays_Text()
    {
        _panel.Show("The image shows a red ball.");
        Assert.That(_panel.IsVisible, Is.True);
        Assert.That(_panel.Text, Is.EqualTo("The image shows a red ball."));
    }

    // AC7: auto-dismiss after 10s
    [Test]
    public void Auto_Dismiss_Duration_Is_10_Seconds()
    {
        Assert.That(VisionResponsePanel.AutoDismissDuration, Is.EqualTo(10f));
    }

    [Test]
    public void Update_Before_Timeout_Stays_Visible()
    {
        _panel.Show("Some text");
        bool dismissed = _panel.Update(5f); // 5s elapsed
        Assert.That(dismissed, Is.False);
        Assert.That(_panel.IsVisible, Is.True);
    }

    [Test]
    public void Update_After_Timeout_Auto_Dismisses()
    {
        _panel.Show("Some text");
        bool dismissed = _panel.Update(10f); // 10s elapsed
        Assert.That(dismissed, Is.True);
        Assert.That(_panel.IsVisible, Is.False);
    }

    // AC7: or on tap
    [Test]
    public void Dismiss_Hides_Panel()
    {
        _panel.Show("Text");
        _panel.Dismiss();
        Assert.That(_panel.IsVisible, Is.False);
    }

    [Test]
    public void Elapsed_Time_Tracked()
    {
        _panel.Show("Text");
        _panel.Update(3.5f);
        Assert.That(_panel.ElapsedTime, Is.EqualTo(3.5f).Within(0.01f));
    }

    // EC-2: VLM quality comment IS the response -- no filtering
    [Test]
    public void Degraded_Image_Response_Displayed_As_Is()
    {
        string vlmResponse = "The image is too dark to analyze";
        _panel.Show(vlmResponse);
        Assert.That(_panel.Text, Is.EqualTo(vlmResponse));
        Assert.That(_panel.IsVisible, Is.True);
    }
}

#endregion

#region VisionPipeline Tests

[TestFixture]
public class VisionPipelineTests
{
    private VisionPipeline _pipeline = null!;
    private VisionCapture _capture = null!;
    private FakeVisionProvider _visionProvider = null!;
    private FakeTTSProviderForVision _ttsProvider = null!;
    private ProviderConfig _config = null!;
    private ProviderRegistry _registry = null!;
    private DegradationManager _degradation = null!;
    private string _tempDir = null!;

    [SetUp]
    public void SetUp()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"aixr-vision-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        _config = new ProviderConfig(_tempDir);
        _registry = new ProviderRegistry(_config);
        _degradation = new DegradationManager();
        _capture = new VisionCapture(jpegQuality: 80);

        _visionProvider = new FakeVisionProvider("test-vision");
        _ttsProvider = new FakeTTSProviderForVision("test-tts");

        _registry.Register<IVisionProvider>(BrickType.Vision, SlotType.Cloud1, _visionProvider);
        _registry.Register<ITTSProvider>(BrickType.TTS, SlotType.Cloud1, _ttsProvider);

        _pipeline = new VisionPipeline(_registry, _degradation);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    // AC4+AC5: capture -> VLM -> text + TTS
    [Test]
    public async Task Pipeline_Executes_VLM_And_Returns_Result()
    {
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF }; // fake JPEG
        var result = await _pipeline.ExecuteAsync(jpegBytes, "What do you see?");

        Assert.That(result.Success, Is.True);
        Assert.That(result.VisionResponse, Is.EqualTo("I see a test image."));
    }

    // AC7: Response piped through TTS for voice
    [Test]
    public async Task Pipeline_Generates_TTS_Audio()
    {
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        var result = await _pipeline.ExecuteAsync(jpegBytes, "Describe this.");

        Assert.That(result.AudioClip, Is.Not.Null);
        Assert.That(result.AudioClip!.length, Is.GreaterThan(0));
    }

    // EC-2: degraded image -- no quality check, send as-is
    [Test]
    public async Task Pipeline_Sends_Image_As_Is_No_Quality_Check()
    {
        var jpegBytes = new byte[] { 0x00, 0x00, 0x00 }; // garbage data
        var result = await _pipeline.ExecuteAsync(jpegBytes, "What is this?");

        // Provider still gets called with the raw bytes
        Assert.That(_visionProvider.LastImageBytes, Is.EqualTo(jpegBytes));
        Assert.That(result.Success, Is.True);
    }

    // VLM failure
    [Test]
    public async Task Pipeline_VLM_Failure_Returns_Error()
    {
        _visionProvider.ShouldFail = true;
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        var result = await _pipeline.ExecuteAsync(jpegBytes, "What?");

        Assert.That(result.Success, Is.False);
        Assert.That(result.Error, Is.Not.Null);
    }

    // TTS failure still returns vision response text
    [Test]
    public async Task Pipeline_TTS_Failure_Still_Returns_Text()
    {
        _ttsProvider.ShouldFail = true;
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        var result = await _pipeline.ExecuteAsync(jpegBytes, "Describe.");

        Assert.That(result.VisionResponse, Is.EqualTo("I see a test image."));
        Assert.That(result.AudioClip, Is.Null);
        // Still considered success since we have the text response
        Assert.That(result.Success, Is.True);
    }

    // No vision provider registered
    [Test]
    public async Task Pipeline_No_Vision_Provider_Returns_Error()
    {
        var emptyConfig = new ProviderConfig(_tempDir);
        var emptyRegistry = new ProviderRegistry(emptyConfig);
        var pipeline = new VisionPipeline(emptyRegistry, _degradation);

        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        var result = await pipeline.ExecuteAsync(jpegBytes, "What?");

        Assert.That(result.Success, Is.False);
        Assert.That(result.Error, Does.Contain("Vision"));
    }

    // Vision degraded -- feature disabled
    [Test]
    public async Task Pipeline_Vision_Degraded_Returns_Error()
    {
        _degradation.ActivateDegradation(BrickType.Vision);
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        var result = await _pipeline.ExecuteAsync(jpegBytes, "What?");

        Assert.That(result.Success, Is.False);
        Assert.That(result.Error, Does.Contain("degraded"));
    }

    // EC-3: No timeout -- pipeline continues until completion
    [Test]
    public async Task Pipeline_No_Timeout_On_VLM()
    {
        _visionProvider.DelayMs = 100; // simulate slow VLM
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        var result = await _pipeline.ExecuteAsync(jpegBytes, "Analyze this.");

        // Should still succeed -- no timeout
        Assert.That(result.Success, Is.True);
        Assert.That(result.VisionResponse, Is.EqualTo("I see a test image."));
    }

    // EC-3: Elapsed timer tracking
    [Test]
    public void Processing_State_Events_Fire()
    {
        bool processingStarted = false;
        bool processingEnded = false;

        _pipeline.OnProcessingStarted += () => processingStarted = true;
        _pipeline.OnProcessingEnded += () => processingEnded = true;

        // Execute pipeline
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        _pipeline.ExecuteAsync(jpegBytes, "What?").Wait();

        Assert.That(processingStarted, Is.True);
        Assert.That(processingEnded, Is.True);
    }

    [Test]
    public void IsProcessing_Initially_False()
    {
        Assert.That(_pipeline.IsProcessing, Is.False);
    }
}

#endregion

#region Test Doubles for Epic 4

internal class FakeVisionProvider : IVisionProvider
{
    public string ProviderName { get; }
    public bool ShouldFail { get; set; }
    public int DelayMs { get; set; }
    public byte[]? LastImageBytes { get; private set; }

    public FakeVisionProvider(string name) => ProviderName = name;

    public async Task<string> AnalyzeImageAsync(byte[] imageJpeg, string prompt, System.Threading.CancellationToken ct = default)
    {
        LastImageBytes = imageJpeg;
        if (DelayMs > 0) await Task.Delay(DelayMs, ct);
        if (ShouldFail) throw new Exception("Vision provider failed");
        return "I see a test image.";
    }

    public Task<bool> TestConnectionAsync(System.Threading.CancellationToken ct = default)
        => Task.FromResult(true);
}

internal class FakeTTSProviderForVision : ITTSProvider
{
    public string ProviderName { get; }
    public bool ShouldFail { get; set; }

    public FakeTTSProviderForVision(string name) => ProviderName = name;

    public Task<AudioClip> SynthesizeAsync(string text, System.Threading.CancellationToken ct = default)
    {
        if (ShouldFail) throw new Exception("TTS provider failed");
        return Task.FromResult(new AudioClip { length = 1.0f });
    }

    public Task<bool> TestConnectionAsync(System.Threading.CancellationToken ct = default)
        => Task.FromResult(true);
}

#endregion
