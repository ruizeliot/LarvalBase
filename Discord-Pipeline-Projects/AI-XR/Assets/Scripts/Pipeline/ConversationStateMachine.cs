using System;

namespace AIXR.Pipeline
{
    /// <summary>
    /// 5-state FSM for voice conversation flow.
    /// </summary>
    public enum ConversationState
    {
        Ready,
        Recording,
        Transcribing,
        Thinking,
        Talking
    }

    /// <summary>
    /// Manages conversation state transitions with anti-spam protection.
    /// PTT is only accepted in Ready state. Minimum recording duration: 0.5s.
    /// </summary>
    public class ConversationStateMachine
    {
        private const float MinRecordingDuration = 0.5f;

        public ConversationState CurrentState { get; private set; } = ConversationState.Ready;

        /// <summary>
        /// True when PTT input can be accepted (Ready state only).
        /// </summary>
        public bool CanAcceptInput => CurrentState == ConversationState.Ready;

        /// <summary>
        /// Fired on every state transition. (oldState, newState)
        /// </summary>
        public event Action<ConversationState, ConversationState>? OnStateChanged;

        public void OnPTTPressed()
        {
            if (CurrentState != ConversationState.Ready) return;
            TransitionTo(ConversationState.Recording);
        }

        public void OnPTTReleased(float audioDurationSeconds)
        {
            if (CurrentState != ConversationState.Recording) return;

            if (audioDurationSeconds < MinRecordingDuration)
            {
                TransitionTo(ConversationState.Ready);
            }
            else
            {
                TransitionTo(ConversationState.Transcribing);
            }
        }

        public void OnTranscriptionComplete()
        {
            if (CurrentState != ConversationState.Transcribing) return;
            TransitionTo(ConversationState.Thinking);
        }

        public void OnLLMComplete()
        {
            if (CurrentState != ConversationState.Thinking) return;
            TransitionTo(ConversationState.Talking);
        }

        public void OnPlaybackComplete()
        {
            if (CurrentState != ConversationState.Talking) return;
            TransitionTo(ConversationState.Ready);
        }

        /// <summary>
        /// Reset to Ready on error (any state -> Ready).
        /// </summary>
        public void OnError()
        {
            TransitionTo(ConversationState.Ready);
        }

        private void TransitionTo(ConversationState newState)
        {
            var old = CurrentState;
            CurrentState = newState;
            OnStateChanged?.Invoke(old, newState);
        }
    }
}
