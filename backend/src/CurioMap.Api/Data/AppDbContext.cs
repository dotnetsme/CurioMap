using CurioMap.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CurioMap.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookshelfEntry> BookshelfEntries => Set<BookshelfEntry>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageReport> MessageReports => Set<MessageReport>();
    public DbSet<Follow> Follows => Set<Follow>();
    public DbSet<ActivityEvent> ActivityEvents => Set<ActivityEvent>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Draft> Drafts => Set<Draft>();
    public DbSet<DraftChapter> DraftChapters => Set<DraftChapter>();

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
            e.Property(b => b.Metadata).HasColumnType("jsonb");
            e.OwnsOne(b => b.AffiliateLinks, json => json.ToJson());
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
            e.Property(a => a.Payload).HasColumnType("jsonb");
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


        // (end of model configuration)
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
