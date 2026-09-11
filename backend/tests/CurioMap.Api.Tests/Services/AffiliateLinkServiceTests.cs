using CurioMap.Api.Common;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Tests;

public class AffiliateLinkServiceTests
{
    private readonly AffiliateLinkService _service = new(Options.Create(new AffiliateOptions { AmazonTag = "testtag-21" }));

    [Fact]
    public void Isbn_Book_Gets_Computed_Links_With_Configured_Tag()
    {
        var book = new Book { Title = "Meditations", Author = "Marcus Aurelius", Isbn = "978-0-14-044933-4" };
        var links = _service.ForBook(book);

        Assert.True(links.ContainsKey("amazon"));
        Assert.Contains("tag=testtag-21", links["amazon"]);
        Assert.Contains("9780140449334", links["amazon"]);
        Assert.True(links.ContainsKey("bookshop"));
        Assert.Contains("9780140449334", links["bookshop"]);
    }

    [Fact]
    public void Curated_Overrides_Win_Over_Computed_Links()
    {
        var book = new Book
        {
            Title = "Dune",
            Author = "Frank Herbert",
            Isbn = "9780441013593",
            AffiliateLinks = new BookAffiliateLinks { Amazon = "https://example.com/dune", Publisher = "https://example.com/checkout" },
        };
        var links = _service.ForBook(book);

        Assert.Equal("https://example.com/dune", links["amazon"]);
        Assert.Equal("https://example.com/checkout", links["publisher"]);
    }

    [Fact]
    public void Book_Without_Isbn_Has_No_Computed_Links()
    {
        var links = _service.ForBook(new Book { Title = "Untitled zine", Author = "Anonymous" });
        Assert.Empty(links);
    }
}
