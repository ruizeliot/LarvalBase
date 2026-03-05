using System;
using UnityEngine;

namespace AIXR.XR
{
    public enum PlacementState
    {
        Idle,
        Placing,
        Confirmed
    }

    /// <summary>
    /// First-launch placement flow: user points and taps to place incarnation.
    /// Subsequent launches auto-restore from saved spatial anchor.
    /// </summary>
    public class PlacementFlow
    {
        private readonly SpatialAnchorManager _anchorManager;

        public PlacementState CurrentState { get; private set; } = PlacementState.Idle;
        public Vector3 PreviewPosition { get; private set; } = Vector3.zero;
        public Quaternion PreviewRotation { get; private set; } = Quaternion.identity;
        public bool IsFirstLaunch => !_anchorManager.HasSavedAnchor;
        public bool ShowPreviewIndicator => CurrentState == PlacementState.Placing;

        public event Action<Vector3, Quaternion>? OnPlacementConfirmed;

        public PlacementFlow(SpatialAnchorManager anchorManager)
        {
            _anchorManager = anchorManager;
        }

        public void StartPlacement()
        {
            CurrentState = PlacementState.Placing;
        }

        public void UpdatePreview(Vector3 position, Quaternion rotation)
        {
            if (CurrentState != PlacementState.Placing) return;
            PreviewPosition = position;
            PreviewRotation = rotation;
        }

        public void ConfirmPlacement()
        {
            if (CurrentState != PlacementState.Placing) return;

            _anchorManager.SaveAnchor(PreviewPosition, PreviewRotation);
            CurrentState = PlacementState.Confirmed;
            OnPlacementConfirmed?.Invoke(PreviewPosition, PreviewRotation);
        }

        public void CancelPlacement()
        {
            if (CurrentState != PlacementState.Placing) return;
            CurrentState = PlacementState.Idle;
            PreviewPosition = Vector3.zero;
            PreviewRotation = Quaternion.identity;
        }
    }
}
