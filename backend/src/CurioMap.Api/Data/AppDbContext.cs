using CurioMap.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CurioMap.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookshelfEntry> BookshelfEntries => Set<BookshelfEntry>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageReport> MessageReports => Set<MessageReport>();
    public DbSet<Follow> Follows => Set<Follow>();
    public DbSet<ActivityEvent> ActivityEvents => Set<ActivityEvent>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Challenge> Challenges => Set<Challenge>();
    public DbSet<Draft> Drafts => Set<Draft>();
    public DbSet<DraftChapter> DraftChapters => Set<DraftChapter>();
    public DbSet<ReadingCircle> ReadingCircles => Set<ReadingCircle>();
    public DbSet<CircleMembership> CircleMemberships => Set<CircleMembership>();
    public DbSet<CircleMessage> CircleMessages => Set<CircleMessage>();
    public DbSet<CircleReaction> CircleReactions => Set<CircleReaction>();
    public DbSet<ReadingStreak> ReadingStreaks => Set<ReadingStreak>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<CircleStreak> CircleStreaks => Set<CircleStreak>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Schema lives in Data/Migrations/*.sql (applied by DbInitializer).
        // The snake_case naming convention must match those scripts exactly.
        modelBuilder.Entity<User>(e =>
        {
            e.Property(u => u.Email).HasMaxLength(320).IsRequired();
            e.Property(u => u.PasswordHash).HasMaxLength(200).IsRequired();
            e.Property(u => u.Handle).HasMaxLength(40).IsRequired();
            e.Property(u => u.AvatarId).HasMaxLength(40).IsRequired();
            e.Property(u => u.DisplayNameMode).HasConversion<string>().HasMaxLength(20);
            e.Property(u => u.RealName).HasMaxLength(120);
            e.Property(u => u.Bio).HasMaxLength(1000);
            e.Property(u => u.LocationVisibility).HasConversion<string>().HasMaxLength(20);
            e.Property(u => u.BookshelfVisibility).HasConversion<string>().HasMaxLength(20);
            e.Property(u => u.TermsVersion).HasMaxLength(20);
            e.HasOne(u => u.Location).WithMany(l => l.Users)
                .HasForeignKey(u => u.LocationId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Location>(e =>
        {
            e.Property(l => l.Country).HasMaxLength(100);
            e.Property(l => l.Region).HasMaxLength(120);
            e.Property(l => l.City).HasMaxLength(120);
        });

        modelBuilder.Entity<Book>(e =>
        {
            e.Property(b => b.Title).HasMaxLength(500).IsRequired();
            e.Property(b => b.Author).HasMaxLength(300).IsRequired();
            e.Property(b => b.Isbn).HasMaxLength(20);
            e.Property(b => b.CoverUrl).HasMaxLength(1000);
            e.Property(b => b.Description).HasMaxLength(4000);
            if (Database.IsNpgsql())
            {
                e.Property(b => b.Metadata).HasColumnType("jsonb");
                e.OwnsOne(b => b.AffiliateLinks, json => json.ToJson());
            }
            else
            {
                e.Ignore(b => b.Metadata);
                e.Ignore(b => b.AffiliateLinks);
            }
        });

        modelBuilder.Entity<BookshelfEntry>(e =>
        {
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Visibility).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.User).WithMany(u => u.BookshelfEntries)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Book).WithMany(b => b.Entries)
    .HasForeignKey(x => x.BookId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Rating>(e =>
        {
            e.HasKey(r => new { r.UserId, r.BookId });
            if (Database.IsNpgsql())
            {
                e.Property(r => r.Value).HasColumnType("smallint");
            }
            e.HasIndex(r => r.BookId);
            e.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Book).WithMany().HasForeignKey(r => r.BookId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Conversation>(e =>
        {
            e.Property(c => c.TopicType).HasConversion<string>().HasMaxLength(20);
            e.Property(c => c.Title).HasMaxLength(200).IsRequired();
            e.Property(c => c.PromptKey).HasMaxLength(60);
            e.HasOne(c => c.Book).WithMany(b => b.Conversations)
                .HasForeignKey(c => c.BookId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.Draft).WithMany()
                .HasForeignKey(c => c.DraftId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.Creator).WithMany()
                .HasForeignKey(c => c.CreatedBy).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.Property(m => m.Content).HasMaxLength(2000).IsRequired();
            e.Property(m => m.Status).HasConversion<string>().HasMaxLength(20);
            e.HasOne(m => m.Conversation).WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.Author).WithMany()
                .HasForeignKey(m => m.AuthorId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MessageReaction>(e =>
        {
            e.Property(r => r.Kind).HasConversion<string>().HasMaxLength(20);
            e.HasOne(r => r.Message).WithMany(m => m.Reactions)
                .HasForeignKey(r => r.MessageId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.User).WithMany()
                .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MessageReport>(e =>
        {
            e.Property(r => r.Reason).HasMaxLength(500).IsRequired();
            e.Property(r => r.Status).HasConversion<string>().HasMaxLength(30);
            e.HasOne(r => r.Message).WithMany()
                .HasForeignKey(r => r.MessageId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Reporter).WithMany()
                .HasForeignKey(r => r.ReporterId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Follow>(e =>
        {
            e.HasOne(f => f.Follower).WithMany()
                .HasForeignKey(f => f.FollowerId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(f => f.Followed).WithMany()
                .HasForeignKey(f => f.FollowedId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ActivityEvent>(e =>
        {
            e.Property(a => a.Type).HasMaxLength(40).IsRequired();
            if (Database.IsNpgsql())
            {
                e.Property(a => a.Payload).HasColumnType("jsonb");
            }
            else
            {
                e.Ignore(a => a.Payload);
            }
            e.HasOne(a => a.Actor).WithMany()
                .HasForeignKey(a => a.ActorId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Book).WithMany()
                .HasForeignKey(a => a.BookId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(a => a.Conversation).WithMany()
                .HasForeignKey(a => a.ConversationId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.Property(r => r.TokenHash).HasMaxLength(64).IsRequired();
            e.HasOne(r => r.User).WithMany()
                .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Draft>(e =>
        {
            e.Property(d => d.Title).HasMaxLength(300).IsRequired();
            e.Property(d => d.Status).HasMaxLength(20).IsRequired();
            e.Property(d => d.Description).HasMaxLength(4000);
            e.HasOne(d => d.Author).WithMany()
                .HasForeignKey(d => d.AuthorId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DraftChapter>(e =>
        {
            e.Property(c => c.Title).HasMaxLength(300).IsRequired();
            e.HasOne(c => c.Draft).WithMany(d => d.Chapters)
                .HasForeignKey(c => c.DraftId).OnDelete(DeleteBehavior.Cascade);
        });


        modelBuilder.Entity<Challenge>(e =>
        {
            e.HasKey(c => new { c.UserId, c.Year });
            e.HasOne(c => c.User).WithMany(u => u.Challenges)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReadingCircle>(e =>
        {
            e.Property(c => c.Handle).HasMaxLength(60).IsRequired();
            e.Property(c => c.Name).HasMaxLength(80).IsRequired();
            e.Property(c => c.Description).HasMaxLength(500);
            e.HasIndex(c => c.Handle).IsUnique();
            e.HasOne(c => c.Book).WithMany()
                .HasForeignKey(c => c.BookId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(c => c.Creator).WithMany()
                .HasForeignKey(c => c.CreatedBy).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(c => c.Members).WithOne(m => m.Circle)
                .HasForeignKey(m => m.CircleId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(c => c.Messages).WithOne(m => m.Circle)
                .HasForeignKey(m => m.CircleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CircleMembership>(e =>
        {
            e.Property(m => m.Role).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(m => new { m.CircleId, m.UserId }).IsUnique();
            e.HasOne(m => m.Circle).WithMany(c => c.Members)
                .HasForeignKey(m => m.CircleId);
            e.HasOne(m => m.User).WithMany()
                .HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CircleMessage>(e =>
        {
            e.Property(m => m.Content).HasMaxLength(2000).IsRequired();
            e.Property(m => m.Status).HasConversion<string>().HasMaxLength(20);
            e.HasOne(m => m.Circle).WithMany(c => c.Messages)
                .HasForeignKey(m => m.CircleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.Author).WithMany()
                .HasForeignKey(m => m.AuthorId).OnDelete(DeleteBehavior.NoAction);
            e.HasMany(m => m.Reactions).WithOne(r => r.Message)
                .HasForeignKey(r => r.MessageId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CircleReaction>(e =>
        {
            e.Property(r => r.Kind).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(r => new { r.MessageId, r.UserId, r.Kind }).IsUnique();
            e.HasOne(r => r.Message).WithMany(m => m.Reactions)
                .HasForeignKey(r => r.MessageId);
            e.HasOne(r => r.User).WithMany()
                .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReadingStreak>(e =>
        {
            e.HasKey(s => s.UserId);
            e.HasOne(s => s.User).WithOne(u => u.Streak)
                .HasForeignKey<ReadingStreak>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CircleStreak>(e =>
        {
            e.HasKey(s => s.CircleId);
            e.HasOne(s => s.Circle).WithOne(c => c.Streak)
                .HasForeignKey<CircleStreak>(s => s.CircleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserBadge>(e =>
        {
            e.Property(b => b.Kind).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(b => new { b.UserId, b.Kind }).IsUnique();
            e.HasOne(b => b.User).WithMany(u => u.Badges)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override int SaveChanges()
    {
        TouchAuditable();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        TouchAuditable();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void TouchAuditable()
    {
        foreach (var entry in ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }
    }
}
