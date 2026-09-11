namespace CurioMap.Api.Domain;

/// <summary>
/// A Reading Circle is a small, intimate book-club style group.
/// Place-adjacent (discoverable on the map), prompted, ephemeral by default.
/// </summary>
public class ReadingCircle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Handle { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public Guid? BookId { get; set; }
    public Book? Book { get; set; }
    public int? MaxMembers { get; set; }
    public DateTime? NextMeetingAt { get; set; }
    public Guid CreatedBy { get; set; }
    public User? Creator { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    public ICollection<CircleMembership> Members { get; set; } = [];
    public ICollection<CircleMessage> Messages { get; set; } = [];
}

public class CircleMembership
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CircleId { get; set; }
    public ReadingCircle? Circle { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public CircleRole Role { get; set; } = CircleRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A message posted inside a Reading Circle. Reuses MessageStatus + ReactionKind.
/// </summary>
public class CircleMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CircleId { get; set; }
    public ReadingCircle? Circle { get; set; }
    public Guid AuthorId { get; set; }
    public User? Author { get; set; }
    public string Content { get; set; } = null!;
    public MessageStatus Status { get; set; } = MessageStatus.Visible;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CircleReaction> Reactions { get; set; } = [];
}

public class CircleReaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MessageId { get; set; }
    public CircleMessage? Message { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public ReactionKind Kind { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}