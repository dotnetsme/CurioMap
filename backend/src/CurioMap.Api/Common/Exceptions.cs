using Microsoft.AspNetCore.Diagnostics;

namespace CurioMap.Api.Common;

/// <summary>Domain exception mapped to ProblemDetails by AppExceptionHandler.</summary>
public class AppException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

public class AppExceptionHandler(ILogger<AppExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not AppException appException)
        {
            logger.LogError(exception, "Unhandled exception on {Path}", context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(
                new { type = "about:blank", title = "An unexpected error occurred.", status = 500 },
                cancellationToken);
            return true;
        }

        context.Response.StatusCode = appException.Status;
        await context.Response.WriteAsJsonAsync(
            new { type = "about:blank", title = appException.Message, status = appException.Status },
            cancellationToken);
        return true;
    }
}
