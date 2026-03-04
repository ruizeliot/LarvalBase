using System.Threading;
using System.Threading.Tasks;

namespace AIXR.Providers
{
    public interface IVisionProvider : IProvider
    {
        Task<string> AnalyzeImageAsync(byte[] imageJpeg, string prompt, CancellationToken ct = default);
    }
}
