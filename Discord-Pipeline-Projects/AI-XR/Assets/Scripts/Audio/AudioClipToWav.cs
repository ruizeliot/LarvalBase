using System;
using System.IO;

namespace AIXR.Audio
{
    /// <summary>
    /// Converts raw float PCM samples to WAV byte array.
    /// Output format: PCM 16-bit, configurable sample rate, mono/stereo.
    /// </summary>
    public static class AudioClipToWav
    {
        /// <summary>
        /// Convert float samples to WAV byte array.
        /// </summary>
        /// <param name="samples">Raw PCM float samples [-1.0, 1.0]</param>
        /// <param name="channels">Number of channels (1 = mono)</param>
        /// <param name="sampleRate">Sample rate in Hz (e.g. 16000)</param>
        public static byte[] Convert(float[] samples, int channels, int sampleRate)
        {
            int bitsPerSample = 16;
            int byteRate = sampleRate * channels * bitsPerSample / 8;
            int blockAlign = channels * bitsPerSample / 8;
            int dataSize = samples.Length * 2; // 16-bit = 2 bytes per sample

            using var stream = new MemoryStream(44 + dataSize);
            using var writer = new BinaryWriter(stream);

            // RIFF header
            writer.Write(new char[] { 'R', 'I', 'F', 'F' });
            writer.Write(36 + dataSize); // file size - 8
            writer.Write(new char[] { 'W', 'A', 'V', 'E' });

            // fmt sub-chunk
            writer.Write(new char[] { 'f', 'm', 't', ' ' });
            writer.Write(16); // sub-chunk size (PCM)
            writer.Write((short)1); // audio format = PCM
            writer.Write((short)channels);
            writer.Write(sampleRate);
            writer.Write(byteRate);
            writer.Write((short)blockAlign);
            writer.Write((short)bitsPerSample);

            // data sub-chunk
            writer.Write(new char[] { 'd', 'a', 't', 'a' });
            writer.Write(dataSize);

            // Write samples as 16-bit PCM
            for (int i = 0; i < samples.Length; i++)
            {
                float clamped = Math.Max(-1f, Math.Min(1f, samples[i]));
                short pcm16 = (short)(clamped < 0
                    ? clamped * 32768f
                    : clamped * 32767f);
                writer.Write(pcm16);
            }

            return stream.ToArray();
        }
    }
}
