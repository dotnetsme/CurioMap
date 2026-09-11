namespace CurioMap.Api.Domain;

public interface IAuditable
{
    DateTime UpdatedAt { get; set; }
}

/// <summary>
/// A registered reader. Anonymous by default; real identity is opt-in and reversible.
/// Never exposes email or exact coordinates publicly.
/// </summary>
public class User : IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string Handle { get; set; } = null!;
    public string AvatarId { get; set; } = "curio-01";
    public DisplayMode DisplayNameMode { get; set; } = DisplayMode.Anonymous;
    public string? RealName { get; set; }
    public string? Bio { get; set; }
    public bool IsAuthor { get; set; }
    public bool IsAdmin { get; set; }

    public Guid? LocationId { get; set; }
    public Location? Location { get; set; }
    public LocationVisibility LocationVisibility { get; set; } = LocationVisibility.RegionCity;
    public ShelfVisibility BookshelfVisibility { get; set; } = ShelfVisibility.Public;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BookshelfEntry> BookshelfEntries { get; set; } = [];

    /// <summary>
    /// Yearly reading challenges (e.g. "read 50 books in 2025").
    /// One per user per year; lazily created on first read.
    /// </summary>
    public ICollection<Challenge> Challenges { get; set; } = [];
}

/// <summary>
/// Coarse location: country/region/city plus a fuzzed coordinate rounded to a ~15km grid.
/// Exact coordinates are never stored.
/// </summary>
public class Location
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Country { get; set; }
    public string? Region { get; set; }
    public string? City { get; set; }
    public double? LatFuzzed { get; set; }
    public double? LngFuzzed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<User> Users { get; set; } = [];
}

/// <summary>
/// Yearly reading challenge — a count goal the user opts into (default 50 books / year).
/// One row per user per year, keyed by (user_id, year).
/// </summary>
public class Challenge : IAuditable
{
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public int Year { get; set; } = DateTime.UtcNow.Year;

    /// <summary>Target books to finish this year (default 50).</summary>
    public int Target { get; set; } = 50;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Social graph edge.</summary>
public class Follow
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FollowerId { get; set; }
    public User? Follower { get; set; }
    public Guid FollowedId { get; set; }
    public User? Followed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Rotating refresh token; only the SHA-256 hash is stored.</summary>
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string TokenHash { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
