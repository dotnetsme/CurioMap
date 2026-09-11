using CurioMap.Api.Services;

namespace CurioMap.Api.Tests;

public class ProfanityFilterTests
{
    private readonly ProfanityFilter _filter = new();

    [Theory]
    [InlineData("What a great book, truly insightful.")]
    [InlineData("The chapter on systems thinking changed my mind.")]
    [InlineData("I loved the glass armonica scene in Chapter 12.")]
    [InlineData("")]
    [InlineData(null)]
    public void Clean_Text_Passes(string? text)
    {
        Assert.False(_filter.ContainsProfanity(text));
    }

    [Theory]
    [InlineData("you are an asshole")]
    [InlineData("F U C K this book")]
    [InlineData("sh1t ending")]
    [InlineData("what a b!tch move")]
    public void Profanity_Is_Flagged(string text)
    {
        Assert.True(_filter.ContainsProfanity(text));
    }

    [Fact]
    public void Innocent_Words_Containing_Blocklist_Substrings_Are_Not_Flagged()
    {
        // Scunthorpe protection: token-level matching, not substring matching.
        Assert.False(_filter.ContainsProfanity("I read this in my class at school."));
        Assert.False(_filter.ContainsProfanity("The assassin character was compelling."));
    }
}
