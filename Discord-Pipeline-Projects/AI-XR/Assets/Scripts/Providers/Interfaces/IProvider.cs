using System.Threading;
using System.Threading.Tasks;

namespace AIXR.Providers
{
    /// <summary>
    /// Base interface shared by all provider types.
    /// </summary>
    public interface IProvider
    {
        string ProviderName { get; }
        Task<bool> TestConnectionAsync(CancellationToken ct = default);
    }
}
