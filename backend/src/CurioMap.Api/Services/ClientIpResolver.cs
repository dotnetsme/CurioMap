using System.Net;
using System.Net.Sockets;
using CurioMap.Api.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Services;

/// <summary>
/// Resolves the client identity used for rate-limit partitioning (and, later, for
/// trusted proxying).
///
/// Forwarded IP headers are attacker-controlled input, so they are honored only when the
/// socket peer sits inside a configured trusted network (AGENTS §5.3). Everywhere else the
/// socket address wins, which means a spoofed header can neither create nor steal a
/// rate-limit budget - the concrete failure the old inline partition key had, because
/// every production request arrives from the Next.js proxy / fly-proxy address.
/// </summary>
public sealed class ClientIpResolver(IOptions<ProxyOptions> options)
{
    private readonly IPNetwork[] _trustedNetworks = Parse(options.Value.TrustedNetworks);
    private readonly string[] _clientIpHeaders = options.Value.ClientIpHeaders;

    public string Resolve(HttpContext context) =>
        Resolve(context.Connection.RemoteIpAddress, context.Request.Headers);

    public string Resolve(IPAddress? remote, IHeaderDictionary headers)
    {
        if (remote is not null && IsTrusted(remote))
        {
            foreach (var header in _clientIpHeaders)
            {
                if (!headers.TryGetValue(header, out var raw))
                {
                    continue;
                }

                // X-Forwarded-For is a chain: "client, proxy1, proxy2" -> take the client.
                var firstHop = raw.ToString()
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .FirstOrDefault();

                if (IPAddress.TryParse(firstHop, out var parsed))
                {
                    return parsed.ToString();
                }
            }
        }

        // Untrusted peer (or no usable header): the socket address is the only truth.
        return remote?.ToString() ?? "unknown";
    }

    private bool IsTrusted(IPAddress remote)
    {
        foreach (var network in _trustedNetworks)
        {
            if (network.Contains(remote))
            {
                return true;
            }
        }
        return false;
    }

    private static IPNetwork[] Parse(IEnumerable<string> configured)
    {
        var networks = new List<IPNetwork>();
        foreach (var entry in configured)
        {
            if (string.IsNullOrWhiteSpace(entry))
            {
                continue;
            }

            var value = entry.Trim();
            if (IPNetwork.TryParse(value, out var network))
            {
                networks.Add(network);
                continue;
            }

            // A bare address is accepted as an exact-match network.
            if (IPAddress.TryParse(value, out var address))
            {
                networks.Add(new IPNetwork(
                    address,
                    address.AddressFamily == AddressFamily.InterNetwork ? 32 : 128));
            }
        }
        return [.. networks];
    }

    /// <summary>
    /// True when the socket peer sits inside a trusted proxy network. The single place
    /// header trust is decided for all call sites (rate limiting, geo IP hints) so trust
    /// cannot drift between them.
    /// </summary>
    public bool IsTrustedPeer(IPAddress? remote) => remote is not null && IsTrusted(remote);

}