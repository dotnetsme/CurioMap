using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CurioMap.Api.Common;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Services.Email;

public class ResendEmailSender(HttpClient httpClient, IOptions<EmailOptions> options, ILogger<ResendEmailSender> logger) : IEmailSender
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task SendEmailAsync(string to, string subject, string htmlContent, CancellationToken ct = default)
    {
        var config = options.Value;
        var apiKey = config.Resend.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Resend API key is not configured.");
        }

        var payload = new
        {
            from = $"{config.FromName} <{config.FromEmail}>",
            to = new[] { to },
            subject,
            html = htmlContent,
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        try
        {
            using var response = await httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                logger.LogError("Resend API failed with status {StatusCode}: {Response}", response.StatusCode, errorBody);
                response.EnsureSuccessStatusCode();
            }

            logger.LogInformation("Email sent successfully via Resend to {Recipient}", to);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Failed to send email via Resend to {Recipient}", to);
            throw;
        }
    }
}
