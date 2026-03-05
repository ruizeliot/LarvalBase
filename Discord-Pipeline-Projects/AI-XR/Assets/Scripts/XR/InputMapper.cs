using System;
using System.Collections.Generic;

namespace AIXR.XR
{
    public enum ControllerButton
    {
        RightTrigger,
        A,
        Grip,
        LeftThumbstickClick,
        B
    }

    public enum HandGesture
    {
        Pinch,
        OpenPalm,
        GrabFist
    }

    public enum InputAction
    {
        None,
        PushToTalk,
        VisionCapture,
        GrabIncarnation,
        ToggleSettings,
        ToggleHistory
    }

    /// <summary>
    /// Unified input mapper: controller buttons + hand gestures -> actions.
    /// Maps both controller and hand gesture inputs to a unified action system.
    /// </summary>
    public class InputMapper
    {
        private static readonly Dictionary<ControllerButton, InputAction> ControllerMap = new()
        {
            { ControllerButton.RightTrigger, InputAction.PushToTalk },
            { ControllerButton.A, InputAction.VisionCapture },
            { ControllerButton.Grip, InputAction.GrabIncarnation },
            { ControllerButton.LeftThumbstickClick, InputAction.ToggleSettings },
            { ControllerButton.B, InputAction.ToggleHistory }
        };

        private static readonly Dictionary<HandGesture, InputAction> GestureMap = new()
        {
            { HandGesture.Pinch, InputAction.PushToTalk },
            { HandGesture.OpenPalm, InputAction.VisionCapture },
            { HandGesture.GrabFist, InputAction.GrabIncarnation }
        };

        /// <summary>
        /// Fired when an input action is triggered. (action, isDown)
        /// </summary>
        public event Action<InputAction, bool>? OnActionTriggered;

        public InputAction GetControllerAction(ControllerButton button)
        {
            return ControllerMap.TryGetValue(button, out var action) ? action : InputAction.None;
        }

        public InputAction GetGestureAction(HandGesture gesture)
        {
            return GestureMap.TryGetValue(gesture, out var action) ? action : InputAction.None;
        }

        public void SimulateControllerInput(ControllerButton button, bool isDown)
        {
            var action = GetControllerAction(button);
            if (action == InputAction.None) return;
            OnActionTriggered?.Invoke(action, isDown);
        }

        public void SimulateGestureInput(HandGesture gesture, bool isDown)
        {
            var action = GetGestureAction(gesture);
            if (action == InputAction.None) return;
            OnActionTriggered?.Invoke(action, isDown);
        }
    }
}
