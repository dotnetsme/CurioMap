using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record CreateConversationRequest(
    [ Required, MinLength(3), MaxLength(200)] string Title,
    [ Required, MaxLength(20)] string TopicType,
    [ MaxLength(60)] string? PromptKey);

public record ConversationDto(
    Guid Id,
    Guid? BookId,
    Guid? DraftId,
    string TopicType,
    string Title,
    string? PromptKey,
    UserStubDto CreatedBy,
    bool IsArchived,
    int MessageCount,
    DateTime CreatedAt,
    DateTime LastActivityAt,
    BookStubDto? Book);

public record CreateMessageRequest(
    [ Required, MinLength(1), MaxLength(2000)] string Content);

public record ReactionSummaryDto(string Kind, int Count, bool ReactedByMe);

public record MessageDto(
    Guid Id,
    Guid ConversationId,
    UserStubDto Author,
    string Content,
    string Status,
    DateTime CreatedAt,
    IReadOnlyList<ReactionSummaryDto> Reactions);

public record MessagesPage(IReadOnlyList<MessageDto> Items, int Total, int Limit, int Offset);

public record ReportRequest(
    [ Required, MinLength(3), MaxLength(500)] string Reason);

public record ReportCreatedDto(Guid Id, string Status);

public record SetMessageStatusRequest([ Required, MaxLength(20)] string Status);

public record ReactRequest([ Required, MaxLength(20)] string Kind);

public record ReactionResult(IReadOnlyList<ReactionSummaryDto> Reactions);
