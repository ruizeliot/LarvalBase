namespace AIXR.Error
{
    /// <summary>
    /// Per-brick fallback behavior when provider is unavailable.
    /// </summary>
    public enum DegradationBehavior
    {
        VirtualKeyboard,   // STT: world-space TMP_InputField
        FallbackMessage,   // LLM: pre-recorded message via TTS
        TextHUD,           // TTS: LLM response as floating TextMeshPro
        FeatureDisabled    // Vision: capture button grayed out
    }
}
