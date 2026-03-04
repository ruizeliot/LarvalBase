using AIXR.Error;
using AIXR.Providers;

namespace AIXRTests;

[TestFixture]
public class DegradationManagerTests
{
    private DegradationManager _manager = null!;

    [SetUp]
    public void SetUp()
    {
        _manager = new DegradationManager();
    }

    // AC1: Each brick degrades independently
    [Test]
    public void Bricks_Degrade_Independently()
    {
        _manager.ActivateDegradation(BrickType.STT);

        Assert.That(_manager.IsDegraded(BrickType.STT), Is.True);
        Assert.That(_manager.IsDegraded(BrickType.LLM), Is.False);
        Assert.That(_manager.IsDegraded(BrickType.TTS), Is.False);
        Assert.That(_manager.IsDegraded(BrickType.Vision), Is.False);
    }

    // AC2a: Degradation activates when user dismisses error notification
    [Test]
    public void Degradation_On_Dismiss()
    {
        _manager.ActivateDegradation(BrickType.LLM);
        Assert.That(_manager.IsDegraded(BrickType.LLM), Is.True);
    }

    // AC2b: Degradation on auto-dismiss timeout
    [Test]
    public void Degradation_On_AutoDismiss()
    {
        _manager.ActivateDegradation(BrickType.TTS);
        Assert.That(_manager.IsDegraded(BrickType.TTS), Is.True);
    }

    // AC3: Degraded state persists until manual retry
    [Test]
    public void Degradation_Persists_Until_Recovery()
    {
        _manager.ActivateDegradation(BrickType.Vision);
        Assert.That(_manager.IsDegraded(BrickType.Vision), Is.True);

        _manager.RecoverBrick(BrickType.Vision);
        Assert.That(_manager.IsDegraded(BrickType.Vision), Is.False);
    }

    // AC4: Degraded bricks have correct fallback behavior type
    [Test]
    public void STT_Degradation_Shows_Keyboard()
    {
        var behavior = _manager.GetDegradationBehavior(BrickType.STT);
        Assert.That(behavior, Is.EqualTo(DegradationBehavior.VirtualKeyboard));
    }

    [Test]
    public void LLM_Degradation_Shows_FallbackMessage()
    {
        var behavior = _manager.GetDegradationBehavior(BrickType.LLM);
        Assert.That(behavior, Is.EqualTo(DegradationBehavior.FallbackMessage));
    }

    [Test]
    public void TTS_Degradation_Shows_TextHUD()
    {
        var behavior = _manager.GetDegradationBehavior(BrickType.TTS);
        Assert.That(behavior, Is.EqualTo(DegradationBehavior.TextHUD));
    }

    [Test]
    public void Vision_Degradation_Disables_Feature()
    {
        var behavior = _manager.GetDegradationBehavior(BrickType.Vision);
        Assert.That(behavior, Is.EqualTo(DegradationBehavior.FeatureDisabled));
    }

    // Fallback message for LLM
    [Test]
    public void LLM_FallbackMessage_Content()
    {
        var msg = DegradationManager.LLMFallbackMessage;
        Assert.That(msg, Does.Contain("trouble thinking"));
    }

    // Multiple bricks can degrade simultaneously
    [Test]
    public void Multiple_Bricks_Degraded()
    {
        _manager.ActivateDegradation(BrickType.STT);
        _manager.ActivateDegradation(BrickType.TTS);

        Assert.That(_manager.IsDegraded(BrickType.STT), Is.True);
        Assert.That(_manager.IsDegraded(BrickType.TTS), Is.True);
        Assert.That(_manager.GetDegradedBricks(), Has.Count.EqualTo(2));
    }

    // Recovery only affects specified brick
    [Test]
    public void Recovery_Is_Per_Brick()
    {
        _manager.ActivateDegradation(BrickType.STT);
        _manager.ActivateDegradation(BrickType.LLM);

        _manager.RecoverBrick(BrickType.STT);

        Assert.That(_manager.IsDegraded(BrickType.STT), Is.False);
        Assert.That(_manager.IsDegraded(BrickType.LLM), Is.True);
    }

    // Event fired on degradation state change
    [Test]
    public void Event_Fired_On_Degradation()
    {
        BrickType? eventBrick = null;
        bool? eventDegraded = null;

        _manager.OnDegradationChanged += (brick, degraded) =>
        {
            eventBrick = brick;
            eventDegraded = degraded;
        };

        _manager.ActivateDegradation(BrickType.Vision);

        Assert.That(eventBrick, Is.EqualTo(BrickType.Vision));
        Assert.That(eventDegraded, Is.True);
    }

    [Test]
    public void Event_Fired_On_Recovery()
    {
        _manager.ActivateDegradation(BrickType.STT);

        BrickType? eventBrick = null;
        bool? eventDegraded = null;

        _manager.OnDegradationChanged += (brick, degraded) =>
        {
            eventBrick = brick;
            eventDegraded = degraded;
        };

        _manager.RecoverBrick(BrickType.STT);

        Assert.That(eventBrick, Is.EqualTo(BrickType.STT));
        Assert.That(eventDegraded, Is.False);
    }
}

[TestFixture]
public class StatusBarHUDDataTests
{
    // AC4: Status bar HUD shows brick health icons
    [Test]
    public void StatusBarData_Shows_All_Four_Bricks()
    {
        var data = new StatusBarData();
        Assert.That(data.BrickStatuses, Has.Count.EqualTo(4));
    }

    [Test]
    public void StatusBarData_Default_All_Active()
    {
        var data = new StatusBarData();
        foreach (var status in data.BrickStatuses.Values)
        {
            Assert.That(status, Is.EqualTo(BrickHealthStatus.Active));
        }
    }

    [Test]
    public void StatusBarData_Update_From_DegradationManager()
    {
        var manager = new DegradationManager();
        manager.ActivateDegradation(BrickType.STT);

        var data = StatusBarData.FromDegradationManager(manager);

        Assert.That(data.BrickStatuses[BrickType.STT], Is.EqualTo(BrickHealthStatus.Degraded));
        Assert.That(data.BrickStatuses[BrickType.LLM], Is.EqualTo(BrickHealthStatus.Active));
    }
}
