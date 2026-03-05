using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AIXR.Providers;
using AIXR.Providers.Registry;
using AIXR.Error;
using UnityEngine;

namespace AIXR.Pipeline
{
    /// <summary>
    /// Result of a full voice pipeline execution.
    /// </summary>
    public class PipelineResult
    {
        public bool Success { get; set; }
        public string? Transcript { get; set; }
        public string? Response { get; set; }
        public AudioClip? AudioClip { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// Orchestrates the sequential STT -> LLM -> TTS voice pipeline.
    /// Drives the ConversationStateMachine through state transitions.
    /// </summary>
    public class VoicePipeline
    {
        private readonly ConversationStateMachine _fsm;
        private readonly ProviderRegistry _registry;
        private readonly DegradationManager _degradation;
        private readonly ConversationContext? _context;

        public VoicePipeline(
            ConversationStateMachine fsm,
            ProviderRegistry registry,
            DegradationManager degradation,
            ConversationContext? context = null)
        {
            _fsm = fsm;
            _registry = registry;
            _degradation = degradation;
            _context = context;
        }

        /// <summary>
        /// Execute the full voice pipeline: STT -> LLM -> TTS.
        /// Expects the FSM to be in Transcribing state (or transitions it).
        /// </summary>
        public async Task<PipelineResult> ExecuteAsync(byte[] audioWav)
        {
            var result = new PipelineResult();

            try
            {
                // Step 1: STT
                var sttProvider = _registry.GetActiveProvider<ISTTProvider>(BrickType.STT);
                if (sttProvider == null)
                {
                    result.Error = "No STT provider available";
                    _fsm.OnError();
                    return result;
                }

                string transcript = await sttProvider.TranscribeAsync(audioWav);
                result.Transcript = transcript;

                // Transition: Transcribing -> Thinking
                _fsm.OnTranscriptionComplete();

                // Step 2: LLM
                var llmProvider = _registry.GetActiveProvider<ILLMProvider>(BrickType.LLM);
                if (llmProvider == null)
                {
                    result.Error = "No LLM provider available";
                    _fsm.OnError();
                    return result;
                }

                // Build messages list
                List<ConversationMessage> messages;
                if (_context != null)
                {
                    _context.AddMessage("user", transcript);
                    messages = _context.GetWindowedMessages();
                }
                else
                {
                    messages = new List<ConversationMessage>
                    {
                        new() { Role = "user", Content = transcript }
                    };
                }

                string response = await llmProvider.CompleteAsync(messages);
                result.Response = response;

                // Add assistant response to context
                _context?.AddMessage("assistant", response);

                // Transition: Thinking -> Talking
                _fsm.OnLLMComplete();

                // Step 3: TTS
                var ttsProvider = _registry.GetActiveProvider<ITTSProvider>(BrickType.TTS);
                if (ttsProvider == null)
                {
                    result.Error = "No TTS provider available";
                    _fsm.OnError();
                    return result;
                }

                AudioClip audioClip = await ttsProvider.SynthesizeAsync(response);
                result.AudioClip = audioClip;
                result.Success = true;

                return result;
            }
            catch (Exception ex)
            {
                result.Error = ex.Message;
                result.Success = false;
                _fsm.OnError();
                return result;
            }
        }
    }
}
