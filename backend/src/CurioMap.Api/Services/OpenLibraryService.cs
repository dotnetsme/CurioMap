using System.Text.Json;

namespace CurioMap.Api.Services;

public record OpenLibraryBook(string Title, string Author, string? Isbn, string? CoverUrl, int? Year);

/// <summary>
/// Book catalog importer backed by the Open Library public search API.
/// Lets CurioMap start with a usable catalog from day one without manual seeding.
/// </summary>
public class OpenLibraryService(HttpClient http, ILogger<OpenLibraryService> logger)
{
    public async Task<List<OpenLibraryBook>> SearchAsync(string query, int limit, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        // SSRF guard: HttpClient has a pinned BaseAddress; only same-host relative paths allowed.
        if (http.BaseAddress is null
            || !http.BaseAddress.Host.Equals("openlibrary.org", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("OpenLibraryService misconfigured: unexpected BaseAddress {Base}", http.BaseAddress);
            return [];
        }

        try
        {
            var url = "/search.json?q=" + Uri.EscapeDataString(query.Trim())
                      + $"&limit={Math.Clamp(limit, 1, 25)}"
                      + "&fields=title,author_name,cover_i,isbn,first_publish_year";

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(5));
            using var doc = JsonDocument.Parse(await http.GetStringAsync(url, cts.Token));
            if (!doc.RootElement.TryGetProperty("docs", out var docs))
            {
                return [];
            }

            var results = new List<OpenLibraryBook>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in docs.EnumerateArray())
            {
                var title = entry.TryGetProperty("title", out var t) ? t.GetString() : null;
                var author = entry.TryGetProperty("author_name", out var a) && a.ValueKind == JsonValueKind.Array
                    ? a.EnumerateArray().FirstOrDefault().ValueKind == JsonValueKind.String
                        ? a.EnumerateArray().First().GetString()
                        : null
                    : null;
                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(author))
                {
                    continue;
                }

                string? isbn = null;
                if (entry.TryGetProperty("isbn", out var isbns) && isbns.ValueKind == JsonValueKind.Array)
                {
                    isbn = PickIsbn(isbns);
                }

                string? cover = null;
                if (entry.TryGetProperty("cover_i", out var coverI) && coverI.TryGetInt64(out var coverId))
                {
                    cover = $"https://covers.openlibrary.org/b/id/{coverId}-M.jpg";
                }
                else if (isbn != null)
                {
                    cover = $"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg";
                }

                int? year = entry.TryGetProperty("first_publish_year", out var y) && y.TryGetInt32(out var yi) ? yi : null;

                var key = $"{title}|{author}";
                if (!seen.Add(key))
                {
                    continue;
                }

                results.Add(new OpenLibraryBook(title.Trim(), author.Trim(), isbn, cover, year));
                if (results.Count >= limit)
                {
                    break;
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Open Library search failed for {Query}", query);
            return [];
        }
    }

    /// <summary>Prefers 13-digit ISBNs (978/979) over anything else.</summary>
    private static string? PickIsbn(JsonElement values)
    {
        string? fallback = null;
        foreach (var v in values.EnumerateArray())
        {
            if (v.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var candidate = v.GetString();
            if (string.IsNullOrWhiteSpace(candidate))
            {
                continue;
            }

            var clean = new string(candidate.Where(char.IsAsciiLetterOrDigit).ToArray());
            if (clean.Length is 13 && (clean.StartsWith("978") || clean.StartsWith("979")))
            {
                return clean;
            }
            if (clean.Length is 10 or 13 && fallback == null)
            {
                fallback = clean;
            }
        }
        return fallback;
    }
}
