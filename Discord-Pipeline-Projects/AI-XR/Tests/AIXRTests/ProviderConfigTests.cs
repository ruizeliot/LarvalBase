using AIXR.Providers;
using AIXR.Providers.Registry;

namespace AIXRTests;

[TestFixture]
public class ProviderConfigTests
{
    private ProviderConfig _config = null!;
    private string _tempDir = null!;

    [SetUp]
    public void SetUp()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"aixr-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _config = new ProviderConfig(_tempDir);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    // AC1: 4 bricks with 3 slots each
    [Test]
    public void Config_Has_Four_Bricks()
    {
        var bricks = _config.GetAllBricks();
        Assert.That(bricks, Has.Length.EqualTo(4));
    }

    [Test]
    [TestCase(BrickType.STT)]
    [TestCase(BrickType.LLM)]
    [TestCase(BrickType.TTS)]
    [TestCase(BrickType.Vision)]
    public void Each_Brick_Has_Three_Slots(BrickType brick)
    {
        var brickConfig = _config.GetBrickConfig(brick);
        Assert.That(brickConfig.Cloud1, Is.Not.Null);
        Assert.That(brickConfig.Cloud2, Is.Not.Null);
        Assert.That(brickConfig.Local, Is.Not.Null);
    }

    // AC2: Each slot has provider name, endpoint, API key, status
    [Test]
    public void Slot_Has_Required_Fields()
    {
        var slot = _config.GetSlotConfig(BrickType.STT, SlotType.Cloud1);
        Assert.That(slot.Provider, Is.Not.Null);
        Assert.That(slot.Endpoint, Is.Not.Null);
        Assert.That(slot.ApiKey, Is.Not.Null);
        Assert.That(slot.Status, Is.EqualTo(ProviderStatus.Unknown));
    }

    // AC3: Only one active slot per brick
    [Test]
    public void Active_Slot_Defaults_To_Cloud1()
    {
        var brickConfig = _config.GetBrickConfig(BrickType.STT);
        Assert.That(brickConfig.ActiveSlot, Is.EqualTo(SlotType.Cloud1));
    }

    [Test]
    public void SetActiveSlot_Changes_Active_Slot()
    {
        _config.SetActiveSlot(BrickType.LLM, SlotType.Local);
        var brickConfig = _config.GetBrickConfig(BrickType.LLM);
        Assert.That(brickConfig.ActiveSlot, Is.EqualTo(SlotType.Local));
    }

    // AC4: Latency tracking per provider
    [Test]
    public void Slot_Tracks_Latency()
    {
        _config.UpdateSlotLatency(BrickType.STT, SlotType.Cloud1, 245);
        var slot = _config.GetSlotConfig(BrickType.STT, SlotType.Cloud1);
        Assert.That(slot.LastLatencyMs, Is.EqualTo(245));
    }

    // AC5: Auto-retry toggle per brick
    [Test]
    public void Retry_Toggle_Per_Brick()
    {
        _config.SetRetryEnabled(BrickType.TTS, true);
        Assert.That(_config.GetBrickConfig(BrickType.TTS).RetryEnabled, Is.True);

        _config.SetRetryEnabled(BrickType.TTS, false);
        Assert.That(_config.GetBrickConfig(BrickType.TTS).RetryEnabled, Is.False);
    }

    // AC6: Config persists to JSON
    [Test]
    public void Config_Saves_And_Loads_From_Json()
    {
        _config.SetActiveSlot(BrickType.LLM, SlotType.Cloud2);
        _config.SetRetryEnabled(BrickType.STT, true);
        _config.UpdateSlotConfig(BrickType.STT, SlotType.Cloud1, "whisper", "https://api.openai.com", "sk-test");

        _config.Save();

        var loaded = new ProviderConfig(_tempDir);
        loaded.Load();

        Assert.That(loaded.GetBrickConfig(BrickType.LLM).ActiveSlot, Is.EqualTo(SlotType.Cloud2));
        Assert.That(loaded.GetBrickConfig(BrickType.STT).RetryEnabled, Is.True);

        var slot = loaded.GetSlotConfig(BrickType.STT, SlotType.Cloud1);
        Assert.That(slot.Provider, Is.EqualTo("whisper"));
        Assert.That(slot.Endpoint, Is.EqualTo("https://api.openai.com"));
        Assert.That(slot.ApiKey, Is.EqualTo("sk-test"));
    }

