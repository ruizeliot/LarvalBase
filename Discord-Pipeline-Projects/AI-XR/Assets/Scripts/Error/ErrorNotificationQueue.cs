using System.Collections.Generic;
using System.Linq;

namespace AIXR.Error
{
    /// <summary>
    /// FIFO queue for error notifications. Max 3 visible simultaneously.
    /// </summary>
    public class ErrorNotificationQueue
    {
        private const int MaxVisible = 3;
        private readonly List<ErrorNotification> _notifications = new();

        public int Count => _notifications.Count;

        public void Enqueue(ErrorNotification notification)
        {
            _notifications.Add(notification);
        }

        public ErrorNotification? Peek()
        {
            return _notifications.Count > 0 ? _notifications[0] : null;
        }

        public void Remove(ErrorNotification notification)
        {
            _notifications.Remove(notification);
        }

        /// <summary>
        /// Returns up to MaxVisible (3) notifications in FIFO order.
        /// </summary>
        public List<ErrorNotification> GetVisible()
        {
            return _notifications.Take(MaxVisible).ToList();
        }

        /// <summary>
        /// Remove all expired notifications from the queue.
        /// </summary>
        public void RemoveExpired()
        {
            _notifications.RemoveAll(n => n.IsExpired);
        }

        /// <summary>
        /// Update all notification timers.
        /// </summary>
        public void UpdateTimers(float deltaTime)
        {
            foreach (var n in _notifications.ToList())
            {
                n.UpdateTimer(deltaTime);
            }
            RemoveExpired();
        }
    }
}
