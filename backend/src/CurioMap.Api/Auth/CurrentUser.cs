using System.Security.Claims;
using CurioMap.Api.Common;

namespace CurioMap.Api.Auth;

/// <summary>Reads the authenticated principal populated by JWT bearer authentication.</summary>
public class CurrentUser(IHttpContextAccessor accessor)
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var principal = Principal;
            if (principal?.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            var value = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? principal.FindFirstValue("sub");
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public Guid RequireUserId() => UserId
        ?? throw new AppException(StatusCodes.Status401Unauthorized, "Authentication required.");

    public bool IsAuthenticated => UserId is not null;

    public bool IsAdmin => Principal?.FindFirstValue("role") == "admin";
}
