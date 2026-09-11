using CurioMap.Api.Services;

namespace CurioMap.Api.Tests;

public class ChallengeMathTests
{
    [Theory]
    [InlineData(0, 50, 0)]
    [InlineData(25, 50, 50)]
    [InlineData(50, 50, 100)]
    [InlineData(60, 50, 100)] // capped at 100 via int truncation
    [InlineData(7, 20, 35)]
    public void Pct_Computes_Progress_Percentage(int finished, int target, int expected)
    {
        Assert.Equal(expected, ChallengeMath.Pct(finished, target));
    }

    [Fact]
    public void Pct_Handles_Zero_Target()
    {
        Assert.Equal(0, ChallengeMath.Pct(5, 0));
    }

    [Fact]
    public void AheadOfPace_True_When_Ahead()
    {
        // target 50, halfway through year (182.5 days elapsed) → expected ~25.
        // 30 finished > 25 expected → ahead.
        Assert.True(ChallengeMath.AheadOfPace(30, 50, 182.5, 365));
    }

    [Fact]
    public void AheadOfPace_False_When_Behind()
    {
        // 10 finished < ~25 expected → not ahead.
        Assert.False(ChallengeMath.AheadOfPace(10, 50, 182.5, 365));
    }

    [Fact]
    public void AheadOfPace_False_When_Exactly_On_Pace()
    {
        // 25 finished == expected 25 → not strictly greater.
        Assert.False(ChallengeMath.AheadOfPace(25, 50, 182.5, 365));
    }
}
