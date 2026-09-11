using System.Text;
using CurioMap.Api.Domain;

namespace CurioMap.Api.Common;

/// <summary>Enums cross the API boundary as lowercase snake_case strings.</summary>
public static class EnumStrings
{
    public static string ToApi<TEnum>(this TEnum value) where TEnum : struct, Enum
    {
        var name = value.ToString();
        var sb = new StringBuilder(name.Length + 4);
        for (var i = 0; i < name.Length; i++)
        {
            if (char.IsUpper(name[i]) && i > 0)
            {
                sb.Append('_');
            }
            sb.Append(char.ToLowerInvariant(name[i]));
        }
        return sb.ToString();
    }

    public static bool TryParseEnum<TEnum>(string? value, out TEnum result) where TEnum : struct, Enum
    {
        result = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var norm = value.Trim().Replace('-', '_').Replace(' ', '_').ToLowerInvariant();
        foreach (TEnum candidate in Enum.GetValues(typeof(TEnum)))
        {
            if (candidate.ToApi() == norm || candidate.ToString().ToLowerInvariant() == norm)
            {
                result = candidate;
                return true;
            }
        }
        return false;
    }
}

/// <summary>Display-name resolution: anonymous → generic label; pseudonymous → handle; real_name → real name.</summary>
public static class DisplayName
{
    public static string Resolve(DisplayMode mode, string? realName, string handle) => mode switch
    {
        DisplayMode.Pseudonymous => handle,
        DisplayMode.RealName => string.IsNullOrWhiteSpace(realName) ? handle : realName.Trim(),
        _ => "Anonymous Reader"
    };

    /// <summary>Same resolution as an inline SQL-translatable expression, for projections.</summary>
    public static string InProjection(DisplayMode mode, string? realName, string handle) => Resolve(mode, realName, handle);
}

/// <summary>Converts DATABASE_URL style URLs to Npgsql connection strings (Neon/Fly convention).</summary>
public static class DbUrl
{
    public static string ToNpgsql(string url)
    {
        if (!url.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
        {
            return url; // already a key=value connection string
        }

        var uri = new Uri(url.Replace("postgres://", "postgresql://", StringComparison.OrdinalIgnoreCase));
        var userInfo = uri.UserInfo.Split(':', 2);
        var user = Uri.UnescapeDataString(userInfo[0]);
        var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var database = uri.AbsolutePath.TrimStart('/');
        var port = uri.Port > 0 ? uri.Port : 5432;
        return $"Host={uri.Host};Port={port};Database={database};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true";
    }
}

/// <summary>Curated avatar id registry — no uploads at launch (moderation-free by design).</summary>
public static class CurioAvatars
{
    public static readonly string[] Ids =
        Enumerable.Range(1, 24).Select(i => $"curio-{i:00}").ToArray();

    public static bool Exists(string? id) => id != null && Ids.Contains(id);
}

public record ConversationPrompt(string Key, string Label, TopicType TopicType);

/// <summary>Predefined conversation prompts shown as chips when starting a discussion.</summary>
public static class Prompts
{
    public static readonly ConversationPrompt[] All =
    [
        new("what_confused_you", "What confused you?", TopicType.Question),
        new("best_quote", "Best quote?", TopicType.General),
        new("who_should_read", "Who should read this?", TopicType.General),
        new("changed_my_mind", "What changed your mind?", TopicType.Theme),
        new("chapter_takeaways", "Chapter takeaways", TopicType.Chapter),
        new("skeptic_corner", "Skeptic's corner", TopicType.Question),
    ];

    public static bool Exists(string? key) => key != null && All.Any(p => p.Key == key);
}
