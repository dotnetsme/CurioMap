using System.Text.Json;

namespace CurioMap.Api.Services;

/// <summary>Optional Google Books fallback. It is disabled unless explicitly configured.</summary>
public class GoogleBooksService(HttpClient http, ILogger<GoogleBooksService> logger)
{
    public async Task<List<OpenLibraryBook>> SearchAsync(string query, string apiKey, int limit, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query) || string.IsNullOrWhiteSpace(apiKey)
            || http.BaseAddress is null
            || !http.BaseAddress.Host.Equals("www.googleapis.com", StringComparison.OrdinalIgnoreCase))
        {
            return [];
        }

        try
        {
            var url = "books/v1/volumes?q=" + Uri.EscapeDataString(query.Trim())
                      + $"&maxResults={Math.Clamp(limit, 1, 20)}&printType=books&key={Uri.EscapeDataString(apiKey)}";
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(5));
            using var doc = JsonDocument.Parse(await http.GetStringAsync(url, cts.Token));
            if (!doc.RootElement.TryGetProperty("items", out var items)
                || items.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var results = new List<OpenLibraryBook>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var item in items.EnumerateArray())
            {
                if (!item.TryGetProperty("volumeInfo", out var info)) continue;
                var title = info.TryGetProperty("title", out var titleValue) ? titleValue.GetString() : null;
                string? author = null;
                if (info.TryGetProperty("authors", out var authors) && authors.ValueKind == JsonValueKind.Array)
                {
                    author = authors.EnumerateArray()
                        .Where(value => value.ValueKind == JsonValueKind.String)
                        .Select(value => value.GetString())
                        .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
                }
                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(author)) continue;

                string? isbn = null;
                if (info.TryGetProperty("industryIdentifiers", out var identifiers)
                    && identifiers.ValueKind == JsonValueKind.Array)
                {
                    foreach (var identifier in identifiers.EnumerateArray())
                    {
                        if (!identifier.TryGetProperty("identifier", out var value)) continue;
                        var rawIsbn = value.GetString();
                        if (string.IsNullOrWhiteSpace(rawIsbn)) continue;
                        var cleanIsbn = new string(rawIsbn.Where(char.IsAsciiLetterOrDigit).ToArray());
                        if (cleanIsbn.Length is 10 or 13)
                        {
                            isbn = cleanIsbn;
                            break;
                        }
                    }
                }

                var cover = info.TryGetProperty("imageLinks", out var images)
                    && images.TryGetProperty("thumbnail", out var thumbnail)
                    ? thumbnail.GetString()?.Replace("http://", "https://", StringComparison.OrdinalIgnoreCase)
                    : null;
                int? year = null;
                if (info.TryGetProperty("publishedDate", out var date))
                {
                    var publishedDate = date.GetString();
                    if (!string.IsNullOrWhiteSpace(publishedDate)
                        && publishedDate.Length >= 4
                        && int.TryParse(publishedDate[..4], out var parsedYear))
                    {
                        year = parsedYear;
                    }
                }

                var cleanTitle = title.Trim();
                var cleanAuthor = author.Trim();
                if (seen.Add($"{cleanTitle}|{cleanAuthor}"))
                {
                    results.Add(new OpenLibraryBook(cleanTitle, cleanAuthor, isbn, cover, year));
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Google Books search failed for {Query}", query);
            return [];
        }
    }
}