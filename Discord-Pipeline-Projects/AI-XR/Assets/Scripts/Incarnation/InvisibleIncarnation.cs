using System;
using AIXR.Pipeline;
using UnityEngine;

namespace AIXR.Incarnation
{
    /// <summary>
    /// Invisible incarnation mode: dashed floor circle + monospace HUD text.
    /// Features live transcript and typewriter effect for AI responses.
    /// </summary>
    public class InvisibleIncarnation : IncarnationBase
    {
        public override IncarnationMode Mode => IncarnationMode.Invisible;
        public override Vector3 DefaultOffset => new(0f, 0f, 1.5f);

        /// <summary>
        /// Floor circle diameter in meters (1m per PRD).
        /// </summary>
        public float FloorCircleDiameter => 1.0f;

        /// <summary>
        /// Current HUD text (user transcript or AI response).
        /// </summary>
        public string HUDText { get; private set; } = "";

        /// <summary>
        /// Status text reflecting current conversation state.
        /// </summary>
        public string StatusText { get; private set; } = "READY";

        /// <summary>
        /// Current typewriter text (partial AI response).
        /// </summary>
        public string TypewriterText { get; private set; } = "";

        /// <summary>
        /// Whether the typewriter has finished displaying all text.
        /// </summary>
        public bool IsTypewriterComplete { get; private set; } = true;

        private string _fullTypewriterText = "";
        private int _typewriterIndex;

        /// <summary>
        /// Set user transcript text on the HUD.
        /// </summary>
        public void SetTranscript(string text)
        {
            HUDText = text;
        }

        /// <summary>
        /// Start a typewriter effect for an AI response.
        /// </summary>
        public void StartTypewriter(string fullText)
        {
            _fullTypewriterText = fullText;
            _typewriterIndex = 0;
            TypewriterText = "";
            IsTypewriterComplete = false;
        }

        /// <summary>
        /// Advance the typewriter by a number of characters.
        /// </summary>
        public void AdvanceTypewriter(int characters)
        {
            _typewriterIndex = Math.Min(_typewriterIndex + characters, _fullTypewriterText.Length);
            TypewriterText = _fullTypewriterText[.._typewriterIndex];
            IsTypewriterComplete = _typewriterIndex >= _fullTypewriterText.Length;
        }

        protected override void HandleStateChange(ConversationState newState)
        {
            StatusText = newState switch
            {
                ConversationState.Ready => "READY",
                ConversationState.Recording => "RECORDING",
                ConversationState.Transcribing => "TRANSCRIBING",
                ConversationState.Thinking => "THINKING",
                ConversationState.Talking => "TALKING",
                _ => "READY"
            };
        }

        protected override void HandleAudioAmplitude(float amplitude)
        {
            // Invisible mode has no visual audio feedback
        }
    }
}
