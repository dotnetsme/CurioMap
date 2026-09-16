namespace CurioMap.Api.Contracts;

public record BadgeDto(string Kind, DateTime AwardedAt);

public record StreakStatsDto(
    int CurrentStreak,
    int LongestStreak,
    DateTime? LastActivityAt,
    bool ActiveToday,
    int FreezeCount,
    IReadOnlyList<BadgeDto> Badges
);

public record StreakCalendarDto(int Days, IReadOnlyList<string> ActiveDays);

public record CircleStreakStatsDto(
    int CurrentStreak,
    int LongestStreak,
    int FreezeCount,
    DateTime? LastActivityAt,
    bool ActiveToday
);

public record BackfillResultDto(int UsersScanned, int BadgesAwarded);

public record LeaderboardEntryDto(
    Guid UserId,
    string Handle,
    string AvatarId,
    string DisplayName,
    int CurrentStreak,
    int LongestStreak,
    int BadgeCount
);