using AIXR.Pipeline;
using UnityEngine;

namespace AIXR.Incarnation
{
    /// <summary>
    /// Animation states for the RPM avatar.
    /// </summary>
    public enum AvatarAnimation
    {
        Idle,
        Talking,
        Thinking
    }

    /// <summary>
    /// Avatar incarnation mode using Ready Player Me .glb models.
    /// Features lip sync via visemes and 3 animation clips.
    /// Positioned 1.5m in front of user at eye height.
    /// </summary>
    public class AvatarIncarnation : IncarnationBase
    {
        public override IncarnationMode Mode => IncarnationMode.Avatar;
        public override Vector3 DefaultOffset => new(0f, 0f, 1.5f);

        /// <summary>
        /// Current animation state based on conversation state.
        /// </summary>
        public AvatarAnimation CurrentAnimation { get; private set; } = AvatarAnimation.Idle;

        /// <summary>
        /// Lip sync amplitude driven by TTS audio output [0-1].
        /// Only active during Talking state.
        /// </summary>
        public float LipSyncAmplitude { get; private set; }

        protected override void HandleStateChange(ConversationState newState)
        {
            CurrentAnimation = newState switch
            {
                ConversationState.Thinking => AvatarAnimation.Thinking,
                ConversationState.Talking => AvatarAnimation.Talking,
                _ => AvatarAnimation.Idle
            };

            // Reset lip sync when not talking
            if (newState != ConversationState.Talking)
                LipSyncAmplitude = 0f;
        }

        protected override void HandleAudioAmplitude(float amplitude)
        {
            // Lip sync only active during Talking state
            LipSyncAmplitude = CurrentState == ConversationState.Talking ? amplitude : 0f;
        }
    }
}
