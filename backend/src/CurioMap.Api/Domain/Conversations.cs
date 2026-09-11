namespace CurioMap.Api.Domain;

/// <summary>
/// A short, focused discussion thread. Optionally attached to a book (MVP)
/// or to an author draft (self-publishing foundation).
/// </summary>
public class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? BookId { get; set; }
    public Book? Book { get; set; }
    public Guid? DraftId { get; set; }
    public Draft? Draft { get; set; }
    public TopicType TopicType { get; set; } = TopicType.General;
    public string Title { get; set; } = null!;
    public string? PromptKey { get; set; }
    public Guid CreatedBy { get; set; }
    public User? Creator { get; set; }
    public bool IsArchived { get; set; }
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Message> Messages { get; set; } = [];
}

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConversationId { get; set; }
    public Conversation? Conversation { get; set; }
    public Guid AuthorId { get; set; }
    public User? Author { get; set; }
    public string Content { get; set; } = null!;
    public MessageStatus Status { get; set; } = MessageStatus.Visible;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MessageReaction> Reactions { get; set; } = [];
}

public class MessageReaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MessageId { get; set; }
    public Message? Message { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public ReactionKind Kind { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MessageReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MessageId { get; set; }
    public Message? Message { get; set; }
    public Guid ReporterId { get; set; }
    public User? Reporter { get; set; }
    public string Reason { get; set; } = null!;
    public ReportStatus Status { get; set; } = ReportStatus.Open;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

/// <summary>A reading circle — a group gathering around a book (or topic).</summary>
public class ReadingCircle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Handle { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public Guid? BookId { get; set; }
    public Book? Book { get; set; }
    public Guid CreatedBy { get; set; }
    public User? Creator { get; set; }
    public int? MaxMembers { get; set; }
    public DateTime? NextMeetingAt { get; set; }
    public bool IsArchived { get; set; }
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

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
}
