using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

namespace AIXR.Providers
{
    public interface ITTSProvider : IProvider
    {
        Task<AudioClip> SynthesizeAsync(string text, CancellationToken ct = default);
    }
}
