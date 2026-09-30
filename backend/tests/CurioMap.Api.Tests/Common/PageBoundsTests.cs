using CurioMap.Api.Common;

namespace CurioMap.Api.Tests.Common;

/// <summary>
/// Unit coverage for the shared pagination bounds (AGENTS §4C.4 / §5.9) - the single
/// clamp path every controller list endpoint must go through.
/// </summary>
public class PageBoundsTests
{
    [Theory]
    [InlineData(0, 1)]
    [InlineData(-25, 1)]
    [InlineData(1, 1)]
    [InlineData(25, 25)]
    [InlineData(500, 50)]
    public void ClampPageSize_Binds_Requested_Size_To_One_Through_MaxPageSize(int requested, int expected)
    {
        Assert.Equal(expected, PageBounds.ClampPageSize(requested));
    }

    [Fact]
    public void ClampPageSize_Honors_An_Explicit_Maximum()
    {
        Assert.Equal(5, PageBounds.ClampPageSize(25, 5));
    }

    [Theory]
    [InlineData(-5, 0)]
    [InlineData(0, 0)]
    [InlineData(9_999, 9_999)]
    [InlineData(10_000, 10_000)]
    [InlineData(999_999, 10_000)]
    public void ClampOffset_Binds_Deep_Pagination_Scans(int requested, int expected)
    {
        Assert.Equal(expected, PageBounds.ClampOffset(requested));
    }
}