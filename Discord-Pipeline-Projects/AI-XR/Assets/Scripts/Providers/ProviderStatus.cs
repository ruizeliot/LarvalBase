namespace AIXR.Providers
{
    /// <summary>
    /// Connection status for a provider slot.
    /// </summary>
    public enum ProviderStatus
    {
        Unknown,    // Gray — not tested yet
        Connected,  // Green — last test succeeded
        Error       // Red — last test failed
    }
}
