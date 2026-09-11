using System.ComponentModel.DataAnnotations;
using CurioMap.Api.Auth;
using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Controllers;

[ApiController]
[Route("books")]
public class BooksController(
    AppDbContext db,
    CurrentUser me,
    OpenLibraryService openLibrary,
    AffiliateLinkService affiliate,
    IOptions<OpenLibraryOptions> openLibraryOptions) : ControllerBase
{
    [HttpGet("search")]
    [AllowAnonymous]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<SearchResponse>> Search(
        [FromQuery(Name = "q")] string query,
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0)
    {
        query = query?.Trim() ?? "";
        if (query.Length < 2)
        {
            throw new AppException(400, "Search requires at least 2 characters.");
        }

        limit = Math.Clamp(limit, 1, 50);
        offset = Math.Max(0, offset);

        var baseQuery = db.Books.AsNoTracking().Where(b =>
            EF.Functions.ILike(b.Title, $"%{query}%")
            || EF.Functions.ILike(b.Author, $"%{query}%")
            || (b.Isbn != null && b.Isbn == query));

        var total = await baseQuery.CountAsync();
        var fromExternal = false;

        // Empty local catalog → transparently import from Open Library (public API, no key).
        if (total == 0 && offset == 0 && openLibraryOptions.Value.Enabled)
        {
            var external = await openLibrary.SearchAsync(query, Math.Min(limit, 12));
            if (external.Count > 0)
            {
                foreach (var result in external)
                {
                    var exists = result.Isbn != null && await db.Books.AnyAsync(b => b.Isbn == result.Isbn);
                    if (!exists)
                    {
                        var metadata = new Dictionary<string, string> { ["source"] = "openlibrary" };
                        if (result.Year is not null)
                        {
                            metadata["year"] = result.Year.Value.ToString();
                        }
                        db.Books.Add(new Book
                        {
                            Title = result.Title,
                            Author = result.Author,
                            Isbn = result.Isbn,
                            CoverUrl = result.CoverUrl,
                            Metadata = metadata,
                        });
                    }
                }
                await db.SaveChangesAsync();
                fromExternal = true;
                total = await baseQuery.CountAsync();
            }
        }

        var books = await baseQuery
            .OrderBy(b => b.Title)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        return Ok(new SearchResponse(books.Select(b => ToDto(b, 0, 0)).ToList(), total, fromExternal));
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<BookDto>> Detail(Guid id)
    {
        var book = await db.Books.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id)
            ?? throw new AppException(404, "Book not found.");

        var readers = await db.BookshelfEntries.CountAsync(s =>
            s.BookId == id && s.Status == BookStatus.Reading && s.Visibility == ShelfVisibility.Public);
        var conversations = await db.Conversations.CountAsync(c => c.BookId == id && !c.IsArchived);

        return Ok(ToDto(book, readers, conversations));
    }

    [HttpPost("import")]
    [Authorize(Policy = "Admin")]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<BookDto>> Import(ImportBookRequest request)
    {
        var isbn = new string(request.Isbn.Where(char.IsAsciiLetterOrDigit).ToArray());

        var existing = await db.Books.AsNoTracking().FirstOrDefaultAsync(b => b.Isbn == isbn);
        if (existing is not null)
        {
            return Ok(ToDto(existing, 0, 0));
        }

        var results = await openLibrary.SearchAsync(isbn, 3);
        var match = results.FirstOrDefault(r => r.Isbn == isbn) ?? results.FirstOrDefault();
        if (match is null)
        {
            throw new AppException(404, "No book found for that ISBN.");
        }

        var metadata = new Dictionary<string, string> { ["source"] = "openlibrary" };
        if (match.Year is not null)
        {
            metadata["year"] = match.Year.Value.ToString();
        }

        var book = new Book
        {
            Title = match.Title,
            Author = match.Author,
            Isbn = match.Isbn ?? isbn,
            CoverUrl = match.CoverUrl,
            Metadata = metadata,
        };
        db.Books.Add(book);
        await db.SaveChangesAsync();
        return Ok(ToDto(book, 0, 0));
    }

    private BookDto ToDto(Book book, int readers, int conversations) => new(
        book.Id,
        book.Title,
        book.Author,
        book.Isbn,
        book.CoverUrl,
        book.Description,
        affiliate.ForBook(book),
        book.Metadata,
        readers,
        conversations,
        book.CreatedAt);
}
