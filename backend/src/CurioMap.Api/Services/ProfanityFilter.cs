using System.Text;

namespace CurioMap.Api.Services;

/// <summary>
/// Simple token-based profanity/hate auto-filter. Deliberately conservative:
/// checks whole normalized tokens (no substring matching, so "class" is safe),
/// and de-loys common substitutions. Manual moderation handles the rest.
/// </summary>
public class ProfanityFilter
{
    private static readonly HashSet<string> Blocklist = new(StringComparer.Ordinal)
    {
        "asshole", "bastard", "bitch", "bollocks", "bullshit", "cunt", "dick", "dickhead",
        "fuck", "fucked", "fucker", "fucking", "motherfucker", "nigger", "nigga", "piss",
        "prick", "pussy", "shit", "shitty", "slut", "twat", "wanker", "whore", "retard",
        "fag", "faggot", "kys", "tranny",
    };

    private static readonly Dictionary<char, char> Leet = new()
    {
        ['0'] = 'o', ['1'] = 'i', ['3'] = 'e', ['4'] = 'a',
        ['5'] = 's', ['7'] = 't', ['@'] = 'a', ['$'] = 's', ['!'] = 'i',
    };

    public bool ContainsProfanity(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        var normalized = text.ToLowerInvariant();
        var word = new StringBuilder();
        var spaced = new StringBuilder(); // joins sequences like "f u c k"
        foreach (var ch in normalized)
        {
            if (Leet.TryGetValue(ch, out var mapped))
            {
                word.Append(mapped);
            }
            else if (char.IsAsciiLetterOrDigit(ch) || ch is '\'' or '-')
            {
                word.Append(ch);
            }
            else
            {
                if (word.Length > 0)
                {
                    if (word.Length == 1)
                    {
                        spaced.Append(word);
                    }
                    else
                    {
                        if (Check(spaced) || Check(word))
                        {
                            return true;
                        }
                        spaced.Clear();
                    }
                }
                word.Clear();
            }
        }

        return Check(spaced) || Check(word);
    }

    private static bool Check(StringBuilder word)
    {
        if (word.Length < 2)
        {
            return false;
        }
        // Collapse repeated-edge obfuscation like f-u-c-k or fuuuck.
        var value = word.ToString().Trim('\'', '-');
        if (Blocklist.Contains(value))
        {
            return true;
        }
        var collapsed = CollapsedRepeats(value);
        return Blocklist.Contains(collapsed);
    }

    private static string CollapsedRepeats(string value)
    {
        var sb = new System.Text.StringBuilder(value.Length);
        for (var i = 0; i < value.Length; i++)
        {
            if (i == 0 || value[i] != value[i - 1])
            {
                sb.Append(value[i]);
            }
        }
        return sb.ToString();
    }
}
