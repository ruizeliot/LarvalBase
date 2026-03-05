namespace AIXR.Vision
{
    /// <summary>
    /// Viewfinder overlay states.
    /// </summary>
    public enum ViewfinderState
    {
        Hidden,
        Aiming,
        Flash
    }

    /// <summary>
    /// Manages the viewfinder overlay UX: crosshair + green corners during aiming,
    /// white flash on capture. Requires 0.5s hold to trigger capture.
    /// </summary>
    public class ViewfinderOverlay
    {
        /// <summary>
        /// Duration in seconds the user must hold to trigger capture.
        /// </summary>
        public const float HoldDuration = 0.5f;

        /// <summary>
        /// Duration of the white flash overlay after capture.
        /// </summary>
        public const float FlashDuration = 0.1f;

        public bool IsVisible { get; private set; }
        public ViewfinderState State { get; private set; } = ViewfinderState.Hidden;

        /// <summary>
        /// Current hold progress [0-1]. 1.0 = capture triggered.
        /// </summary>
        public float HoldProgress { get; private set; }

        private float _holdElapsed;

        /// <summary>
        /// Show the viewfinder overlay (crosshair + green corners).
        /// </summary>
        public void Show()
        {
            IsVisible = true;
            State = ViewfinderState.Aiming;
            _holdElapsed = 0f;
            HoldProgress = 0f;
        }

        /// <summary>
        /// Hide the viewfinder overlay.
        /// </summary>
        public void Hide()
        {
            IsVisible = false;
            State = ViewfinderState.Hidden;
            _holdElapsed = 0f;
            HoldProgress = 0f;
        }

        /// <summary>
        /// Update hold timer. Returns true when capture is triggered (hold >= 0.5s).
        /// </summary>
        public bool UpdateHold(float totalHoldTime)
        {
            if (State != ViewfinderState.Aiming) return false;

            _holdElapsed = totalHoldTime;
            HoldProgress = _holdElapsed / HoldDuration;

            if (_holdElapsed >= HoldDuration)
            {
                State = ViewfinderState.Flash;
                HoldProgress = 1f;
                return true;
            }

            return false;
        }

        /// <summary>
        /// Reset to hidden state and clear hold progress.
        /// </summary>
        public void Reset()
        {
            IsVisible = false;
            State = ViewfinderState.Hidden;
            _holdElapsed = 0f;
            HoldProgress = 0f;
        }
    }
}
