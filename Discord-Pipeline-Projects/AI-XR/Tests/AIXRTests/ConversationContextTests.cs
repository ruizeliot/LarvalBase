using AIXR.Pipeline;
using AIXR.Providers;

namespace AIXRTests;

[TestFixture]
public class ConversationContextTests
{
    private ConversationContext _context = null!;

    [SetUp]
    public void SetUp()
    {
        _context = new ConversationContext();
    }

    // AC1: Sliding window of N=10 message pairs by default
    [Test]
    public void Default_Window_Size_Is_10()
    {
        Assert.That(_context.WindowSize, Is.EqualTo(10));
    }

    [Test]
    public void Window_Returns_Last_N_Pairs()
    {
        // Add 12 pairs (24 messages) — window should return last 10 pairs (20 messages)
        for (int i = 0; i < 12; i++)
        {
            _context.AddMessage("user", $"question {i}");
            _context.AddMessage("assistant", $"answer {i}");
        }

        var windowed = _context.GetWindowedMessages();
        // 20 messages in window (10 pairs)
        Assert.That(windowed.Count, Is.EqualTo(20));
        // First windowed message should be pair index 2 (skipped 0, 1)
        Assert.That(windowed[0].Content, Is.EqualTo("question 2"));
    }

    [Test]
    public void Window_Includes_All_When_Under_Limit()
    {
        _context.AddMessage("user", "hello");
        _context.AddMessage("assistant", "hi");

        var windowed = _context.GetWindowedMessages();
        Assert.That(windowed.Count, Is.EqualTo(2));
    }

    // AC2: N configurable in settings (range 1-50)
    [Test]
    public void Window_Size_Configurable()
    {
        _context.WindowSize = 5;
        Assert.That(_context.WindowSize, Is.EqualTo(5));
    }

    [Test]
    public void Window_Size_Clamped_To_Min_1()
    {
        _context.WindowSize = 0;
        Assert.That(_context.WindowSize, Is.EqualTo(1));
    }

    [Test]
    public void Window_Size_Clamped_To_Max_50()
    {
        _context.WindowSize = 100;
        Assert.That(_context.WindowSize, Is.EqualTo(50));
    }

    [Test]
    public void Changing_Window_Size_Affects_Returned_Messages()
    {
        for (int i = 0; i < 10; i++)
        {
            _context.AddMessage("user", $"q{i}");
            _context.AddMessage("assistant", $"a{i}");
        }

        _context.WindowSize = 3;
        var windowed = _context.GetWindowedMessages();
        Assert.That(windowed.Count, Is.EqualTo(6)); // 3 pairs = 6 messages
        Assert.That(windowed[0].Content, Is.EqualTo("q7")); // last 3 pairs start at index 7
    }

    // AC3: Messages outside window NOT sent to LLM
    [Test]
    public void Messages_Outside_Window_Excluded()
    {
        _context.WindowSize = 2;
        for (int i = 0; i < 5; i++)
        {
            _context.AddMessage("user", $"q{i}");
            _context.AddMessage("assistant", $"a{i}");
        }

        var windowed = _context.GetWindowedMessages();
        // Only 2 pairs (4 messages)
        Assert.That(windowed.Count, Is.EqualTo(4));
        // Should not contain early messages
        Assert.That(windowed.All(m => m.Content != "q0"), Is.True);
        Assert.That(windowed.All(m => m.Content != "q1"), Is.True);
        Assert.That(windowed.All(m => m.Content != "q2"), Is.True);
    }

    // AC4: Conversation history available (all messages for display)
    [Test]
    public void GetAllMessages_Returns_Full_History()
    {
        for (int i = 0; i < 15; i++)
        {
            _context.AddMessage("user", $"q{i}");
            _context.AddMessage("assistant", $"a{i}");
        }

        var all = _context.GetAllMessages();
        Assert.That(all.Count, Is.EqualTo(30));
    }

    // AC5: Messages outside window appear faded (IsInWindow check)
    [Test]
    public void IsInWindow_Returns_True_For_Recent_Messages()
    {
        _context.WindowSize = 2;
        for (int i = 0; i < 5; i++)
        {
            _context.AddMessage("user", $"q{i}");
            _context.AddMessage("assistant", $"a{i}");
        }

        // 10 total messages, window = 2 pairs = 4 messages => window starts at index 6
        Assert.That(_context.IsInWindow(0), Is.False); // old
        Assert.That(_context.IsInWindow(5), Is.False); // old
        Assert.That(_context.IsInWindow(6), Is.True);  // in window
        Assert.That(_context.IsInWindow(9), Is.True);  // in window
    }

