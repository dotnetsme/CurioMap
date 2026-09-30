using System.Net;
using CurioMap.Api.Common;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Tests.Auth;

/// <summary>
/// Forwarded IP headers are client-controlled input (AGENTS §5.3). These tests pin the
/// rule that only a peer inside a configured trusted network may speak for the client -
/// otherwise a caller could mint unlimited rate-limit budgets by rotating a header value.
/// </summary>
public class ClientIpResolverTests
{
    private static ClientIpResolver Resolver(params string[] trustedNetworks) =>
        new(Options.Create(new ProxyOptions { TrustedNetworks = trustedNetworks }));

    private static IHeaderDictionary Headers(params (string Key, string Value)[] values)
    {
        var headers = new HeaderDictionary();
        foreach (var (key, value) in values)
        {
            headers[key] = value;
        }
        return headers;
    }

    [Fact]
    public void Trusted_Proxy_Header_Wins_Over_The_Socket_Address()
    {
        var resolver = Resolver("10.0.0.0/8");

        var resolved = resolver.Resolve(IPAddress.Parse("10.0.0.5"), Headers(("Fly-Client-IP", "203.0.113.9")));

        Assert.Equal("203.0.113.9", resolved);
    }

    [Fact]
    public void Untrusted_Peer_Can_Not_Forge_Its_Address()
    {
        var resolver = Resolver("10.0.0.0/8");

        var resolved = resolver.Resolve(
            IPAddress.Parse("198.51.100.7"),
            Headers(("Fly-Client-IP", "1.2.3.4"), ("X-Forwarded-For", "5.6.7.8")));

        Assert.Equal("198.51.100.7", resolved);
    }

    [Fact]
    public void Fly_Private_Network_Peers_Are_Trusted()
    {
        // Default ProxyOptions (Fly.io 6PN): no test override needed.
        var resolver = new ClientIpResolver(Options.Create(new ProxyOptions()));

        var resolved = resolver.Resolve(IPAddress.Parse("fdaa:0:1::2"), Headers(("Fly-Client-IP", "203.0.113.9")));

        Assert.Equal("203.0.113.9", resolved);
    }

    [Fact]
    public void X_Forwarded_For_Uses_The_First_Hop_When_The_Fly_Header_Is_Absent()
    {
        var resolver = Resolver("fdaa::/16");

        var resolved = resolver.Resolve(
            IPAddress.Parse("fdaa:0:1::2"),
            Headers(("X-Forwarded-For", "203.0.113.9, 10.0.0.1")));

        Assert.Equal("203.0.113.9", resolved);
    }

    [Fact]
    public void No_Trusted_Networks_Means_Headers_Are_Ignored()
    {
        var resolver = Resolver();

        var resolved = resolver.Resolve(IPAddress.Parse("203.0.113.9"), Headers(("Fly-Client-IP", "1.2.3.4")));

        Assert.Equal("203.0.113.9", resolved);
    }

    [Theory]
    [InlineData("not-an-ip")]
    [InlineData("")]
    [InlineData("   ")]
    public void A_Usable_Header_Value_Is_Required_To_Override_The_Socket_Address(string headerValue)
    {
        var resolver = Resolver("10.0.0.0/8");

        var resolved = resolver.Resolve(IPAddress.Parse("10.0.0.5"), Headers(("Fly-Client-IP", headerValue)));

        Assert.Equal("10.0.0.5", resolved);
    }

    [Fact]
    public void Missing_Socket_Address_Is_Reported_As_Unknown()
    {
        var resolver = Resolver("10.0.0.0/8");

        Assert.Equal("unknown", resolver.Resolve(null, new HeaderDictionary()));
    }

    [Theory]
    [InlineData("10.0.0.5", true)]
    [InlineData("203.0.113.9", false)]
    public void Is_Trusted_Peer_Decides_Once_For_All_Header_Trust_Call_Sites(string peer, bool expected)
    {
        var resolver = Resolver("10.0.0.0/8");

        Assert.Equal(expected, resolver.IsTrustedPeer(IPAddress.Parse(peer)));
    }
}