using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace AIXR.Providers.Registry
{
    /// <summary>
    /// Manages provider configuration for all 4 bricks.
    /// Persists to StreamingAssets/ai-xr-config.json.
    /// </summary>
    [System.Serializable]
    public class ProviderConfig
    {
        private const string ConfigFileName = "ai-xr-config.json";

        public BrickConfig STT = new();
        public BrickConfig LLM = new();
        public BrickConfig TTS = new();
        public BrickConfig Vision = new();

        [NonSerialized] private string _basePath;

        public ProviderConfig() : this(Application.streamingAssetsPath) { }

        public ProviderConfig(string basePath)
        {
            _basePath = basePath;
            SetDefaults();
        }

        private void SetDefaults()
        {
            // STT defaults
            STT.Cloud1.Provider = "whisper";
            STT.Cloud2.Provider = "deepgram";
            STT.Local.Provider = "whisper_cpp";

            // LLM defaults
            LLM.Cloud1.Provider = "openai";
            LLM.Cloud2.Provider = "claude";
            LLM.Local.Provider = "llama_cpp";

            // TTS defaults
            TTS.Cloud1.Provider = "elevenlabs";
            TTS.Cloud2.Provider = "openai_tts";
            TTS.Local.Provider = "piper";

            // Vision defaults
            Vision.Cloud1.Provider = "gpt4v";
            Vision.Cloud2.Provider = "claude_vision";
            Vision.Local.Provider = "";
        }

        public BrickType[] GetAllBricks() => new[]
        {
            BrickType.STT, BrickType.LLM, BrickType.TTS, BrickType.Vision
        };

        public BrickConfig GetBrickConfig(BrickType brick)
        {
            return brick switch
            {
                BrickType.STT => STT,
                BrickType.LLM => LLM,
                BrickType.TTS => TTS,
                BrickType.Vision => Vision,
                _ => throw new ArgumentOutOfRangeException(nameof(brick))
            };
        }

        public SlotConfig GetSlotConfig(BrickType brick, SlotType slot)
        {
            return GetBrickConfig(brick).GetSlot(slot);
        }

        public void SetActiveSlot(BrickType brick, SlotType slot)
        {
            GetBrickConfig(brick).ActiveSlot = slot;
        }

        public SlotType GetActiveSlot(BrickType brick)
        {
            return GetBrickConfig(brick).ActiveSlot;
        }

        public void SetRetryEnabled(BrickType brick, bool enabled)
        {
            GetBrickConfig(brick).RetryEnabled = enabled;
        }

        public void UpdateSlotConfig(BrickType brick, SlotType slot, string provider, string endpoint, string apiKey)
        {
            var slotConfig = GetSlotConfig(brick, slot);
            slotConfig.Provider = provider;
            slotConfig.Endpoint = endpoint;
            slotConfig.ApiKey = apiKey;
        }

        public void UpdateSlotStatus(BrickType brick, SlotType slot, ProviderStatus status)
        {
            GetSlotConfig(brick, slot).Status = status;
        }

        public void UpdateSlotLatency(BrickType brick, SlotType slot, int latencyMs)
        {
            GetSlotConfig(brick, slot).LastLatencyMs = latencyMs;
        }

        public void Save()
        {
            if (!Directory.Exists(_basePath))
                Directory.CreateDirectory(_basePath);

            var json = JsonUtility.ToJson(this, true);
            File.WriteAllText(Path.Combine(_basePath, ConfigFileName), json);
        }

        public void Load()
        {
            var path = Path.Combine(_basePath, ConfigFileName);
            if (!File.Exists(path)) return;

            var json = File.ReadAllText(path);
            JsonUtility.FromJsonOverwrite(json, this);
        }

        private string GetConfigPath() => Path.Combine(_basePath, ConfigFileName);
    }
}