    [Test]
    public void IsInWindow_All_True_When_Under_Limit()
    {
        _context.AddMessage("user", "hello");
        _context.AddMessage("assistant", "hi");

        Assert.That(_context.IsInWindow(0), Is.True);
        Assert.That(_context.IsInWindow(1), Is.True);
    }

    // AC6: History NOT persisted between sessions (cleared on restart)
    [Test]
    public void Clear_Removes_All_Messages()
    {
        _context.AddMessage("user", "test");
        _context.AddMessage("assistant", "response");

        _context.Clear();

        Assert.That(_context.MessageCount, Is.EqualTo(0));
        Assert.That(_context.GetAllMessages(), Has.Count.EqualTo(0));
    }

    [Test]
    public void Clear_Preserves_System_Prompt()
    {
        _context.SetSystemPrompt("You are helpful.");
        _context.AddMessage("user", "test");

        _context.Clear();

        var windowed = _context.GetWindowedMessages();
        Assert.That(windowed.Count, Is.EqualTo(1));
        Assert.That(windowed[0].Role, Is.EqualTo("system"));
        Assert.That(windowed[0].Content, Is.EqualTo("You are helpful."));
    }

    // AC7: System prompt always included (slot 0, never evicted)
    [Test]
    public void System_Prompt_Always_First_In_Window()
    {
        _context.SetSystemPrompt("You are an AI assistant.");

        for (int i = 0; i < 20; i++)
        {
            _context.AddMessage("user", $"q{i}");
            _context.AddMessage("assistant", $"a{i}");
        }

        var windowed = _context.GetWindowedMessages();
        Assert.That(windowed[0].Role, Is.EqualTo("system"));
        Assert.That(windowed[0].Content, Is.EqualTo("You are an AI assistant."));
    }

    [Test]
    public void System_Prompt_Not_Evicted_By_Window()
    {
        _context.SetSystemPrompt("System prompt here.");
        _context.WindowSize = 1;

        for (int i = 0; i < 10; i++)
        {
            _context.AddMessage("user", $"q{i}");
            _context.AddMessage("assistant", $"a{i}");
        }

        var windowed = _context.GetWindowedMessages();
        // 1 system + 2 messages (1 pair)
        Assert.That(windowed.Count, Is.EqualTo(3));
        Assert.That(windowed[0].Role, Is.EqualTo("system"));
    }

    // Message structure
    [Test]
    public void Messages_Have_Timestamp()
    {
        _context.AddMessage("user", "hello");
        var messages = _context.GetAllMessages();
        Assert.That(messages[0].Timestamp, Is.GreaterThan(0));
    }

    [Test]
    public void Messages_Have_Role_And_Content()
    {
        _context.AddMessage("user", "hello");
        _context.AddMessage("assistant", "hi there");

        var messages = _context.GetAllMessages();
        Assert.That(messages[0].Role, Is.EqualTo("user"));
        Assert.That(messages[0].Content, Is.EqualTo("hello"));
        Assert.That(messages[1].Role, Is.EqualTo("assistant"));
        Assert.That(messages[1].Content, Is.EqualTo("hi there"));
    }

    // MessageCount and TotalCount
    [Test]
    public void MessageCount_Excludes_System_Prompt()
    {
        _context.SetSystemPrompt("system");
        _context.AddMessage("user", "hello");

        Assert.That(_context.MessageCount, Is.EqualTo(1));
        Assert.That(_context.TotalCount, Is.EqualTo(2));
    }

    // Edge: empty context
    [Test]
    public void Empty_Context_Returns_Empty_Window()
    {
        var windowed = _context.GetWindowedMessages();
        Assert.That(windowed, Has.Count.EqualTo(0));
    }

    [Test]
    public void Empty_Context_With_System_Prompt_Returns_Just_Prompt()
    {
        _context.SetSystemPrompt("Hello system.");
        var windowed = _context.GetWindowedMessages();
        Assert.That(windowed, Has.Count.EqualTo(1));
        Assert.That(windowed[0].Role, Is.EqualTo("system"));
    }
}
