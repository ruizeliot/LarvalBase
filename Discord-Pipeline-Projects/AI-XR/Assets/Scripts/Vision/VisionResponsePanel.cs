namespace AIXR.Vision
{
    /// <summary>
    /// Floating text panel above incarnation that displays VLM response.
    /// Auto-dismisses after 10 seconds or on tap.
    /// </summary>
    public class VisionResponsePanel
    {
        /// <summary>
        /// Auto-dismiss duration in seconds.
        /// </summary>
        public const float AutoDismissDuration = 10f;

        public bool IsVisible { get; private set; }
        public string Text { get; private set; } = "";
        public float ElapsedTime { get; private set; }

        /// <summary>
        /// Show the panel with VLM response text.
        /// No filtering -- VLM quality comments displayed as-is (EC-2).
        /// </summary>
        public void Show(string text)
        {
            Text = text;
            IsVisible = true;
            ElapsedTime = 0f;
        }

        /// <summary>
        /// Update elapsed time. Returns true if auto-dismissed.
        /// </summary>
        public bool Update(float deltaTime)
        {
            if (!IsVisible) return false;

            ElapsedTime += deltaTime;
            if (ElapsedTime >= AutoDismissDuration)
            {
                IsVisible = false;
                return true;
            }
            return false;
        }

        /// <summary>
        /// Manually dismiss the panel (on tap).
        /// </summary>
        public void Dismiss()
        {
            IsVisible = false;
        }
    }
}
