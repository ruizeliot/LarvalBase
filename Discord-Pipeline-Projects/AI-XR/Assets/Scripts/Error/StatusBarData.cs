using System.Collections.Generic;
using AIXR.Providers;

namespace AIXR.Error
{
    /// <summary>
    /// Data model for the StatusBarHUD. Shows brick health icons.
    /// </summary>
    public class StatusBarData
    {
        public Dictionary<BrickType, BrickHealthStatus> BrickStatuses { get; }

        public StatusBarData()
        {
            BrickStatuses = new Dictionary<BrickType, BrickHealthStatus>
            {
                { BrickType.STT, BrickHealthStatus.Active },
                { BrickType.LLM, BrickHealthStatus.Active },
                { BrickType.TTS, BrickHealthStatus.Active },
                { BrickType.Vision, BrickHealthStatus.Active }
            };
        }

        public static StatusBarData FromDegradationManager(DegradationManager manager)
        {
            var data = new StatusBarData();
            foreach (var brick in new[] { BrickType.STT, BrickType.LLM, BrickType.TTS, BrickType.Vision })
            {
                data.BrickStatuses[brick] = manager.IsDegraded(brick)
                    ? BrickHealthStatus.Degraded
                    : BrickHealthStatus.Active;
            }
            return data;
        }
    }
}