    // AC7: Changes apply immediately (no restart needed)
    [Test]
    public void Config_Changes_Are_Immediate()
    {
        _config.UpdateSlotConfig(BrickType.TTS, SlotType.Local, "piper", "/local/piper", "");
        var slot = _config.GetSlotConfig(BrickType.TTS, SlotType.Local);
        Assert.That(slot.Provider, Is.EqualTo("piper"));
        Assert.That(slot.Endpoint, Is.EqualTo("/local/piper"));
    }

    [Test]
    public void UpdateSlotStatus_Updates_Status()
    {
        _config.UpdateSlotStatus(BrickType.Vision, SlotType.Cloud1, ProviderStatus.Connected);
        var slot = _config.GetSlotConfig(BrickType.Vision, SlotType.Cloud1);
        Assert.That(slot.Status, Is.EqualTo(ProviderStatus.Connected));
    }
}

[TestFixture]
public class ProviderRegistryTests
{
    private ProviderRegistry _registry = null!;
    private ProviderConfig _config = null!;
    private string _tempDir = null!;

    [SetUp]
    public void SetUp()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"aixr-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _config = new ProviderConfig(_tempDir);
        _registry = new ProviderRegistry(_config);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    [Test]
    public void Register_And_Resolve_STT_Provider()
    {
        var provider = new FakeSTTProvider("test-stt");
        _registry.Register<ISTTProvider>(BrickType.STT, SlotType.Cloud1, provider);

        _config.SetActiveSlot(BrickType.STT, SlotType.Cloud1);
        var resolved = _registry.GetActiveProvider<ISTTProvider>(BrickType.STT);

        Assert.That(resolved, Is.Not.Null);
        Assert.That(resolved!.ProviderName, Is.EqualTo("test-stt"));
    }

    [Test]
    public void GetActiveProvider_Returns_Null_When_No_Provider_Registered()
    {
        var resolved = _registry.GetActiveProvider<ILLMProvider>(BrickType.LLM);
        Assert.That(resolved, Is.Null);
    }

    [Test]
    public void Switching_Active_Slot_Changes_Resolved_Provider()
    {
        var cloud1 = new FakeSTTProvider("cloud1-stt");
        var cloud2 = new FakeSTTProvider("cloud2-stt");
        _registry.Register<ISTTProvider>(BrickType.STT, SlotType.Cloud1, cloud1);
        _registry.Register<ISTTProvider>(BrickType.STT, SlotType.Cloud2, cloud2);

        _config.SetActiveSlot(BrickType.STT, SlotType.Cloud1);
        Assert.That(_registry.GetActiveProvider<ISTTProvider>(BrickType.STT)!.ProviderName, Is.EqualTo("cloud1-stt"));

        _config.SetActiveSlot(BrickType.STT, SlotType.Cloud2);
        Assert.That(_registry.GetActiveProvider<ISTTProvider>(BrickType.STT)!.ProviderName, Is.EqualTo("cloud2-stt"));
    }

    [Test]
    public void GetProvider_By_Slot_Returns_Specific_Provider()
    {
        var provider = new FakeSTTProvider("specific");
        _registry.Register<ISTTProvider>(BrickType.STT, SlotType.Local, provider);

        var resolved = _registry.GetProvider<ISTTProvider>(BrickType.STT, SlotType.Local);
        Assert.That(resolved, Is.Not.Null);
        Assert.That(resolved!.ProviderName, Is.EqualTo("specific"));
    }

    // Default providers are registered for known provider names
    [Test]
    public void Config_Default_Provider_Names()
    {
        var stt = _config.GetBrickConfig(BrickType.STT);
        Assert.That(stt.Cloud1.Provider, Is.EqualTo("whisper"));
        Assert.That(stt.Cloud2.Provider, Is.EqualTo("deepgram"));
        Assert.That(stt.Local.Provider, Is.EqualTo("whisper_cpp"));
    }
}

// Test doubles
internal class FakeSTTProvider : ISTTProvider
{
    public string ProviderName { get; }
    public FakeSTTProvider(string name) => ProviderName = name;

    public Task<string> TranscribeAsync(byte[] audioWav, System.Threading.CancellationToken ct = default)
        => Task.FromResult("fake transcript");

    public Task<bool> TestConnectionAsync(System.Threading.CancellationToken ct = default)
        => Task.FromResult(true);
}
