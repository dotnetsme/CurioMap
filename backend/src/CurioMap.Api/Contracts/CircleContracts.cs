using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record CircleMemberDto(
    Guid UserId,
    string Handle,
    string AvatarId,
    string DisplayName,
    bool IsAuthor,
    string Role,
    DateTime JoinedAt);

public record CircleDto(
    Guid Id,
    string Handle,
    string Name,
    string? Description,
    BookStubDto? Book,
    int? MaxMembers,
    DateTime? NextMeetingAt,
    UserStubDto CreatedBy,
    int MemberCount,
    int MessageCount,
    DateTime CreatedAt,
    DateTime LastActivityAt,
    int CurrentStreak = 0,
    int LongestStreak = 0);

public record CircleDetailDto(
    CircleDto Circle,
    IReadOnlyList<CircleMemberDto> Members,
    IReadOnlyList<CircleMessageDto> RecentMessages);

public record CircleMessageDto(
    Guid Id,
    Guid CircleId,
    UserStubDto Author,
    string Content,
    string Status,
    DateTime CreatedAt,
    IReadOnlyList<ReactionSummaryDto> Reactions);

public record CreateCircleRequest(
    [Required, MinLength(3), MaxLength(80)] string Name,
    [MaxLength(500)] string? Description,
    Guid? BookId,
    int? MaxMembers,
    DateTime? NextMeetingAt);

public record CreateCircleMessageRequest(
    [Required, MinLength(1), MaxLength(2000)] string Content);

public record CircleMessagesPage(IReadOnlyList<CircleMessageDto> Items, int Total, int Limit, int Offset);