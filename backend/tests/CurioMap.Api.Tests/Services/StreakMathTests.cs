using CurioMap.Api.Domain;
using CurioMap.Api.Services;

namespace CurioMap.Api.Tests;

public class CircleStreakMathTests
{
    [Fact]
    public void BadgesFor_None_Before_Seven_Days()
    {
        Assert.Empty(CircleStreakMath.BadgesFor(0));
        Assert.Empty(CircleStreakMath.BadgesFor(6));
    }

    [Fact]
    public void BadgesFor_Seven_Day_Unlocks_CircleStreak7()
    {
        Assert.Equal([BadgeKind.CircleStreak7], CircleStreakMath.BadgesFor(7));
        Assert.Equal([BadgeKind.CircleStreak7], CircleStreakMath.BadgesFor(29));
    }

    [Fact]
    public void BadgesFor_Thirty_Day_Unlocks_Both()
    {
        Assert.Equal(
            [BadgeKind.CircleStreak7, BadgeKind.CircleStreak30],
            CircleStreakMath.BadgesFor(30));
        Assert.Equal(
            [BadgeKind.CircleStreak7, BadgeKind.CircleStreak30],
            CircleStreakMath.BadgesFor(100));
    }
}

public class StreakMathTests
{
    [Fact]
    public void AdvanceStreak_SameDay_Keeps_Count()
    {
        var today = new DateOnly(2026, 9, 12);
        Assert.Equal(4, StreakMath.AdvanceStreak(4, today, today));
    }

    [Fact]
    public void AdvanceStreak_ConsecutiveDay_Increments()
    {
        var last = new DateOnly(2026, 9, 11);
        var today = new DateOnly(2026, 9, 12);
        Assert.Equal(5, StreakMath.AdvanceStreak(4, last, today));
    }

    [Fact]
    public void AdvanceStreak_Gap_Resets_To_One()
    {
        var last = new DateOnly(2026, 9, 10);
        var today = new DateOnly(2026, 9, 12);
        Assert.Equal(1, StreakMath.AdvanceStreak(7, last, today));
    }

    [Fact]
    public void AdvanceStreak_Zero_Streak_Clamps_To_One()
    {
        // Defensive clamp: a streak row should never sit at zero, but if it
        // does, same-day activity must read as a 1-day streak, not zero.
        var today = new DateOnly(2026, 9, 12);
        Assert.Equal(1, StreakMath.AdvanceStreak(0, today, today));
    }

    [Fact]
    public void AdvanceStreak_Month_Boundary_Counts_As_Consecutive()
    {
        var last = new DateOnly(2026, 8, 31);
        var today = new DateOnly(2026, 9, 1);
        Assert.Equal(3, StreakMath.AdvanceStreak(2, last, today));
    }

    [Theory]
    [InlineData("2026-09-12", "2026-09-12", true)]
    [InlineData("2026-09-11", "2026-09-12", false)]
    public void IsActiveOn_Matches_Only_Today(string last, string today, bool expected)
    {
        Assert.Equal(expected, StreakMath.IsActiveOn(DateOnly.Parse(last), DateOnly.Parse(today)));
    }

    [Fact]
    public void IsActiveOn_Null_LastDay_Is_Never_Active()
    {
        Assert.False(StreakMath.IsActiveOn(null, new DateOnly(2026, 9, 12)));
    }

    [Fact]
    public void EvaluateBadges_None_When_No_Qualifying_Stats()
    {
        var badges = StreakMath.EvaluateBadges(
            finishedBooks: 0, distinctAuthors: 0, longestStreak: 0,
            inCircle: false, hasReview: false, hasMessage: false, activityHourUtc: 12);
        Assert.Empty(badges);
    }

    [Fact]
    public void EvaluateBadges_Book_Thresholds()
    {
        var badges = StreakMath.EvaluateBadges(
            finishedBooks: 10, distinctAuthors: 2, longestStreak: 0,
            inCircle: false, hasReview: false, hasMessage: false, activityHourUtc: 12);

        Assert.Contains(BadgeKind.FirstBook, badges);
        Assert.Contains(BadgeKind.FiveBooks, badges);
        Assert.Contains(BadgeKind.TenBooks, badges);
        Assert.DoesNotContain(BadgeKind.TwentyFiveBooks, badges);
    }

    [Fact]
    public void EvaluateBadges_Streak_Thresholds()
    {
        var badges = StreakMath.EvaluateBadges(
            finishedBooks: 0, distinctAuthors: 0, longestStreak: 30,
            inCircle: false, hasReview: false, hasMessage: false, activityHourUtc: 12);

        Assert.Contains(BadgeKind.Streak3, badges);
        Assert.Contains(BadgeKind.Streak7, badges);
        Assert.Contains(BadgeKind.Streak30, badges);
        Assert.DoesNotContain(BadgeKind.Streak100, badges);
    }

