using System;

namespace AIXR.XR
{
    public enum PassthroughMode
    {
        Underlay,
        Overlay
    }

    /// <summary>
    /// Manages OVRCameraRig setup, passthrough configuration, and scene initialization.
    /// Scene setup: OVRCameraRig, OVRPassthroughLayer underlay, no skybox, clear alpha=0.
    /// </summary>
    public class XRSetup
    {
        public const string CameraRigName = "OVRCameraRig";

        public bool IsPassthroughEnabled { get; private set; } = true;
        public PassthroughMode PassthroughMode { get; private set; } = PassthroughMode.Underlay;
        public float ClearColorAlpha { get; private set; } = 0f;
        public bool IsInitialized { get; private set; }

        public event Action? OnInitialized;

        public void Initialize()
        {
            IsInitialized = true;
            OnInitialized?.Invoke();
        }
    }
}
