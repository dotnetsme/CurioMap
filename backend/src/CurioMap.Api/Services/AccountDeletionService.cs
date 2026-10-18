using System.Security.Cryptography;
using CurioMap.Api.Auth;
using CurioMap.Api.Common;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Services;

/// <summary>
/// Permanently removes a reader and what they authored.
///
/// Policy:
///  - Their messages, circle messages, reactions, shelf, ratings, follows, drafts, badges, streaks and
///    sessions are deleted.
///  - Reports they filed are deleted (the reporter column cannot be anonymized).
///  - A conversation they started that other readers replied to is kept and handed to a placeholder
///    "deleted reader" account, so those replies are not destroyed; one nobody else replied to is deleted.
///  - A circle they created passes to its longest-standing other member (promoted to moderator); a circle
///    with no other members is deleted.
/// Foreign keys on messages, circles and reports are NO ACTION, so each step is explicit rather than
/// relying on cascades. Everything runs in one transaction.
/// </summary>
public class AccountDeletionService(
    AppDbContext db,
    PasswordHasher hasher,
    ICacheService cache,
    IOptions<JwtOptions> jwtOptions)
{
    /// <summary>Well-known id of the placeholder account that inherits orphaned conversations.</summary>
    public static readonly Guid DeletedReaderId = Guid.Parse("00000000-0000-0000-0000-00000000de1e");

    public const string DeletedReaderHandle = "deleted_reader";

    /// <summary>Cache key marking a deleted reader, so their still-valid access token is rejected.</summary>
    public static string DeletedMarkerKey(Guid userId) => $"deleted-user:{userId}";

    public async Task DeleteAsync(Guid userId, CancellationToken ct = default)
    {
        // The retrying execution strategy needs the whole transaction as one retriable unit.
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(ct);

            await HandOverOrRemoveCirclesAsync(userId, ct);

            // Circle content.
            await db.CircleReactions.Where(r => r.UserId == userId || r.Message!.AuthorId == userId).ExecuteDeleteAsync(ct);
            await db.CircleMessages.Where(m => m.AuthorId == userId).ExecuteDeleteAsync(ct);
            await db.CircleMemberships.Where(m => m.UserId == userId).ExecuteDeleteAsync(ct);

            // Conversation content.
            await db.MessageReports.Where(r => r.ReporterId == userId || r.Message!.AuthorId == userId).ExecuteDeleteAsync(ct);
            await db.MessageReactions.Where(r => r.Message!.AuthorId == userId).ExecuteDeleteAsync(ct);
            await db.Messages.Where(m => m.AuthorId == userId).ExecuteDeleteAsync(ct);
            await HandOverOrRemoveConversationsAsync(userId, ct);

            // A thread kept under the placeholder only exists for its replies; once the last reply is
            // gone (this reader was the last replier) nothing is left to keep.
            await db.Conversations
                .Where(c => c.CreatedBy == DeletedReaderId && !c.Messages.Any())
                .ExecuteDeleteAsync(ct);

            // Everything else hangs off the user with ON DELETE CASCADE (shelf, ratings, follows,
            // reactions, drafts, badges, streaks, challenges, activity, refresh tokens).
            await db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(ct);

            await tx.CommitAsync(ct);
        });

        // Access tokens are stateless and live for AccessTokenMinutes; without this a deleted reader's
        // token would keep authenticating (and then fail on foreign keys with a 500).
        await cache.SetAsync(DeletedMarkerKey(userId), true, TimeSpan.FromMinutes(jwtOptions.Value.AccessTokenMinutes + 1));
    }

    private async Task HandOverOrRemoveCirclesAsync(Guid userId, CancellationToken ct)
    {
        var owned = await db.ReadingCircles.Where(c => c.CreatedBy == userId).Select(c => c.Id).ToListAsync(ct);
        foreach (var circleId in owned)
        {
            var successor = await db.CircleMemberships
                .Where(m => m.CircleId == circleId && m.UserId != userId)
                .OrderBy(m => m.JoinedAt)
                .FirstOrDefaultAsync(ct);

            if (successor is not null)
            {
                successor.Role = CircleRole.Moderator;
                await db.ReadingCircles.Where(c => c.Id == circleId)
                    .ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedBy, successor.UserId), ct);
                await db.SaveChangesAsync(ct);
                continue;
            }

            await db.CircleReactions.Where(r => r.Message!.CircleId == circleId).ExecuteDeleteAsync(ct);
            await db.CircleMessages.Where(m => m.CircleId == circleId).ExecuteDeleteAsync(ct);
            await db.CircleMemberships.Where(m => m.CircleId == circleId).ExecuteDeleteAsync(ct);
            await db.CircleStreaks.Where(s => s.CircleId == circleId).ExecuteDeleteAsync(ct);
            await db.ReadingCircles.Where(c => c.Id == circleId).ExecuteDeleteAsync(ct);
        }
    }

    private async Task HandOverOrRemoveConversationsAsync(Guid userId, CancellationToken ct)
    {
        var started = await db.Conversations.Where(c => c.CreatedBy == userId).Select(c => c.Id).ToListAsync(ct);
        if (started.Count == 0)
        {
            return;
        }

        var withReplies = await db.Messages
            .Where(m => started.Contains(m.ConversationId))
            .Select(m => m.ConversationId)
            .Distinct()
            .ToListAsync(ct);

        if (withReplies.Count > 0)
        {
            await EnsureDeletedReaderAsync(ct);
            await db.Conversations.Where(c => withReplies.Contains(c.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedBy, DeletedReaderId), ct);
        }

        var empty = started.Except(withReplies).ToList();
        if (empty.Count > 0)
        {
            await db.Conversations.Where(c => empty.Contains(c.Id)).ExecuteDeleteAsync(ct);
        }
    }

    private async Task EnsureDeletedReaderAsync(CancellationToken ct)
    {
        if (await db.Users.AnyAsync(u => u.Id == DeletedReaderId, ct))
        {
            return;
        }

        // The email has no '@', so it can never be registered or logged into; the password is random.
        db.Users.Add(new User
        {
            Id = DeletedReaderId,
            Email = "deleted-reader",
            Handle = DeletedReaderHandle,
            PasswordHash = hasher.Hash(Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))),
            DisplayNameMode = DisplayMode.Pseudonymous,
            BookshelfVisibility = ShelfVisibility.Private,
            LocationVisibility = LocationVisibility.Hidden,
        });
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();
    }
}
