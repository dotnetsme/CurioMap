using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record UpdateProfileRequest(
    string? Handle,
    string? AvatarId,
    string? DisplayNameMode,
    [MaxLength(120)] string? RealName,
    [MaxLength(1000)] string? Bio);

public record SettingsDto(
    string LocationVisibility,
    string BookshelfVisibility,
    LocationDto? Location);

public record UpdateSettingsRequest(string? LocationVisibility, string? BookshelfVisibility);

public record BookshelfSummaryDto(int Reading, int Finished, int Wishlist, int Total);

public record PublicProfileDto(
    Guid Id,
    string Handle,
    string AvatarId,
    string DisplayNameMode,
    string DisplayName,
    string? RealName,
    string? Bio,
    bool IsAuthor,
    LocationDto? Location,
    BookshelfSummaryDto BookshelfSummary,
    int FollowersCount,
    int FollowingCount,
    bool? IsFollowing);
