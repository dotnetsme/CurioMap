using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record FollowListDto(IReadOnlyList<UserStubDto> Items, int Total, int Limit, int Offset);

public record FollowResultDto(bool Following);

public record FeedBookDto(Guid Id, string Title, string? CoverUrl);

public record FeedConversationDto(Guid Id, string Title);

public record FeedEventDto(
    Guid Id,
    string Type,
    UserStubDto Actor,
    FeedBookDto? Book,
    FeedConversationDto? Conversation,
    string? MessageExcerpt,
    string? ShelfStatus,
    DateTime CreatedAt);

public record FeedPage(IReadOnlyList<FeedEventDto> Items, int? NextOffset);

public record AdminReportDto(
    Guid Id,
    Guid MessageId,
    Guid ConversationId,
    string MessageContent,
    string MessageStatus,
    UserStubDto Author,
    UserStubDto Reporter,
    string Reason,
    string Status,
    DateTime CreatedAt);

public record ResolveReportRequest([ Required, MaxLength(40)] string Action);

public record ResolveReportResult(bool Success, string Status);
