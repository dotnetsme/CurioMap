using CurioMap.Api.Common;

namespace CurioMap.Api.Tests;

public class DbUrlTests
{
    [Fact]
    public void Loopback_Host_Stays_Plaintext_By_Default()
    {
        var cs = DbUrl.ToNpgsql("postgres://curiomap:curiomap@localhost:5433/curiomap");

        Assert.Equal("Host=localhost;Port=5433;Database=curiomap;Username=curiomap;Password=curiomap", cs);
    }

    [Fact]
    public void Remote_Host_Requires_Tls_By_Default()
    {
        var cs = DbUrl.ToNpgsql("postgres://u:p@ep-example.neon.tech/curiomap");

        Assert.Contains("SSL Mode=Require", cs);
    }

    [Theory]
    [InlineData("disable", "SSL Mode=Disable")]
    [InlineData("prefer", "SSL Mode=Prefer")]
    [InlineData("require", "SSL Mode=Require")]
    [InlineData("verify-full", "SSL Mode=Require")]
    public void Explicit_Sslmode_Query_Wins_Over_The_Host_Heuristic(string sslmode, string expected)
    {
        // `postgres` is a non-loopback hostname (the docker compose service) with no TLS.
        var cs = DbUrl.ToNpgsql($"postgres://curiomap:curiomap@postgres:5432/curiomap?sslmode={sslmode}");

        Assert.Contains(expected, cs);
    }

    [Fact]
    public void Key_Value_Connection_Strings_Pass_Through_Untouched()
    {
        const string raw = "Host=db;Database=x;Username=y;Password=z";

        Assert.Equal(raw, DbUrl.ToNpgsql(raw));
    }
}