    [Fact]
    public void EvaluateBadges_Social_And_Review_Badges()
    {
        var badges = StreakMath.EvaluateBadges(
            finishedBooks: 0, distinctAuthors: 0, longestStreak: 0,
            inCircle: true, hasReview: true, hasMessage: true, activityHourUtc: 12);

        Assert.Contains(BadgeKind.FirstCircle, badges);
        Assert.Contains(BadgeKind.FirstReview, badges);
        Assert.Contains(BadgeKind.FirstMessage, badges);
    }

    [Fact]
    public void EvaluateBadges_NightOwl_Only_In_Early_Morning_Window()
    {
        var night = StreakMath.EvaluateBadges(0, 0, 0, false, false, false, 2);
        var dawn = StreakMath.EvaluateBadges(0, 0, 0, false, false, false, 5);
        var day = StreakMath.EvaluateBadges(0, 0, 0, false, false, false, 12);

        Assert.Contains(BadgeKind.NightOwl, night);
        Assert.DoesNotContain(BadgeKind.EarlyBird, night);

        Assert.Contains(BadgeKind.EarlyBird, dawn);
        Assert.DoesNotContain(BadgeKind.NightOwl, dawn);

        Assert.DoesNotContain(BadgeKind.NightOwl, day);
        Assert.DoesNotContain(BadgeKind.EarlyBird, day);
    }

    [Fact]
    public void EvaluateBadges_Globetrotter_At_Five_Distinct_Authors()
    {
        var four = StreakMath.EvaluateBadges(4, 4, 0, false, false, false, 12);
        var five = StreakMath.EvaluateBadges(5, 5, 0, false, false, false, 12);

        Assert.DoesNotContain(BadgeKind.Globetrotter, four);
        Assert.Contains(BadgeKind.Globetrotter, five);
    }

    [Theory]
    [InlineData(true, 7, 0, true)]
    [InlineData(true, 14, 1, true)]
    [InlineData(true, 7, 2, false)]  // already at the cap
    [InlineData(true, 8, 0, false)]  // not a multiple of seven
    [InlineData(true, 1, 0, false)]  // fresh streak after a reset
    [InlineData(false, 7, 0, false)] // same-day repeat — no accrual
    public void ShouldAwardFreeze_Only_On_Advance_To_Multiple_Of_Seven(
        bool advanced, int newStreak, int held, bool expected)
    {
        Assert.Equal(expected, StreakMath.ShouldAwardFreeze(advanced, newStreak, held));
    }

    [Fact]
    public void EffectiveCurrentStreak_Today_And_Yesterday_Keep_Count()
    {
        var today = new DateOnly(2026, 9, 12);
        Assert.Equal(5, StreakMath.EffectiveCurrentStreak(5, today, today));
        Assert.Equal(5, StreakMath.EffectiveCurrentStreak(5, new DateOnly(2026, 9, 11), today));
    }

    [Fact]
    public void EffectiveCurrentStreak_Idle_Readers_Decay_To_Zero()
    {
        var today = new DateOnly(2026, 9, 12);
        Assert.Equal(0, StreakMath.EffectiveCurrentStreak(9, new DateOnly(2026, 9, 10), today));
        Assert.Equal(0, StreakMath.EffectiveCurrentStreak(9, new DateOnly(2026, 8, 1), today));
        Assert.Equal(0, StreakMath.EffectiveCurrentStreak(9, null, today));
    }

    [Fact]
    public void TryConsumeFreeze_Single_Missed_Day_Consumes_One()
    {
        var last = new DateOnly(2026, 9, 10);
        var today = new DateOnly(2026, 9, 12);
        var (consumed, remaining) = StreakMath.TryConsumeFreeze(last, today, 2);
        Assert.True(consumed);
        Assert.Equal(1, remaining);
    }

    [Fact]
    public void TryConsumeFreeze_Consecutive_Day_Never_Consumes()
    {
        // Consecutive days advance the streak; freezes only shield a missed day.
        var last = new DateOnly(2026, 9, 11);
        var today = new DateOnly(2026, 9, 12);
        var (consumed, remaining) = StreakMath.TryConsumeFreeze(last, today, 2);
        Assert.False(consumed);
        Assert.Equal(2, remaining);
    }

    [Fact]
    public void TryConsumeFreeze_No_Freezes_Is_No_Op()
    {
        var last = new DateOnly(2026, 9, 10);
        var today = new DateOnly(2026, 9, 12);
        var (consumed, remaining) = StreakMath.TryConsumeFreeze(last, today, 0);
        Assert.False(consumed);
        Assert.Equal(0, remaining);
    }

    [Fact]
    public void TryConsumeFreeze_Larger_Gap_Never_Consumes()
    {
        // A two-day hole cannot be patched by a single freeze.
        var last = new DateOnly(2026, 9, 9);
        var today = new DateOnly(2026, 9, 12);
        var (consumed, remaining) = StreakMath.TryConsumeFreeze(last, today, 2);
        Assert.False(consumed);
        Assert.Equal(2, remaining);
    }

    [Fact]
    public void TryConsumeFreeze_Same_Day_Never_Consumes()
    {
        var today = new DateOnly(2026, 9, 12);
        var (consumed, remaining) = StreakMath.TryConsumeFreeze(today, today, 1);
        Assert.False(consumed);
        Assert.Equal(1, remaining);
    }
}