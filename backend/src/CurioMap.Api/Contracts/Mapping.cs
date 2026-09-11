using CurioMap.Api.Common;
using CurioMap.Api.Domain;

namespace CurioMap.Api.Contracts;

/// <summary>Shared entity → DTO mapping. Location exposure respects privacy settings.</summary>
public static class Mapping
{
    /// <summary>Self-view: full coarse location incl. fuzzed coordinates.</summary>
    public static LocationDto? ToSelfLocation(User user) => user.Location is null
        ? null
        : new LocationDto(user.Location.Country, user.Location.Region, user.Location.City, user.Location.LatFuzzed, user.Location.LngFuzzed);

    /// <summary>Public view: honors location_visibility — never coordinates, never hidden cities.</summary>
    public static LocationDto? ToPublicLocation(User user)
    {
        if (user.Location is null || user.LocationVisibility == LocationVisibility.Hidden)
        {
            return null;
        }

        return user.LocationVisibility == LocationVisibility.Country
            ? new LocationDto(user.Location.Country, null, null, null, null)
            : new LocationDto(user.Location.Country, user.Location.Region, user.Location.City, null, null);
    }

    public static AuthUserDto ToAuthUser(User user) => new(
        user.Id,
        user.Email,
        user.Handle,
        user.AvatarId,
        user.DisplayNameMode.ToApi(),
        DisplayName.Resolve(user.DisplayNameMode, user.RealName, user.Handle),
        user.RealName,
        user.Bio,
        user.IsAdmin,
        user.IsAuthor,
        ToSelfLocation(user),
        user.CreatedAt);

    public static UserStubDto ToStub(User user) => new(
        user.Id,
        user.Handle,
        user.AvatarId,
        DisplayName.Resolve(user.DisplayNameMode, user.RealName, user.Handle),
        user.IsAuthor);

    public static BookStubDto ToStub(Book book) => new(book.Id, book.Title, book.Author, book.Isbn, book.CoverUrl);
}
