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

    public void RecordBookshelfAdded(User actor, Book book, BookStatus status)
    {
        db.ActivityEvents.Add(new ActivityEvent
        {
            ActorId = actor.Id,
            Type = BookshelfAdded,
            BookId = book.Id,
            Payload = new Dictionary<string, string>
            {
                ["book_title"] = book.Title,
                ["book_author"] = book.Author,
                ["book_cover"] = book.CoverUrl ?? "",
                ["status"] = status.ToApi(),
            },
        });
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
