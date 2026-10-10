namespace CurioMap.Api.Contracts;

public record UserStubDto(
    Guid Id,
    string Handle,
    string AvatarId,
    string DisplayName,
    bool IsAuthor);

public record LocationDto(
    string? Country,
    string? Region,
    string? City,
    double? LatFuzzed,
    double? LngFuzzed);

public record BookStubDto(
    Guid Id,
    string Title,
    string Author,
    string? Isbn,
    string? CoverUrl,
    string? Topic = null);

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Limit,
    int Offset);
