using System.Threading;
using System.Threading.Tasks;

namespace AIXR.Providers
{
    public interface ISTTProvider : IProvider
    {
        Task<string> TranscribeAsync(byte[] audioWav, CancellationToken ct = default);
    }
}
