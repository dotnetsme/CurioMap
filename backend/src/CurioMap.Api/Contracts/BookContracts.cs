using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record BookDto(
    Guid Id,
    string Title,
    string Author,
    string? Isbn,
    string? CoverUrl,
    string? Description,
    Dictionary<string, string> AffiliateLinks,
    Dictionary<string, string> Metadata,
    int ReadersCount,
    int ConversationsCount,
    double? AverageRating,
    int RatingCount,
    DateTime CreatedAt);

public record SearchResponse(IReadOnlyList<BookDto> Items, int Total, bool FromExternal);

public record ImportBookRequest([Required, MaxLength(20)] string Isbn);
