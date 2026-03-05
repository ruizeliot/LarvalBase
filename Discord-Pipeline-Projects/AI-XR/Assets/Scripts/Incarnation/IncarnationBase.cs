using System;
using AIXR.Pipeline;
using UnityEngine;

namespace AIXR.Incarnation
{
    /// <summary>
    /// Abstract base class for all incarnation modes.
    /// Provides state/audio callbacks and position management.
    /// </summary>
    public abstract class IncarnationBase
    {
        public bool IsVisible { get; private set; }
        public ConversationState CurrentState { get; private set; } = ConversationState.Ready;
        public Vector3 Position { get; private set; } = Vector3.zero;
        public Quaternion Rotation { get; private set; } = Quaternion.identity;
        public float Opacity { get; private set; } = 1.0f;

        /// <summary>
        /// The incarnation mode type.
        /// </summary>
        public abstract IncarnationMode Mode { get; }

        /// <summary>
        /// Default positional offset from user (z = forward, y = up).
        /// </summary>
        public virtual Vector3 DefaultOffset => new(0f, 0f, 1.5f);

        public void Show()
        {
            IsVisible = true;
        }

        public void Hide()
        {
            IsVisible = false;
        }

        public void SetOpacity(float opacity)
        {
            Opacity = Math.Clamp(opacity, 0f, 1f);
        }

        /// <summary>
        /// Called when the conversation state changes.
        /// </summary>
        public void OnStateChanged(ConversationState oldState, ConversationState newState)
        {
            CurrentState = newState;
            HandleStateChange(newState);
        }

        /// <summary>
        /// Called with current audio amplitude [0-1] during playback.
        /// </summary>
        public void OnAudioAmplitude(float amplitude)
        {
            HandleAudioAmplitude(amplitude);
        }

        /// <summary>
        /// Set the incarnation's world position and rotation.
        /// </summary>
        public void SetPosition(Vector3 position, Quaternion rotation)
        {
            Position = position;
            Rotation = rotation;
        }

        /// <summary>
        /// Subclass-specific state change handling.
        /// </summary>
        protected abstract void HandleStateChange(ConversationState newState);

        /// <summary>
        /// Subclass-specific audio amplitude handling.
        /// </summary>
        protected abstract void HandleAudioAmplitude(float amplitude);
    }
}
