namespace CurioMap.Api.Common;

/// <summary>
/// Single source of truth for list-endpoint bounds (AGENTS §4C.4 / §5.9).
/// Every collection endpoint clamps user input through these helpers - raw
/// <c>Math.Clamp(1, 50)</c> literals in controllers and unbounded <c>Skip(offset)</c>
/// deep-pagination scans are the defects the fitness suites look for.
/// </summary>
public static class PageBounds
{
    /// <summary>Maximum items per page across every collection endpoint.</summary>
    public const int MaxPageSize = 50;

    /// <summary>
    /// Maximum skip distance. Deep pagination forces the database to walk (and throw
    /// away) every preceding row, so an unbounded offset is a cheap DoS lever.
    /// </summary>
    public const int MaxOffset = 10_000;

    /// <summary>Clamp a requested page size to [1, <paramref name="max"/>].</summary>
    public static int ClampPageSize(int requested, int max = MaxPageSize) =>
        Math.Clamp(requested, 1, max);

    /// <summary>Clamp a requested offset to [0, <see cref="MaxOffset"/>].</summary>
    public static int ClampOffset(int requested) =>
        Math.Max(0, Math.Min(requested, MaxOffset));
}