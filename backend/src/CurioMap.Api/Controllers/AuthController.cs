using System.ComponentModel.DataAnnotations;
using CurioMap.Api.Auth;
using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(
    AppDbContext db,
    CurrentUser me,
    PasswordHasher hasher,
    JwtTokenService jwt,
    RefreshTokenService refresh,
    HandleGenerator handles,
    IOptions<AdminOptions> adminOptions,
    IOptions<JwtOptions> jwtOptions,
    IWebHostEnvironment env) : ControllerBase
{
    private const string RefreshCookie = "curio_rt";

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var normalized = email.ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email.ToLower() == normalized))
        {
            throw new AppException(409, "An account with this email already exists.");
        }

        var handle = await handles.GenerateUniqueHandleAsync();
        var user = new User
        {
            Email = email,
            Handle = handle,
            PasswordHash = hasher.Hash(request.Password),
            IsAdmin = adminOptions.Value.Emails.Contains(email, StringComparer.OrdinalIgnoreCase),
        };

        var (token, raw) = refresh.Issue(user);
        db.Users.Add(user);
        db.RefreshTokens.Add(token);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new AppException(409, "An account with this email already exists.");
        }

        SetRefreshCookie(raw);
        var (accessToken, expiresIn) = jwt.CreateAccessToken(user);
        return Ok(new AuthResponse(Mapping.ToAuthUser(user), accessToken, expiresIn));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(u => u.Location).FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        if (user is null || !hasher.Verify(request.Password, user.PasswordHash))
        {
            throw new AppException(401, "Invalid email or password.");
        }

        var (token, raw) = refresh.Issue(user);
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();

        SetRefreshCookie(raw);
        var (accessToken, expiresIn) = jwt.CreateAccessToken(user);
        return Ok(new AuthResponse(Mapping.ToAuthUser(user), accessToken, expiresIn));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest? request)
    {
        var raw = Request.Cookies[RefreshCookie] ?? request?.RefreshToken;
        var rotated = await refresh.ValidateAndRotateAsync(raw);
        if (rotated is null)
        {
            throw new AppException(401, "Session expired. Please sign in again.");
        }

        var (rotatedUser, _, rotatedRaw) = rotated.Value;
        SetRefreshCookie(rotatedRaw);
        var (accessToken, expiresIn) = jwt.CreateAccessToken(rotatedUser);
        return Ok(new AuthResponse(Mapping.ToAuthUser(rotatedUser), accessToken, expiresIn));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<ActionResult<LogoutResponse>> Logout([FromBody] RefreshRequest? request)
    {
        var raw = Request.Cookies[RefreshCookie] ?? request?.RefreshToken;
        await refresh.RevokeAsync(raw);
        // Clear with the same cookie attributes used when setting it, or the
        // browser keeps the stale refresh cookie (path/SameSite/Secure mismatch).
        Response.Cookies.Append(RefreshCookie, string.Empty, new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            Secure = !env.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UnixEpoch,
        });
        return Ok(new LogoutResponse(true));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<object>> Me()
    {
        var user = await db.Users.Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");
        return Ok(new { user = Mapping.ToAuthUser(user) });
    }

    private void SetRefreshCookie(string raw)
    {
        Response.Cookies.Append(RefreshCookie, raw, new CookieOptions
        {
            HttpOnly = true,
            Secure = !env.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = TimeSpan.FromDays(jwtOptions.Value.RefreshTokenDays),
            IsEssential = true,
        });
    }
}
