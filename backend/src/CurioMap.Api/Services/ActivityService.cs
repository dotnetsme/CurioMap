using CurioMap.Api.Common;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;

namespace CurioMap.Api.Services;

/// <summary>
/// Appends activity events for the social feed. Events are saved together
/// with the triggering change so the feed never shows phantom activity.
/// </summary>
public class ActivityService(AppDbContext db)
{
    public const string BookshelfAdded = "bookshelf_added";
    public const string ConversationCreated = "conversation_created";
    public const string MessagePosted = "message_posted";
    public const string BadgeEarned = "badge_earned";

    public void RecordBadgeEarned(Guid actorId, BadgeKind kind)
    {
        db.ActivityEvents.Add(new ActivityEvent
        {
            ActorId = actorId,
            Type = BadgeEarned,
            Payload = new Dictionary<string, string>
            {
                ["badge_kind"] = kind.ToString(),
            },
        });
    }

    /// <summary>
    /// Visibility snapshots written to <see cref="ActivityEvent.Visibility"/>. These
    /// deliberately use the API vocabulary (lowercase) because the column is written
    /// by EF only and compared literally by the feed query - unlike the legacy enum
    /// text columns, whose casing drifted between raw-SQL seeds ('public') and EF
    /// enum writes ('Public').
    /// </summary>
    public const string PublicVisibility = "public";

    public const string PrivateVisibility = "private";

    /// <summary>
    /// AGENTS §2.2.4: a shelf entry may only be advertised in a feed when the entry
    /// itself is public AND the reader's whole bookshelf is public.
    /// </summary>
    public static bool IsFeedVisible(User actor, ShelfVisibility entryVisibility) =>
        actor.BookshelfVisibility == ShelfVisibility.Public && entryVisibility == ShelfVisibility.Public;

    /// <summary>
    /// Records a public shelf add. Private adds must never be recorded at all - the
    /// caller gates on <see cref="IsFeedVisible"/>.
    /// </summary>
    public void RecordBookshelfAdded(User actor, Book book, BookStatus status, BookshelfEntry entry)
    {
        db.ActivityEvents.Add(new ActivityEvent
        {
            ActorId = actor.Id,
            Type = BookshelfAdded,
            BookId = book.Id,
            BookshelfEntryId = entry.Id,
            Visibility = entry.Visibility.ToApi(),
            Payload = new Dictionary<string, string>
            {
                ["book_title"] = book.Title,
                ["book_author"] = book.Author,
                ["book_cover"] = book.CoverUrl ?? "",
                ["status"] = status.ToApi(),
            },
        });
    }

    /// <summary>
    /// Keeps shelf activity in step with a visibility/status change on an existing
    /// entry: a flip to private retro-hides (never deletes) the event, and a flip back
    /// to public re-publishes it. Mutates tracked rows only - the caller saves together
    /// with the entry change so the feed never shows phantom activity.
    /// </summary>
    public void SyncBookshelfActivity(User actor, Book book, BookshelfEntry entry, BookStatus status)
    {
        var events = db.ActivityEvents.Where(a => a.BookshelfEntryId == entry.Id).ToList();

        if (!IsFeedVisible(actor, entry.Visibility))
        {
            foreach (var existing in events)
            {
                existing.Visibility = PrivateVisibility;
            }
            return;
        }

        if (events.Count == 0)
        {
            RecordBookshelfAdded(actor, book, status, entry);
            return;
        }

        foreach (var existing in events)
        {
            existing.Visibility = PublicVisibility;
            // Reassign rather than mutate so EF marks the jsonb column modified.
            existing.Payload = new Dictionary<string, string>(existing.Payload)
            {
                ["status"] = status.ToApi(),
            };
        }
    }

    /// <summary>
    /// Drops shelf activity for a deleted entry. Leaving the rows behind would resurrect
    /// them in the feed as "entry unknown" events once the FK is set to null.
    /// </summary>
    public void PurgeBookshelfActivity(Guid bookshelfEntryId)
    {
        var events = db.ActivityEvents.Where(a => a.BookshelfEntryId == bookshelfEntryId).ToList();
        db.ActivityEvents.RemoveRange(events);
    }

    public void RecordConversationCreated(User actor, Book? book, Conversation conversation)
    {
        db.ActivityEvents.Add(new ActivityEvent
        {
            ActorId = actor.Id,
            Type = ConversationCreated,
            BookId = book?.Id,
            ConversationId = conversation.Id,
            Payload = new Dictionary<string, string>
            {
                ["conversation_title"] = conversation.Title,
                ["book_title"] = book?.Title ?? "",
                ["book_cover"] = book?.CoverUrl ?? "",
            },
        });
    }

    public void RecordMessagePosted(User actor, Conversation conversation, Book? book, Message message)
    {
        var excerpt = message.Content.Length > 140 ? message.Content[..140] + "…" : message.Content;
        db.ActivityEvents.Add(new ActivityEvent
        {
            ActorId = actor.Id,
            Type = MessagePosted,
            BookId = book?.Id,
            ConversationId = conversation.Id,
            MessageId = message.Id,
            Payload = new Dictionary<string, string>
            {
                ["conversation_title"] = conversation.Title,
                ["message_excerpt"] = excerpt,
                ["book_title"] = book?.Title ?? "",
                ["book_cover"] = book?.CoverUrl ?? "",
            },
        });
    }
}
