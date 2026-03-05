using System;

namespace AIXR.Input
{
    /// <summary>
    /// PTT input sources.
    /// </summary>
    public enum PTTInputSource
    {
        ControllerTrigger,
        HandPinch
    }

    /// <summary>
    /// Handles Push-to-Talk input from controller trigger and hand pinch gesture.
    /// Provides enable/disable for anti-spam during processing.
    /// </summary>
    public class PTTController
    {
        private bool _enabled = true;
        private bool _isPressed;

        /// <summary>
        /// Fired when PTT is pressed (recording should start).
        /// </summary>
        public event Action? OnPTTPressed;

        /// <summary>
        /// Fired when PTT is released (recording should stop).
        /// </summary>
        public event Action? OnPTTReleased;

        /// <summary>
        /// Enable or disable PTT input. When disabled, all input is ignored (anti-spam).
        /// </summary>
        public void SetEnabled(bool enabled)
        {
            _enabled = enabled;
        }

        /// <summary>
        /// Simulate input from a PTT source. In Unity, called from Update() based on OVRInput/hand tracking.
        /// </summary>
        /// <param name="source">The input source</param>
        /// <param name="isDown">True = pressed, False = released</param>
        public void SimulateInput(PTTInputSource source, bool isDown)
        {
            if (!_enabled) return;

            if (isDown)
            {
                if (_isPressed) return; // ignore duplicate press
                _isPressed = true;
                OnPTTPressed?.Invoke();
            }
            else
            {
                if (!_isPressed) return; // ignore release without press
                _isPressed = false;
                OnPTTReleased?.Invoke();
            }
        }
    }
}
