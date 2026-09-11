using System.ComponentModel.DataAnnotations;

namespace CurioMap.Api.Contracts;

public record RegisterRequest(
    [ Required, EmailAddress, MaxLength(320)] string Email,
    [ Required, MinLength(8), MaxLength(128)] string Password);

public record LoginRequest(
    [ Required, EmailAddress, MaxLength(320)] string Email,
    [ Required, MaxLength(128)] string Password);

public record RefreshRequest(string? RefreshToken);

public record AuthUserDto(
    Guid Id,
    string Email,
    string Handle,
    string AvatarId,
    string DisplayNameMode,
    string DisplayName,
    string? RealName,
    string? Bio,
    bool IsAdmin,
    bool IsAuthor,
    LocationDto? Location,
    DateTime CreatedAt);

public record AuthResponse(AuthUserDto User, string AccessToken, int ExpiresIn);

public record LogoutResponse(bool Success);
