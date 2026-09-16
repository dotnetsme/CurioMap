using CurioMap.Api.Common;
using CurioMap.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Services;

/// <summary>
/// Hourly background archival for ephemeral conversation threads.
/// Replaces the old GET write side-effect: reads never mutate, this worker
/// flips stale threads to archived on a timer. Skipped when the provider has
/// no relational store (SQLite tests) to keep the suite hermetic.
/// </summary>
public class ConversationArchiver(ILogger<ConversationArchiver> logger, IServiceScopeFactory scopes) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Startup sweep first, then hourly.
        await SweepAsync(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await SweepAsync(stoppingToken);
        }
    }

    private async Task SweepAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (!db.Database.IsRelational())
            {
                return;
            }

            var days = scope.ServiceProvider.GetRequiredService<IOptions<ConversationOptions>>().Value.AutoArchiveDays;
            var cutoff = DateTime.UtcNow.AddDays(-days);
            var archived = await db.Conversations
                .Where(c => !c.IsArchived && c.LastActivityAt < cutoff)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsArchived, true), ct);
            if (archived > 0)
            {
                logger.LogInformation("Archived {Count} stale conversations", archived);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Conversation archival sweep failed");
        }
    }
}