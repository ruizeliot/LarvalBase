using System;

namespace AIXR.Editor
{
    public enum KeystoreType
    {
        Debug,
        Release
    }

    public enum BuildState
    {
        Idle,
        Running,
        Complete,
        Failed
    }

    /// <summary>
    /// Manages the build pipeline: MCP Test -> Android Build -> APK Sign -> Quest Deploy.
    /// Editor-only: all usage should be wrapped in #if UNITY_EDITOR guards.
    /// </summary>
    public class BuildAutomation
    {
        public const bool IsEditorOnly = true;

        public static readonly string[] PipelineSteps = new[]
        {
            "MCP Test",
            "Android Build",
            "APK Sign",
            "Quest Deploy"
        };

        public string BuildTarget { get; } = "Android";
        public string Architecture { get; } = "ARM64";
        public string XRPlugin { get; } = "OpenXR";
        public KeystoreType KeystoreType { get; private set; } = KeystoreType.Debug;
        public BuildState CurrentState { get; private set; } = BuildState.Idle;
        public int CurrentStepIndex { get; private set; } = -1;
        public string? LastError { get; private set; }

        public string CurrentStepName =>
            CurrentStepIndex >= 0 && CurrentStepIndex < PipelineSteps.Length
                ? PipelineSteps[CurrentStepIndex]
                : "";

        public event Action<string>? OnStepCompleted;

        public void SetKeystoreType(KeystoreType type)
        {
            KeystoreType = type;
        }

        public void StartPipeline()
        {
            if (CurrentState == BuildState.Running) return;
            CurrentState = BuildState.Running;
            CurrentStepIndex = 0;
            LastError = null;
        }

        public void AdvanceStep()
        {
            if (CurrentState != BuildState.Running) return;

            string completedStep = PipelineSteps[CurrentStepIndex];
            CurrentStepIndex++;

            if (CurrentStepIndex >= PipelineSteps.Length)
            {
                CurrentState = BuildState.Complete;
            }

            OnStepCompleted?.Invoke(completedStep);
        }

        public void FailStep(string error)
        {
            if (CurrentState != BuildState.Running) return;
            CurrentState = BuildState.Failed;
            LastError = error;
        }

        public static string GetDeployCommand(string apkPath)
        {
            return $"adb install -r {apkPath}";
        }
    }
}
