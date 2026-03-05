using System;
using UnityEngine;

namespace AIXR.XR
{
    public struct AnchorData
    {
        public Vector3 Position;
        public Quaternion Rotation;

        public AnchorData(Vector3 position, Quaternion rotation)
        {
            Position = position;
            Rotation = rotation;
        }
    }

    /// <summary>
    /// Manages spatial anchors for incarnation placement.
    /// Wraps OVRSpatialAnchor save/load for cross-session persistence.
    /// </summary>
    public class SpatialAnchorManager
    {
        private AnchorData? _savedAnchor;

        public bool HasSavedAnchor => _savedAnchor.HasValue;
        public Vector3 SavedPosition => _savedAnchor?.Position ?? Vector3.zero;
        public Quaternion SavedRotation => _savedAnchor?.Rotation ?? Quaternion.identity;

        public event Action<Vector3, Quaternion>? OnAnchorSaved;

        public void SaveAnchor(Vector3 position, Quaternion rotation)
        {
            _savedAnchor = new AnchorData(position, rotation);
            OnAnchorSaved?.Invoke(position, rotation);
        }

        public AnchorData? LoadAnchor()
        {
            return _savedAnchor;
        }

        public void ClearAnchor()
        {
            _savedAnchor = null;
        }
    }
}
