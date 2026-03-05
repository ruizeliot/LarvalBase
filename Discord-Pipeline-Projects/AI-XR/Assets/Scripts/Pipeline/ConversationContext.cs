using System;
using System.Collections.Generic;
using System.Linq;
using AIXR.Providers;

namespace AIXR.Pipeline
{
    /// <summary>
    /// Manages conversation history with a sliding window.
    /// System prompt is always at slot 0 and never evicted.
    /// </summary>
    public class ConversationContext
    {
        private const int DefaultWindowSize = 10;
        private const int MinWindowSize = 1;
        private const int MaxWindowSize = 50;

        private readonly List<ConversationMessage> _messages = new();
        private string? _systemPrompt;
        private int _windowSize = DefaultWindowSize;

        /// <summary>
        /// Number of non-system messages in history.
        /// </summary>
        public int MessageCount => _messages.Count;

        /// <summary>
        /// Total messages including system prompt.
        /// </summary>
        public int TotalCount => _messages.Count + (_systemPrompt != null ? 1 : 0);

        /// <summary>
        /// Current window size (number of message pairs).
        /// </summary>
        public int WindowSize
        {
            get => _windowSize;
            set => _windowSize = Math.Clamp(value, MinWindowSize, MaxWindowSize);
        }

        /// <summary>
        /// Set the system prompt (always slot 0, never evicted).
        /// </summary>
        public void SetSystemPrompt(string prompt)
        {
            _systemPrompt = prompt;
        }

        /// <summary>
        /// Add a message to the conversation history.
        /// </summary>
        public void AddMessage(string role, string content)
        {
            _messages.Add(new ConversationMessage
            {
                Role = role,
                Content = content,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
        }

        /// <summary>
        /// Get messages within the current sliding window.
        /// Always includes system prompt (if set) + last N*2 messages.
        /// </summary>
        public List<ConversationMessage> GetWindowedMessages()
        {
            var result = new List<ConversationMessage>();

            // System prompt always first
            if (_systemPrompt != null)
            {
                result.Add(new ConversationMessage
                {
                    Role = "system",
                    Content = _systemPrompt,
                    Timestamp = 0
                });
            }

            // Last N*2 messages (N pairs of user+assistant)
            int maxMessages = _windowSize * 2;
            var windowed = _messages.Count <= maxMessages
                ? _messages
                : _messages.Skip(_messages.Count - maxMessages).ToList();

            result.AddRange(windowed);
            return result;
        }

        /// <summary>
        /// Get all messages (for display, including faded ones outside window).
        /// </summary>
        public List<ConversationMessage> GetAllMessages()
        {
            return new List<ConversationMessage>(_messages);
        }

        /// <summary>
        /// Check if a message at the given index is within the current window.
        /// Used for fading messages outside the window in UI.
        /// </summary>
        public bool IsInWindow(int messageIndex)
        {
            int maxMessages = _windowSize * 2;
            int windowStart = Math.Max(0, _messages.Count - maxMessages);
            return messageIndex >= windowStart;
        }

        /// <summary>
        /// Clear all conversation history (system prompt preserved).
        /// </summary>
        public void Clear()
        {
            _messages.Clear();
        }
    }
}
