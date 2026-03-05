using System;
using AIXR.Pipeline;
using AIXR.Providers.Registry;
using UnityEngine;

namespace AIXR.Incarnation
{
    /// <summary>
    /// Manages incarnation switching with fade transitions.
    /// Persists selected mode in ProviderConfig.
    /// </summary>
    public class IncarnationManager
    {
        /// <summary>
        /// Fade transition duration in seconds.
        /// </summary>
        public const float FadeDuration = 0.3f;

        private readonly AvatarIncarnation _avatar;
        private readonly OrbeIncarnation _orbe;
        private readonly InvisibleIncarnation _invisible;
        private readonly ProviderConfig _config;

        private IncarnationBase _active;

        /// <summary>
        /// All available incarnation modes.
        /// </summary>
        public IncarnationMode[] AvailableModes => new[]
        {
            IncarnationMode.Avatar,
            IncarnationMode.Orbe,
            IncarnationMode.Invisible
        };

        /// <summary>
        /// The currently active incarnation mode.
        /// </summary>
        public IncarnationMode CurrentMode => _active.Mode;

        /// <summary>
        /// Fired when the incarnation mode changes. (oldMode, newMode)
        /// </summary>
        public event Action<IncarnationMode, IncarnationMode>? OnModeChanged;

        public IncarnationManager(
            AvatarIncarnation avatar,
            OrbeIncarnation orbe,
            InvisibleIncarnation invisible,
            ProviderConfig config)
        {
            _avatar = avatar;
            _orbe = orbe;
            _invisible = invisible;
            _config = config;

            // Load persisted mode from config
            var savedMode = _config.GetIncarnationMode();
            _active = GetIncarnation(savedMode);

            // Hide all, show active
            _avatar.Hide();
            _orbe.Hide();
            _invisible.Hide();
            _active.Show();
        }

        /// <summary>
        /// Switch to a new incarnation mode. No-op if already active.
        /// </summary>
        public void SwitchMode(IncarnationMode mode)
        {
            if (mode == _active.Mode) return;

            var oldMode = _active.Mode;
            _active.Hide();

            _active = GetIncarnation(mode);
            _active.Show();

            // Persist to config
            _config.SetIncarnationMode(mode);
            _config.Save();

            OnModeChanged?.Invoke(oldMode, mode);
        }

        /// <summary>
        /// Forward state changes to the active incarnation.
        /// </summary>
        public void OnStateChanged(ConversationState oldState, ConversationState newState)
        {
            _active.OnStateChanged(oldState, newState);
        }

        /// <summary>
        /// Forward audio amplitude to the active incarnation.
        /// </summary>
        public void OnAudioAmplitude(float amplitude)
        {
            _active.OnAudioAmplitude(amplitude);
        }

        /// <summary>
        /// Forward position to the active incarnation.
        /// </summary>
        public void SetPosition(Vector3 position, Quaternion rotation)
        {
            _active.SetPosition(position, rotation);
        }

        /// <summary>
        /// Get the currently active incarnation instance.
        /// </summary>
        public IncarnationBase GetActiveIncarnation() => _active;

        private IncarnationBase GetIncarnation(IncarnationMode mode)
        {
            return mode switch
            {
                IncarnationMode.Avatar => _avatar,
                IncarnationMode.Orbe => _orbe,
                IncarnationMode.Invisible => _invisible,
                _ => _orbe
            };
        }
    }
}
