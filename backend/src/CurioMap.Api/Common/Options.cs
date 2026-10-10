namespace CurioMap.Api.Common;

public class JwtOptions
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "curiomap-api";
    public string Audience { get; set; } = "curiomap-web";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 30;
}

public class AffiliateOptions
{
    public string AmazonTag { get; set; } = "curiomap-20";
}

public class OpenLibraryOptions
{
    public bool Enabled { get; set; } = true;
}

public class GoogleBooksOptions
{
    public bool Enabled { get; set; }
    public string ApiKey { get; set; } = string.Empty;
}

public class ConversationOptions
{
    /// <summary>Ephemeral threads: auto-archive after this many days of inactivity.</summary>
    public int AutoArchiveDays { get; set; } = 30;
}

public class SeedOptions
{
    /// <summary>
    /// When true, startup applies demo-reader seed scripts (0013-0014) after the
    /// book catalog. Dev default true. CI sets false. Production MUST be false:
    /// demo readers are fake accounts that must never exist in a real database.
    /// </summary>
    public bool DemoReaders { get; set; } = true;
}

public class AdminOptions
{
    /// <summary>Emails listed here are promoted to admin at registration.</summary>
    public string[] Emails { get; set; } = [];
}

public class ProxyOptions
{
    /// <summary>
    /// CIDR ranges whose peers may speak for the client in forwarded IP headers
    /// (AGENTS §5.3). Defaults to Fly.io's 6PN private network plus loopback: only the
    /// platform proxy (or a process on the same host) can reach the app from those
    /// ranges, so a public caller can never inject a trusted header. Set to an empty
    /// array to trust nobody and always use the socket address.
    /// </summary>
    public string[] TrustedNetworks { get; set; } = ["fdaa::/16", "::1/128", "127.0.0.1/32"];

    /// <summary>Headers consulted, in order, once the peer is trusted.</summary>
    public string[] ClientIpHeaders { get; set; } = ["Fly-Client-IP", "X-Forwarded-For"];
}

public class EmailOptions
{
    public string Provider { get; set; } = "Smtp";
    public string FromEmail { get; set; } = "noreply@curiomap.com";
    public string FromName { get; set; } = "CurioMap";
    public SmtpOptions Smtp { get; set; } = new();
    public ResendOptions Resend { get; set; } = new();
}

public class SmtpOptions
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 2525;
    public bool EnableSsl { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
}

public class ResendOptions
{
    public string ApiKey { get; set; } = string.Empty;
}

