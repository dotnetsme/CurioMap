using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record UpdateLocationRequest(
    [MaxLength(100)] string? Country,
    [MaxLength(120)] string? Region,
    [MaxLength(120)] string? City);

public record IpGeoDto(string? Country, string Source);

public record RegionStatDto(
    string Country,
    string Region,
    int ActiveReaders,
    double? Lat,
    double? Lng,
    IReadOnlyList<BookStubDto> TopBooks);

public record GlobalDiscoveryDto(IReadOnlyList<RegionStatDto> Regions, int TotalRegions, DateTime GeneratedAt);

public record TopicStatDto(string Topic, int ReaderCount);

public record TopBookDto(Guid Id, string Title, string Author, string? Isbn, string? CoverUrl, int ReaderCount, string? Topic = null);

public record TopBooksDto(string? Country, string? Region, IReadOnlyList<TopBookDto> Books);

public record NearbyReaderDto(UserStubDto User, LocationDto Location, IReadOnlyList<BookStubDto> Books);

public record NearbyDto(string Scope, IReadOnlyList<NearbyReaderDto> Readers);

/// <summary>
/// A single reader on the global map at their fuzzed (~15 km grid) coordinate,
/// with the public books they are reading right now.
/// </summary>
public record MapReaderDto(
    UserStubDto User,
    string? Country,
    string? Region,
    string? City,
    double Lat,
    double Lng,
    IReadOnlyList<BookStubDto> Books);

public record MapReadersDto(
    string? Country,
    string? Region,
    int Total,
    IReadOnlyList<MapReaderDto> Readers);

public record StatsSummaryDto(
    int Readers,
    int Books,
    int Conversations,
    int Messages,
    int ActiveRegions,
    IReadOnlyList<TopBookDto> TopBooks);
