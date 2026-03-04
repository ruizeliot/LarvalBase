using System;
using System.Collections.Generic;
using System.Linq;
using AIXR.Providers;

namespace AIXR.Error
{
    /// <summary>
    /// Manages per-brick degradation state. Each brick degrades independently.
    /// </summary>
    public class DegradationManager
    {
        public const string LLMFallbackMessage =
            "I'm having trouble thinking right now. Please try again in a moment.";

        private readonly Dictionary<BrickType, bool> _degradedBricks = new()
        {
            { BrickType.STT, false },
            { BrickType.LLM, false },
            { BrickType.TTS, false },
            { BrickType.Vision, false }
        };

        private static readonly Dictionary<BrickType, DegradationBehavior> BehaviorMap = new()
        {
            { BrickType.STT, DegradationBehavior.VirtualKeyboard },
            { BrickType.LLM, DegradationBehavior.FallbackMessage },
            { BrickType.TTS, DegradationBehavior.TextHUD },
            { BrickType.Vision, DegradationBehavior.FeatureDisabled }
        };

        /// <summary>
        /// Fired when a brick's degradation state changes. (BrickType, isDegraded)
        /// </summary>
        public event Action<BrickType, bool>? OnDegradationChanged;

        public bool IsDegraded(BrickType brick) => _degradedBricks[brick];

        public void ActivateDegradation(BrickType brick)
        {
            if (_degradedBricks[brick]) return;
            _degradedBricks[brick] = true;
            OnDegradationChanged?.Invoke(brick, true);
        }

        public void RecoverBrick(BrickType brick)
        {
            if (!_degradedBricks[brick]) return;
            _degradedBricks[brick] = false;
            OnDegradationChanged?.Invoke(brick, false);
        }

        public DegradationBehavior GetDegradationBehavior(BrickType brick)
        {
            return BehaviorMap[brick];
        }

        public List<BrickType> GetDegradedBricks()
        {
            return _degradedBricks.Where(kv => kv.Value).Select(kv => kv.Key).ToList();
        }
    }
}
