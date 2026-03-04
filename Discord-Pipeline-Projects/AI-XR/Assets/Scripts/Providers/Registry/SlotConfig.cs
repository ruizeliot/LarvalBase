using System;

namespace AIXR.Providers.Registry
{
    [Serializable]
    public class SlotConfig
    {
        public string Provider = "";
        public string Endpoint = "";
        public string ApiKey = "";
        public string ModelPath = "";
        public ProviderStatus Status = ProviderStatus.Unknown;
        public int LastLatencyMs = -1;
    }
}
