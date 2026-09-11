namespace CurioMap.Api.Domain;

/// <summary>A book on CurioMap. ISBN drives affiliate links and covers.</summary>
public class Book
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = null!;
    public string Author { get; set; } = null!;
    public string? Isbn { get; set; }
    public string? CoverUrl { get; set; }
    public string? Description { get; set; }

    /// <summary>Curated/overriding affiliate links; runtime service merges computed links on read.</summary>
    public BookAffiliateLinks AffiliateLinks { get; set; } = new();

    /// <summary>Loose metadata (source, pages, year, ...).</summary>
    public Dictionary<string, string> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BookshelfEntry> Entries { get; set; } = [];
    public ICollection<Conversation> Conversations { get; set; } = [];
}

/// <summary>Stored affiliate overrides, mapped to a jsonb column.</summary>
public class BookAffiliateLinks
{
    public string? Amazon { get; set; }
    public string? Bookshop { get; set; }
    public string? Kobo { get; set; }
    public string? Indiebound { get; set; }
    public string? Publisher { get; set; }
}

/// <summary>A user's 1–5 star rating for a book.</summary>
public class Rating : IAuditable
{
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public Guid BookId { get; set; }
    public Book? Book { get; set; }

    /// <summary>1–5 inclusive.</summary>
    public int Value { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A user's relationship with a book.</summary>
public class BookshelfEntry : IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public Guid BookId { get; set; }
    public Book? Book { get; set; }
    public BookStatus Status { get; set; } = BookStatus.Wishlist;
    public ShelfVisibility Visibility { get; set; } = ShelfVisibility.Public;
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
