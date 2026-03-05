using System;

namespace AIXR.Editor
{
    public enum MCPConnectionStatus
    {
        Disconnected,
        Connected,
        Error
    }

    /// <summary>
    /// Manages unity-mcp package configuration in the Unity Editor.
    /// Editor-only: all usage should be wrapped in #if UNITY_EDITOR guards.
    /// </summary>
    public class MCPEditorSetup
    {
        public const string PackageName = "com.unity.mcp";
        public const bool IsEditorOnly = true;
        private const int DefaultPort = 8080;

        public static readonly string[] SupportedCapabilities = new[]
        {
            "hierarchy_read",
            "hierarchy_write",
            "component_inspection",
            "scene_commands",
            "prefab_instantiation"
        };

        public MCPConnectionStatus ConnectionStatus { get; private set; } = MCPConnectionStatus.Disconnected;
        public int ServerPort { get; private set; } = DefaultPort;

        public event Action<MCPConnectionStatus>? OnConnectionStatusChanged;

        public void SetConnectionStatus(MCPConnectionStatus status)
        {
            ConnectionStatus = status;
            OnConnectionStatusChanged?.Invoke(status);
        }

        public void SetServerPort(int port)
        {
            ServerPort = port;
        }
    }
}
