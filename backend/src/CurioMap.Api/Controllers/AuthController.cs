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
    AccountDeletionService accountDeletion,
    IOptions<AdminOptions> adminOptions,
    IOptions<JwtOptions> jwtOptions,
    IWebHostEnvironment env) : ControllerBase
{
    private const string RefreshCookie = "curio_rt";

    /// <summary>Current Terms of Use version — must match docs/terms-of-use.md.</summary>
    public const string CurrentTermsVersion = "1.0";

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        // Consent must be explicit: omitting the field is treated the same as declining.
        if (!request.AcceptTerms)
        {
            throw new AppException(400, "You must accept the Terms of Use to create an account.");
        }

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
            TermsVersion = CurrentTermsVersion,
            TermsAcceptedAt = DateTime.UtcNow,
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
    [EnableRateLimiting("refresh")]
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
        ClearRefreshCookie();
        return Ok(new LogoutResponse(true));
    }

    /// <summary>
    /// Permanently deletes the signed-in reader's account. Requires the current password so a stolen
    /// access token alone cannot erase an account. Returns 403 (not 401) on a wrong password: the web
    /// client treats 401 as "session expired" and would try to refresh instead of showing the error.
    /// </summary>
    [HttpPost("delete-account")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LogoutResponse>> DeleteAccount(DeleteAccountRequest request)
    {
        var userId = me.RequireUserId();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new AppException(404, "User not found.");

        if (!hasher.Verify(request.Password, user.PasswordHash))
        {
            throw new AppException(403, "Password is incorrect.");
        }

        // Never leave the instance without anyone able to moderate.
        if (user.IsAdmin && !await db.Users.AnyAsync(u => u.IsAdmin && u.Id != userId))
        {
            throw new AppException(409, "You are the only administrator. Promote another admin before deleting this account.");
        }

        await accountDeletion.DeleteAsync(userId);
        ClearRefreshCookie();
        return Ok(new LogoutResponse(true));
    }

    /// <summary>
    /// Clears the refresh cookie with the same attributes used when setting it, or the browser keeps
    /// the stale cookie (path/SameSite/Secure mismatch).
    /// </summary>
    private void ClearRefreshCookie() =>
        Response.Cookies.Append(RefreshCookie, string.Empty, new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            Secure = !env.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UnixEpoch,
        });

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<object>> Me()
    {
        var user = await db.Users.Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");
        return Ok(new { user = Mapping.ToAuthUser(user) });
    }

    /// <summary>
    /// Terms-of-Use consent status for the signed-in reader. The frontend calls
    /// this after login to decide whether to show the re-consent gate (legacy
    /// accounts predating consent tracking, or readers who accepted an older
    /// version).
    /// </summary>
    [HttpGet("me/terms")]
    [Authorize]
    public async Task<ActionResult<TermsStatusDto>> MyTerms()
    {
        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");
        return Ok(new TermsStatusDto(
            CurrentTermsVersion,
            user.TermsVersion,
            user.TermsAcceptedAt,
            user.TermsVersion == CurrentTermsVersion));
    }

    /// <summary>
    /// Records acceptance of the current Terms of Use. Used (a) at registration
    /// time implicitly via AcceptTerms, and (b) by the re-consent gate when the
    /// stored version is older than CurrentTermsVersion.
    /// </summary>
    [HttpPost("me/terms/accept")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<TermsStatusDto>> AcceptTerms([FromBody] AcceptTermsRequest? request)
    {
        if (request is null || !request.Accept)
        {
            throw new AppException(400, "Explicit acceptance is required.");
        }

        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");

        user.TermsVersion = CurrentTermsVersion;
        user.TermsAcceptedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new TermsStatusDto(
            CurrentTermsVersion,
            user.TermsVersion,
            user.TermsAcceptedAt,
            true));
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
