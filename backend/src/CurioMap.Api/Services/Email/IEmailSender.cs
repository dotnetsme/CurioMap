namespace CurioMap.Api.Services.Email;

public interface IEmailSender
{
    Task SendEmailAsync(string to, string subject, string htmlContent, CancellationToken ct = default);
}
