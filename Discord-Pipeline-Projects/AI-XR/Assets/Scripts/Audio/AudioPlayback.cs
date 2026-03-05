using System;
using UnityEngine;

namespace AIXR.Audio
{
    /// <summary>
    /// Manages TTS audio playback and reports amplitude for visual feedback.
    /// In Unity, this wraps an AudioSource component.
    /// </summary>
    public class AudioPlayback
    {
        public bool IsPlaying { get; private set; }

        /// <summary>
        /// Fired when audio playback finishes.
        /// </summary>
        public event Action? OnPlaybackComplete;

        /// <summary>
        /// Fired each frame with current audio amplitude [0-1].
        /// </summary>
        public event Action<float>? OnAmplitude;

        private AudioClip? _currentClip;

        public void Play(AudioClip clip)
        {
            _currentClip = clip;
            IsPlaying = true;
        }

        public void Stop()
        {
            IsPlaying = false;
            _currentClip = null;
        }

        /// <summary>
        /// Call to simulate playback completion (in tests or when AudioSource.isPlaying becomes false).
        /// </summary>
        public void SimulateComplete()
        {
            IsPlaying = false;
            _currentClip = null;
            OnPlaybackComplete?.Invoke();
        }

        /// <summary>
        /// Report current audio amplitude for visual feedback.
        /// In Unity, computed from AudioSource output data.
        /// </summary>
        public void ReportAmplitude(float amplitude)
        {
            OnAmplitude?.Invoke(amplitude);
        }
    }
}
