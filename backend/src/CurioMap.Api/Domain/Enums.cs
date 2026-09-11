namespace CurioMap.Api.Domain;

/// <summary>How a user chooses to be shown publicly.</summary>
public enum DisplayMode
{
    Anonymous,
    Pseudonymous,
    RealName
}

/// <summary>Reading status of a bookshelf entry.</summary>
public enum BookStatus
{
    Reading,
    Finished,
    Wishlist
}

/// <summary>Per-entry shelf visibility.</summary>
public enum ShelfVisibility
{
    Public,
    Private
}

/// <summary>Conversation topic category.</summary>
public enum TopicType
{
    General,
    Chapter,
    Theme,
    Question
}

/// <summary>Message lifecycle status (moderation-aware).</summary>
public enum MessageStatus
{
    Visible,
    Muted,
    Deleted
}

/// <summary>How much location information a user shares.</summary>
public enum LocationVisibility
{
    Hidden,
    Country,
    RegionCity
}

/// <summary>Lightweight reactions instead of full emoji spam.</summary>
public enum ReactionKind
{
    Insightful,
    Funny,
    Helpful
}

/// <summary>Moderation state of a message report.</summary>
public enum ReportStatus
{
    Open,
    ResolvedActioned,
    ResolvedDismissed
}
