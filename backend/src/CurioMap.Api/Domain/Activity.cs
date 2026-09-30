namespace CurioMap.Api.Domain;

/// <summary>Feed event emitted on bookshelf/conversation/message activity.</summary>
public class ActivityEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ActorId { get; set; }
    public User? Actor { get; set; }
    public string Type { get; set; } = null!; // bookshelf_added | conversation_created | message_posted
    public Guid? BookId { get; set; }
    public Book? Book { get; set; }
    public Guid? ConversationId { get; set; }
    public Conversation? Conversation { get; set; }
    public Guid? MessageId { get; set; }

    /// <summary>
    /// The shelf entry this event describes (shelf events only). Lets the feed check
    /// the entry's CURRENT visibility instead of trusting a stale snapshot.
    /// </summary>
    public Guid? BookshelfEntryId { get; set; }

    /// <summary>
    /// Visibility snapshot ('public'/'private') taken when the event was written.
    /// Null on non-shelf events and on legacy rows, and null is treated as "not
    /// public" so an unprovable event can never leak a private shelf entry
    /// (AGENTS §2.2.4).
    /// </summary>
    public string? Visibility { get; set; }

    public Dictionary<string, string> Payload { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Author workspace draft (self-publishing foundation — Phase 7).</summary>
public class Draft : IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthorId { get; set; }
    public User? Author { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string Status { get; set; } = "draft"; // draft | review | published
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DraftChapter> Chapters { get; set; } = [];
}

public class DraftChapter : IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DraftId { get; set; }
    public Draft? Draft { get; set; }
    public string Title { get; set; } = null!;
    public string? Content { get; set; }
    public int Position { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
