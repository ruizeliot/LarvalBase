using System;
using System.Collections.Generic;

namespace AIXR.Input
{
    /// <summary>
    /// Result of a recording session.
    /// </summary>
    public class RecordingResult
    {
        public float[] Samples { get; }
        public float DurationSeconds { get; }

        public RecordingResult(float[] samples, float durationSeconds)
        {
            Samples = samples;
            DurationSeconds = durationSeconds;
        }

        public static RecordingResult Empty => new(Array.Empty<float>(), 0f);
    }

    /// <summary>
    /// Wraps microphone recording, accumulates PCM samples.
    /// In Unity, uses Microphone.Start/Stop and AudioClip.GetData().
    /// For testing, samples are added manually via AddSamples().
    /// </summary>
    public class MicrophoneInput
    {
        public int SampleRate { get; }
        public int Channels { get; }
        public bool IsRecording { get; private set; }

        private readonly List<float> _buffer = new();

        public MicrophoneInput(int sampleRate = 16000, int channels = 1)
        {
            SampleRate = sampleRate;
            Channels = channels;
        }

        public void StartRecording()
        {
            _buffer.Clear();
            IsRecording = true;
        }

        /// <summary>
        /// Add samples to the recording buffer.
        /// In Unity, called from Update() with Microphone data.
        /// </summary>
        public void AddSamples(float[] samples)
        {
            if (!IsRecording) return;
            _buffer.AddRange(samples);
        }

        /// <summary>
        /// Stop recording and return accumulated samples with duration.
        /// </summary>
        public RecordingResult StopRecording()
        {
            if (!IsRecording)
                return RecordingResult.Empty;

            IsRecording = false;
            var samples = _buffer.ToArray();
            float duration = samples.Length / (float)(SampleRate * Channels);
            return new RecordingResult(samples, duration);
        }
    }
}
