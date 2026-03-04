using System;
using System.Collections.Generic;

namespace AIXR.Providers.Registry
{
    /// <summary>
    /// Factory that resolves provider instances by brick + slot.
    /// Providers are registered at startup and resolved at runtime.
    /// </summary>
    public class ProviderRegistry
    {
        private readonly ProviderConfig _config;
        private readonly Dictionary<string, IProvider> _providers = new();

        public ProviderRegistry(ProviderConfig config)
        {
            _config = config;
        }

        /// <summary>
        /// Register a provider instance for a specific brick and slot.
        /// </summary>
        public void Register<T>(BrickType brick, SlotType slot, T provider) where T : IProvider
        {
            var key = MakeKey(brick, slot);
            _providers[key] = provider;
        }

        /// <summary>
        /// Get the currently active provider for a brick (based on config's active slot).
        /// Returns null if no provider is registered for the active slot.
        /// </summary>
        public T? GetActiveProvider<T>(BrickType brick) where T : class, IProvider
        {
            var activeSlot = _config.GetActiveSlot(brick);
            return GetProvider<T>(brick, activeSlot);
        }

        /// <summary>
        /// Get a specific provider by brick and slot.
        /// Returns null if not registered.
        /// </summary>
        public T? GetProvider<T>(BrickType brick, SlotType slot) where T : class, IProvider
        {
            var key = MakeKey(brick, slot);
            if (_providers.TryGetValue(key, out var provider))
                return provider as T;
            return null;
        }

        /// <summary>
        /// Check if a provider is registered for a specific brick and slot.
        /// </summary>
        public bool HasProvider(BrickType brick, SlotType slot)
        {
            return _providers.ContainsKey(MakeKey(brick, slot));
        }

        private static string MakeKey(BrickType brick, SlotType slot) => $"{brick}:{slot}";
    }
}
