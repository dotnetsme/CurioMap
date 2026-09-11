using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record ChallengeStatsDto(
    int Year,
    int Target,
    int Finished,
    int Average,
    bool AheadOfPace,
    int Pct
);

public record SetChallengeTargetRequest([Required, Range(1, 1000)] int Target);
