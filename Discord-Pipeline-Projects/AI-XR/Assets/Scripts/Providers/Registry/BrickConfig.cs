using System;

namespace AIXR.Providers.Registry
{
    [Serializable]
    public class BrickConfig
    {
        public SlotType ActiveSlot = SlotType.Cloud1;
        public bool RetryEnabled = false;
        public SlotConfig Cloud1 = new();
        public SlotConfig Cloud2 = new();
        public SlotConfig Local = new();

        public SlotConfig GetSlot(SlotType slot)
        {
            return slot switch
            {
                SlotType.Cloud1 => Cloud1,
                SlotType.Cloud2 => Cloud2,
                SlotType.Local => Local,
                _ => throw new ArgumentOutOfRangeException(nameof(slot))
            };
        }
    }
}
