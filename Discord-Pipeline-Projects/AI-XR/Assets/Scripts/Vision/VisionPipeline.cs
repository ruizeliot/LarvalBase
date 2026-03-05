using System;
using System.Threading.Tasks;
using AIXR.Providers;
using AIXR.Providers.Registry;
using AIXR.Error;
using UnityEngine;

namespace AIXR.Vision
{
    /// <summary>
    /// Result of a vision pipeline execution.
    /// </summary>
    public class VisionPipelineResult
    {
        public bool Success { get; set; }
        public string? VisionResponse { get; set; }
        public AudioClip? AudioClip { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// Orchestrates the vision pipeline: capture -> VLM -> text display + TTS.
    /// No timeout on VLM processing (EC-3).
    /// No client-side image quality filtering (EC-2).
    /// </summary>
    public class VisionPipeline
    {
        private readonly ProviderRegistry _registry;
        private readonly DegradationManager _degradation;

        public bool IsProcessing { get; private set; }

        /// <summary>
        /// Fired when VLM processing begins (for timer display -- EC-3).
        /// </summary>
        public event Action? OnProcessingStarted;

        /// <summary>
        /// Fired when VLM processing completes.
        /// </summary>
        public event Action? OnProcessingEnded;

        public VisionPipeline(ProviderRegistry registry, DegradationManager degradation)
        {
            _registry = registry;
            _degradation = degradation;
        }

        /// <summary>
        /// Execute the vision pipeline: send JPEG to VLM, then pipe response through TTS.
        /// No timeout -- request runs until completion or network failure (EC-3).
        /// </summary>
        public async Task<VisionPipelineResult> ExecuteAsync(byte[] imageJpeg, string prompt)
        {
            var result = new VisionPipelineResult();

            // Check if Vision is degraded (US-3 / EC-1)
            if (_degradation.IsDegraded(BrickType.Vision))
            {
                result.Error = "Vision is degraded -- feature disabled";
                result.Success = false;
                return result;
            }

            try
            {
                IsProcessing = true;
                OnProcessingStarted?.Invoke();

                // Step 1: Send to VLM (no quality check, no timeout)
                var visionProvider = _registry.GetActiveProvider<IVisionProvider>(BrickType.Vision);
                if (visionProvider == null)
                {
                    result.Error = "No Vision provider available";
                    result.Success = false;
                    return result;
                }

                string response = await visionProvider.AnalyzeImageAsync(imageJpeg, prompt);
                result.VisionResponse = response;

                // Step 2: Pipe response through TTS for voice playback
                var ttsProvider = _registry.GetActiveProvider<ITTSProvider>(BrickType.TTS);
                if (ttsProvider != null)
                {
                    try
                    {
                        AudioClip audioClip = await ttsProvider.SynthesizeAsync(response);
                        result.AudioClip = audioClip;
                    }
                    catch
                    {
                        // TTS failure is non-fatal -- text response is still available
                        result.AudioClip = null;
                    }
                }

                result.Success = true;
                return result;
            }
            catch (Exception ex)
            {
                result.Error = ex.Message;
                result.Success = false;
                return result;
            }
            finally
            {
                IsProcessing = false;
                OnProcessingEnded?.Invoke();
            }
        }
    }
}
