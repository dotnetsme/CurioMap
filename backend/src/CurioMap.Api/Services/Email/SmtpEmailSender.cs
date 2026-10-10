using System.Net;
using System.Net.Mail;
using CurioMap.Api.Common;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Services.Email;

public class SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendEmailAsync(string to, string subject, string htmlContent, CancellationToken ct = default)
    {
        var config = options.Value;
        using var client = new SmtpClient(config.Smtp.Host, config.Smtp.Port)
        {
            EnableSsl = config.Smtp.EnableSsl,
        };

        if (!string.IsNullOrEmpty(config.Smtp.Username) && !string.IsNullOrEmpty(config.Smtp.Password))
        {
            client.Credentials = new NetworkCredential(config.Smtp.Username, config.Smtp.Password);
        }

        using var message = new MailMessage
        {
            From = new MailAddress(config.FromEmail, config.FromName),
            Subject = subject,
            Body = htmlContent,
            IsBodyHtml = true,
        };
        message.To.Add(to);

        try
        {
            await client.SendMailAsync(message, ct);
            logger.LogInformation("Email sent successfully via SMTP to {Recipient}", to);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Failed to send email via SMTP to {Recipient}", to);
            throw;
        }
    }
}
