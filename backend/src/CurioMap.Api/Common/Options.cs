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
