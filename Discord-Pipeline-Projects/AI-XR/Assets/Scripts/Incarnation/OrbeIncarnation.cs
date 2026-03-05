using AIXR.Pipeline;
using UnityEngine;

namespace AIXR.Incarnation
{
    /// <summary>
    /// Orbe incarnation mode: volumetric glowing sphere (~30cm).
    /// 4-color state mapping with glow intensity driven by audio amplitude.
    /// Positioned 1.2m forward, 0.3m above eye height.
    /// </summary>
    public class OrbeIncarnation : IncarnationBase
    {
        // PRD colors: Thinking=#4A9EFF, Speaking=#4AFF7E, Listening=#FFB84A, Idle=#888888
        public static readonly Color ThinkingColor = new(0.29f, 0.62f, 1.00f);   // #4A9EFF
        public static readonly Color SpeakingColor = new(0.29f, 1.00f, 0.49f);   // #4AFF7E
        public static readonly Color ListeningColor = new(1.00f, 0.72f, 0.29f);  // #FFB84A
        public static readonly Color IdleColor = new(0.53f, 0.53f, 0.53f);       // #888888

        private const float BaseGlowIntensity = 0.5f;
        private const float MaxGlowIntensity = 2.0f;

        public override IncarnationMode Mode => IncarnationMode.Orbe;
        public override Vector3 DefaultOffset => new(0f, 0.3f, 1.2f);

        /// <summary>
        /// Sphere diameter in meters (~30cm per PRD).
        /// </summary>
        public float SphereDiameter => 0.3f;

        /// <summary>
        /// Current color based on conversation state.
        /// </summary>
        public Color CurrentColor { get; private set; } = IdleColor;

        /// <summary>
        /// Glow intensity driven by audio amplitude.
        /// </summary>
        public float GlowIntensity { get; private set; } = BaseGlowIntensity;

        protected override void HandleStateChange(ConversationState newState)
        {
            CurrentColor = newState switch
            {
                ConversationState.Thinking => ThinkingColor,
                ConversationState.Talking => SpeakingColor,
                ConversationState.Recording => ListeningColor,
                ConversationState.Transcribing => ListeningColor,
                _ => IdleColor
            };
        }

        protected override void HandleAudioAmplitude(float amplitude)
        {
            GlowIntensity = BaseGlowIntensity + amplitude * (MaxGlowIntensity - BaseGlowIntensity);
        }
    }
}
