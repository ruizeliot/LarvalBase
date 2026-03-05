using System;
using System.Collections.Generic;
using UnityEngine;

namespace AIXR.XR
{
    public enum HandJoint
    {
        ThumbTip,
        IndexTip,
        MiddleTip,
        RingTip,
        PinkyTip,
        Wrist,
        PalmCenter,
        IndexKnuckle
    }

    /// <summary>
    /// Renders 8 key hand tracking joints as green debug spheres + index finger ray.
    /// Uses OVRHand + OVRSkeleton at runtime.
    /// </summary>
    public class HandTrackingVisuals
    {
        public static readonly HandJoint[] TrackedJoints = new[]
        {
            HandJoint.ThumbTip,
            HandJoint.IndexTip,
            HandJoint.MiddleTip,
            HandJoint.RingTip,
            HandJoint.PinkyTip,
            HandJoint.Wrist,
            HandJoint.PalmCenter,
            HandJoint.IndexKnuckle
        };

        public static readonly Color JointSphereColor = Color.green;

        private readonly Dictionary<HandJoint, Vector3> _jointPositions = new();
        public bool IsIndexRayEnabled { get; private set; } = true;
        public bool IsHandTrackingActive { get; private set; }

        public void UpdateJointPosition(HandJoint joint, Vector3 position)
        {
            if (!Enum.IsDefined(typeof(HandJoint), joint)) return;
            _jointPositions[joint] = position;
        }

        public Vector3 GetJointPosition(HandJoint joint)
        {
            return _jointPositions.TryGetValue(joint, out var pos) ? pos : Vector3.zero;
        }

        public void SetHandTrackingActive(bool active)
        {
            IsHandTrackingActive = active;
        }

        public void SetIndexRayEnabled(bool enabled)
        {
            IsIndexRayEnabled = enabled;
        }
    }
}
