namespace CurioMap.Api.Common;

public class JwtOptions
{
    public string Secret { get; set; } = "dev-only-secret-change-me-0123456789abcdef0123456789abcdef";
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

public class AdminOptions
{
    /// <summary>Emails listed here are promoted to admin at registration.</summary>
    public string[] Emails { get; set; } = [];
}
