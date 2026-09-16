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

/// <summary>Role within a Reading Circle.</summary>
public enum CircleRole
{
    Member,
    Moderator
}

/// <summary>Milestone badges a reader can earn.</summary>
public enum BadgeKind
{
    FirstBook,
    FiveBooks,
    TenBooks,
    TwentyFiveBooks,
    FiftyBooks,
    HundredBooks,
    Streak3,
    Streak7,
    Streak30,
    Streak100,
    FirstCircle,
    FirstReview,
    FirstMessage,
    NightOwl,       // activity after midnight local
    EarlyBird,      // activity before 6am local
    Globetrotter,   // books from 5+ distinct authors
    CircleStreak7,  // member of a circle that reached a 7-day group streak
    CircleStreak30  // member of a circle that reached a 30-day group streak
}
