using System;

namespace AIXR.Error
{
    /// <summary>
    /// Represents a single error notification with Retry/Dismiss actions.
    /// In Unity, this data drives the ErrorNotificationPanel prefab.
    /// </summary>
    public class ErrorNotification
    {
        public ErrorCode ErrorCode { get; }
        public string Message { get; }
        public string ProviderName { get; }
        public float AutoDismissSeconds { get; } = 15f;
        public bool IsExpired { get; private set; }

        public Action? OnRetry { get; set; }
        public Action? OnDismiss { get; set; }

        private float _elapsedTime;

        public ErrorNotification(ErrorCode errorCode, string message, string providerName)
        {
            ErrorCode = errorCode;
            Message = message;
            ProviderName = providerName;
        }

        public void Retry()
        {
            OnRetry?.Invoke();
        }

        public void Dismiss()
        {
            IsExpired = true;
            OnDismiss?.Invoke();
        }

        /// <summary>
        /// Called each frame (or tick) with delta time. Auto-dismisses after 15s.
        /// </summary>
        public void UpdateTimer(float deltaTime)
        {
            if (IsExpired) return;
            _elapsedTime += deltaTime;
            if (_elapsedTime >= AutoDismissSeconds)
            {
                Dismiss();
            }
        }

        public float RemainingSeconds => Math.Max(0, AutoDismissSeconds - _elapsedTime);
    }
}
