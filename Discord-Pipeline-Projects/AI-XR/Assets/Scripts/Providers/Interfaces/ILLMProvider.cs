using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace AIXR.Providers
{
    public interface ILLMProvider : IProvider
    {
        Task<string> CompleteAsync(List<ConversationMessage> messages, CancellationToken ct = default);
    }

    public class ConversationMessage
    {
        public string Role { get; set; } = "";
        public string Content { get; set; } = "";
        public long Timestamp { get; set; }
    }
}
