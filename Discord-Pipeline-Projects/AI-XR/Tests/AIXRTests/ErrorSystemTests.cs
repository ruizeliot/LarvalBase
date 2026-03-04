using AIXR.Error;
using AIXR.Providers;

namespace AIXRTests;

[TestFixture]
public class ErrorCodeTests
{
    // AC6: Error codes follow pattern {BRICK}_{HTTP_CODE|ERROR_TYPE}
    [Test]
    public void ErrorCode_Timeout_Format()
    {
        var code = ErrorCode.Timeout("STT");
        Assert.That(code.Code, Is.EqualTo("STT_TIMEOUT"));
        Assert.That(code.Brick, Is.EqualTo("STT"));
        Assert.That(code.ErrorType, Is.EqualTo("TIMEOUT"));
    }

    [Test]
    public void ErrorCode_Network_Format()
    {
        var code = ErrorCode.Network("LLM");
        Assert.That(code.Code, Is.EqualTo("LLM_NETWORK"));
    }

    [Test]
    public void ErrorCode_Http_Format()
    {
        var code = ErrorCode.Http("TTS", 500);
        Assert.That(code.Code, Is.EqualTo("TTS_500"));
    }

    [Test]
    public void ErrorCode_Auth_401()
    {
        var code = ErrorCode.Auth("LLM");
        Assert.That(code.Code, Is.EqualTo("LLM_401"));
    }

    [Test]
    public void ErrorCode_RateLimit_429()
    {
        var code = ErrorCode.RateLimit("Vision");
        Assert.That(code.Code, Is.EqualTo("VISION_429"));
    }

    [Test]
    public void ErrorCode_ToString()
    {
        var code = ErrorCode.Timeout("STT");
        Assert.That(code.ToString(), Is.EqualTo("STT_TIMEOUT"));
    }
}

[TestFixture]
public class ErrorNotificationQueueTests
{
    private ErrorNotificationQueue _queue = null!;

    [SetUp]
    public void SetUp()
    {
        _queue = new ErrorNotificationQueue();
    }

    // AC1: On provider failure, notification appears
    [Test]
    public void Enqueue_Adds_Notification()
    {
        var notification = new ErrorNotification(
            ErrorCode.Timeout("STT"), "Connection timed out", "Whisper API");

        _queue.Enqueue(notification);

        Assert.That(_queue.Count, Is.EqualTo(1));
        Assert.That(_queue.Peek()!.ErrorCode.Code, Is.EqualTo("STT_TIMEOUT"));
    }

    // AC2: Notification shows error code, message, provider name
    [Test]
    public void Notification_Has_Required_Fields()
    {
        var notification = new ErrorNotification(
            ErrorCode.Http("LLM", 401), "Unauthorized", "OpenAI GPT");

        Assert.That(notification.ErrorCode.Code, Is.EqualTo("LLM_401"));
        Assert.That(notification.Message, Is.EqualTo("Unauthorized"));
        Assert.That(notification.ProviderName, Is.EqualTo("OpenAI GPT"));
    }

    // AC3: Two actions: Retry and Dismiss
    [Test]
    public void Notification_Has_Retry_And_Dismiss_Actions()
    {
        var notification = new ErrorNotification(
            ErrorCode.Network("TTS"), "Network error", "ElevenLabs");

        bool retried = false;
        bool dismissed = false;

        notification.OnRetry = () => retried = true;
        notification.OnDismiss = () => dismissed = true;

        notification.Retry();
        Assert.That(retried, Is.True);

        notification.Dismiss();
        Assert.That(dismissed, Is.True);
    }

    // AC4: Auto-dismiss after 15 seconds (test the timer tracking)
    [Test]
    public void Notification_Has_AutoDismiss_Timer()
    {
        var notification = new ErrorNotification(
            ErrorCode.Timeout("STT"), "Timeout", "Whisper");

        Assert.That(notification.AutoDismissSeconds, Is.EqualTo(15f));
    }

    [Test]
    public void Notification_SimulateTimeElapsed_Triggers_AutoDismiss()
    {
        var notification = new ErrorNotification(
            ErrorCode.Timeout("STT"), "Timeout", "Whisper");

        bool dismissed = false;
        notification.OnDismiss = () => dismissed = true;

        // Simulate time passing
        notification.UpdateTimer(16f);

        Assert.That(notification.IsExpired, Is.True);
        Assert.That(dismissed, Is.True);
    }

    // AC5: No auto-fallback (system property)
    [Test]
    public void Retry_Uses_Same_Provider()
    {
        var notification = new ErrorNotification(
            ErrorCode.Timeout("STT"), "Timeout", "Whisper");

        string? retriedProvider = null;
        notification.OnRetry = () => retriedProvider = notification.ProviderName;

        notification.Retry();
        Assert.That(retriedProvider, Is.EqualTo("Whisper"));
    }

    // Queue max 3 visible simultaneously (FIFO)
    [Test]
    public void Queue_Max_Three_Visible()
    {
        _queue.Enqueue(new ErrorNotification(ErrorCode.Timeout("STT"), "1", "P1"));
        _queue.Enqueue(new ErrorNotification(ErrorCode.Timeout("LLM"), "2", "P2"));
        _queue.Enqueue(new ErrorNotification(ErrorCode.Timeout("TTS"), "3", "P3"));
        _queue.Enqueue(new ErrorNotification(ErrorCode.Timeout("Vision"), "4", "P4"));

        var visible = _queue.GetVisible();
        Assert.That(visible, Has.Count.EqualTo(3));
    }

    [Test]
    public void Queue_FIFO_Order()
    {
        _queue.Enqueue(new ErrorNotification(ErrorCode.Timeout("STT"), "first", "P1"));
        _queue.Enqueue(new ErrorNotification(ErrorCode.Network("LLM"), "second", "P2"));

        var visible = _queue.GetVisible();
        Assert.That(visible[0].Message, Is.EqualTo("first"));
        Assert.That(visible[1].Message, Is.EqualTo("second"));
    }

    [Test]
    public void Dequeue_Removes_From_Queue()
    {
        var n = new ErrorNotification(ErrorCode.Timeout("STT"), "test", "P1");
        _queue.Enqueue(n);
        _queue.Remove(n);
        Assert.That(_queue.Count, Is.EqualTo(0));
    }
}
