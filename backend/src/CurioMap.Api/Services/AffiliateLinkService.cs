using CurioMap.Api.Common;
using CurioMap.Api.Domain;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Services;

/// <summary>
/// Builds the "Buy this book" link set. Curated overrides on the book row win;
/// otherwise links are computed from the ISBN with the configured affiliate tag.
/// Changing the tag in config applies everywhere instantly.
/// </summary>
public class AffiliateLinkService(IOptions<AffiliateOptions> options)
{
    public Dictionary<string, string> ForBook(Book book)
    {
        var links = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var stored = book.AffiliateLinks;
        var isbn = NormalizeIsbn(book.Isbn);

        links["amazon"] = !string.IsNullOrWhiteSpace(stored.Amazon)
            ? stored.Amazon
            : isbn is null ? "" : $"https://www.amazon.com/dp/{isbn}?tag={options.Value.AmazonTag}";

        links["bookshop"] = !string.IsNullOrWhiteSpace(stored.Bookshop)
            ? stored.Bookshop
            : isbn is null ? "" : $"https://bookshop.org/search?keywords={isbn}";

        links["kobo"] = !string.IsNullOrWhiteSpace(stored.Kobo)
            ? stored.Kobo
            : book.Isbn is null ? "" : $"https://www.kobo.com/search?query={Uri.EscapeDataString(book.Isbn)}";

        if (!string.IsNullOrWhiteSpace(stored.Indiebound))
        {
            links["indiebound"] = stored.Indiebound;
        }
        if (!string.IsNullOrWhiteSpace(stored.Publisher))
        {
            links["publisher"] = stored.Publisher;
        }

        foreach (var key in links.Where(kv => string.IsNullOrWhiteSpace(kv.Value)).Select(kv => kv.Key).ToList())
        {
            links.Remove(key);
        }

        return links;
    }

    private static string? NormalizeIsbn(string? isbn)
    {
        if (string.IsNullOrWhiteSpace(isbn))
        {
            return null;
        }
        var clean = new string(isbn.Where(char.IsAsciiLetterOrDigit).ToArray());
        return clean.Length is 10 or 13 ? clean : isbn;
    }
}
