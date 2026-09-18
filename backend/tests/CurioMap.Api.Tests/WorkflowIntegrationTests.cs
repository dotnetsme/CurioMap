using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CurioMap.Api.Contracts;
using CurioMap.Api.Controllers;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CurioMap.Api.Tests;

public class WorkflowIntegrationTests : IClassFixture<CurioMapTestFactory>
{
    private readonly CurioMapTestFactory _factory;

    public WorkflowIntegrationTests(CurioMapTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Root_And_Health_Endpoints_Return_Ok()
    {
        var client = _factory.CreateClient();

        var rootResponse = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, rootResponse.StatusCode);

        var healthResponse = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, healthResponse.StatusCode);
    }

    [Fact]
    public async Task Auth_Lifecycle_Register_Login_Me_Logout_Works()
    {
        var client = _factory.CreateClient();
        var email = $"reader_{Guid.NewGuid():N}@curiomap.local";
        var password = "StrongPassword123!";

        // 1. Register
        var regResponse = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, regResponse.StatusCode);
        var regData = await regResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(regData);
        Assert.Equal(email, regData.User.Email);
        Assert.False(string.IsNullOrWhiteSpace(regData.AccessToken));
        Assert.Matches(@"^[a-z]+_[a-z]+_\d{3,4}$", regData.User.Handle);

        // 2. Auth /me with Bearer token
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", regData.AccessToken);
        var meResponse = await client.GetAsync("/auth/me");
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

        // 3. Duplicate registration rejected with 409 Conflict
        var dupClient = _factory.CreateClient();
        var dupResponse = await dupClient.PostAsJsonAsync("/auth/register", new RegisterRequest(email, password));
        Assert.Equal(HttpStatusCode.Conflict, dupResponse.StatusCode);

        // 4. Login with registered credentials
        var loginResponse = await dupClient.PostAsJsonAsync("/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginData = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(loginData);
        Assert.False(string.IsNullOrWhiteSpace(loginData.AccessToken));

        // 5. Logout
        var logoutResponse = await client.PostAsync("/auth/logout", null);
        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);
    }

    [Fact]
    public async Task Location_Privacy_Coordinates_Are_Fuzzed_And_Redacted_In_Public_Profiles()
    {
        var client = _factory.CreateClient();
        var email = $"geo_{Guid.NewGuid():N}@curiomap.local";
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // Update location (Arlington, Virginia)
        var geoPatch = await client.PatchAsJsonAsync("/geo/me", new UpdateLocationRequest("United States", "Virginia", "Arlington"));
        Assert.Equal(HttpStatusCode.OK, geoPatch.StatusCode);

        // Public profile lookup should never expose email or coordinates
        var anonClient = _factory.CreateClient();
        var publicProfileRes = await anonClient.GetAsync($"/users/{auth.User.Id}");
        Assert.Equal(HttpStatusCode.OK, publicProfileRes.StatusCode);
        var publicProfile = await publicProfileRes.Content.ReadFromJsonAsync<PublicProfileDto>();
        Assert.NotNull(publicProfile);

        // Identity separation: default display mode is anonymous, so the public
        // handle is redacted. DisplayName is the privacy-safe public label.
        Assert.Equal("anonymous", publicProfile.Handle);
        Assert.Equal("Anonymous Reader", publicProfile.DisplayName);

        // PII zero-leak: coordinates are stripped from public location DTOs.
        if (publicProfile.Location != null)
        {
            Assert.Equal("United States", publicProfile.Location.Country);
            Assert.Null(publicProfile.Location.LatFuzzed);
            Assert.Null(publicProfile.Location.LngFuzzed);
        }
    }

    [Fact]
    public async Task Bookshelf_Privacy_Private_Shelf_Is_Forbidden_To_Others()
    {
        var client = _factory.CreateClient();
        var email = $"shelf_{Guid.NewGuid():N}@curiomap.local";
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // Set shelf visibility to private
        var settingsRes = await client.PatchAsJsonAsync("/users/me/settings", new UpdateSettingsRequest(null, "private"));
        Assert.Equal(HttpStatusCode.OK, settingsRes.StatusCode);

        // Other reader attempts to query public shelf -> should return 403 Forbidden
        var otherClient = _factory.CreateClient();
        var shelfRes = await otherClient.GetAsync($"/users/{auth.User.Id}/bookshelf");
        Assert.Equal(HttpStatusCode.Forbidden, shelfRes.StatusCode);
    }

    [Fact]
    public async Task Gamification_Streaks_And_Badge_Endpoint_Lifecycle()
    {
        var client = _factory.CreateClient();
        var email = $"streak_{Guid.NewGuid():N}@curiomap.local";
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // Fetch /me/streak
        var streakRes = await client.GetAsync("/me/streak");
        Assert.Equal(HttpStatusCode.OK, streakRes.StatusCode);
        var streak = await streakRes.Content.ReadFromJsonAsync<StreakStatsDto>();
        Assert.NotNull(streak);
        Assert.True(streak.FreezeCount >= 0);

        // Fetch /me/streak/calendar
        var calRes = await client.GetAsync("/me/streak/calendar?days=30");
        Assert.Equal(HttpStatusCode.OK, calRes.StatusCode);
        var cal = await calRes.Content.ReadFromJsonAsync<StreakCalendarDto>();
        Assert.NotNull(cal);
        Assert.Equal(30, cal.Days);
    }

    [Fact]
    public async Task Reading_Circles_Creation_Listing_And_Joining()
    {
        var client = _factory.CreateClient();
        var email = $"circle_lead_{Guid.NewGuid():N}@curiomap.local";
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // 1. Create a reading circle
        var createCircleReq = new CreateCircleRequest("Sci-Fi Explorers", "Exploring classic speculative fiction", null, 25, null);
        var createRes = await client.PostAsJsonAsync("/circles", createCircleReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createdCircle = await createRes.Content.ReadFromJsonAsync<CircleDto>();
        Assert.NotNull(createdCircle);
        Assert.Equal("Sci-Fi Explorers", createdCircle.Name);
        Assert.Equal(1, createdCircle.MemberCount);

        // 2. List public reading circles
        var listRes = await client.GetAsync("/circles");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);

        // 2b. Search filters circles case-insensitively (portable LIKE path).
        var searchRes = await client.GetAsync("/circles?q=sci-fi");
        Assert.Equal(HttpStatusCode.OK, searchRes.StatusCode);
        var search = await searchRes.Content.ReadFromJsonAsync<PagedResult<CircleDto>>();
        Assert.NotNull(search);
        Assert.Contains(search.Items, c => c.Id == createdCircle.Id);

        // 3. Post a message to the circle
        var msgRes = await client.PostAsJsonAsync($"/circles/{createdCircle.Handle}/messages", new CreateCircleMessageRequest("Welcome to the circle!"));
        Assert.Equal(HttpStatusCode.OK, msgRes.StatusCode);
        var createdMsg = await msgRes.Content.ReadFromJsonAsync<CircleMessageDto>();
        Assert.NotNull(createdMsg);
        Assert.Equal("Welcome to the circle!", createdMsg.Content);

        // 4. Another user joins the circle
        var memberClient = _factory.CreateClient();
        var memberEmail = $"member_{Guid.NewGuid():N}@curiomap.local";
        var memberReg = await memberClient.PostAsJsonAsync("/auth/register", new RegisterRequest(memberEmail, "Password123!"));
        var memberAuth = await memberReg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(memberAuth);

        memberClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", memberAuth.AccessToken);
        var joinRes = await memberClient.PostAsync($"/circles/{createdCircle.Handle}/join", null);
        Assert.Equal(HttpStatusCode.OK, joinRes.StatusCode);
    }

    [Fact]
    public async Task Reading_Circles_Enforce_Max_Members()
    {
        // The count-then-insert join path must reject the reader that would
        // exceed MaxMembers (the gate is what the per-circle lock protects).
        var client = _factory.CreateClient();
        var reg = await client.PostAsJsonAsync("/auth/register",
            new RegisterRequest($"cap_lead_{Guid.NewGuid():N}@curiomap.local", "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // Creator occupies slot 1 of 2.
        var createRes = await client.PostAsJsonAsync("/circles",
            new CreateCircleRequest($"Capped Circle {Guid.NewGuid():N}"[..24], null, null, 2, null));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var circle = await createRes.Content.ReadFromJsonAsync<CircleDto>();
        Assert.NotNull(circle);

        async Task<HttpStatusCode> JoinAsNewReader()
        {
            var c = _factory.CreateClient();
            var r = await c.PostAsJsonAsync("/auth/register",
                new RegisterRequest($"cap_{Guid.NewGuid():N}@curiomap.local", "Password123!"));
            var a = await r.Content.ReadFromJsonAsync<AuthResponse>();
            Assert.NotNull(a);
            c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", a.AccessToken);
            var join = await c.PostAsync($"/circles/{circle.Handle}/join", null);
            return join.StatusCode;
        }

        // Slot 2 fills.
        Assert.Equal(HttpStatusCode.OK, await JoinAsNewReader());

        // Slot 3 is refused.
        Assert.Equal(HttpStatusCode.Conflict, await JoinAsNewReader());
    }

    // ── Discovery privacy redaction (AGENTS §2.2.2 / §2.2.3 / §2.2.6) ───────

    /// <summary>Fuzzed coordinates every seeded reader shares (Arlington, VA).</summary>
    private static readonly (double Lat, double Lng) SeedFuzzed = GeoFuzz.Fuzz(38.88, -77.10);

    /// <summary>
    /// Seeds a reader directly through the real DbContext: fuzzed coordinates,
    /// a chosen location visibility, and an optional public "currently reading"
    /// shelf entry (which the map drill-down requires to include a reader).
    /// </summary>
    private (Guid UserId, Guid BookId) SeedReader(
        string country,
        string? region,
        string? city,
        LocationVisibility locationVisibility,
        ShelfVisibility bookshelfVisibility = ShelfVisibility.Public,
        DisplayMode displayMode = DisplayMode.Anonymous,
        bool withReadingBook = false)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var location = new Location
        {
            Country = country,
            Region = region,
            City = city,
            LatFuzzed = SeedFuzzed.Lat,
            LngFuzzed = SeedFuzzed.Lng,
        };
        db.Locations.Add(location);

        var user = new User
        {
            Email = $"seed_{Guid.NewGuid():N}@curiomap.local",
            PasswordHash = "not-a-real-hash",
            Handle = $"seed_reader_{Guid.NewGuid():N}"[..24],
            DisplayNameMode = displayMode,
            Location = location,
            LocationVisibility = locationVisibility,
            BookshelfVisibility = bookshelfVisibility,
        };
        db.Users.Add(user);

        var bookId = Guid.Empty;
        if (withReadingBook)
        {
            var book = new Book { Title = "Seeded Reading Book", Author = "Seeded Author" };
            bookId = book.Id;
            db.Books.Add(book);
            db.BookshelfEntries.Add(new BookshelfEntry
            {
                UserId = user.Id,
                BookId = book.Id,
                Status = BookStatus.Reading,
                Visibility = ShelfVisibility.Public,
            });
        }

        db.SaveChanges();
        return (user.Id, bookId);
    }

    [Fact]
    public async Task Discover_Global_Redacts_Region_For_Country_Only_Readers()
    {
        var country = $"Redactland{Guid.NewGuid():N}"[..24];
        const string region = "HiddenRegion";

        SeedReader(country, region, "HiddenCity", LocationVisibility.Country);
        SeedReader(country, region, "VisibleCity", LocationVisibility.RegionCity);

        var client = _factory.CreateClient();
        var res = await client.GetAsync("/discover/global");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var global = await res.Content.ReadFromJsonAsync<GlobalDiscoveryDto>();
        Assert.NotNull(global);

        var bucketRegions = global.Regions
            .Where(r => r.Country == country)
            .Select(r => r.Region)
            .ToList();

        // Exactly two buckets: the country-only reader is floored to an empty
        // region, while the region_city reader keeps his region name.
        Assert.Equal(2, bucketRegions.Count);
        Assert.Contains(string.Empty, bucketRegions);
        Assert.Contains(region, bucketRegions);
    }

    [Fact]
    public async Task Discover_Global_Excludes_Hidden_And_Private_Shelf_Readers()
    {
        var country = $"Excludeland{Guid.NewGuid():N}"[..24];

        SeedReader(country, "SomeRegion", "SomeCity", LocationVisibility.Hidden);
        SeedReader(country, "SomeRegion", "SomeCity", LocationVisibility.RegionCity, ShelfVisibility.Private);

        var client = _factory.CreateClient();
        var res = await client.GetAsync("/discover/global");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var global = await res.Content.ReadFromJsonAsync<GlobalDiscoveryDto>();
        Assert.NotNull(global);

        Assert.DoesNotContain(global.Regions, r => r.Country == country);
    }

    [Fact]
    public async Task Discover_MapReaders_Redacts_Anonymous_Handle_And_Country_Only_Location()
    {
        var country = $"MapRedact{Guid.NewGuid():N}"[..20];
        var (userId, _) = SeedReader(
            country, "SecretRegion", "SecretCity",
            LocationVisibility.Country, withReadingBook: true);

        var client = _factory.CreateClient();
        var res = await client.GetAsync($"/discover/map-readers?country={Uri.EscapeDataString(country)}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var payload = await res.Content.ReadFromJsonAsync<MapReadersDto>();
        Assert.NotNull(payload);

        var reader = Assert.Single(payload.Readers);
        Assert.Equal(userId, reader.User.Id);

        // Identity separation: anonymous → no handle, curated generic label.
        Assert.Equal("anonymous", reader.User.Handle);
        Assert.Equal("Anonymous Reader", reader.User.DisplayName);

        // Location redaction: country only, never region/city.
        Assert.Equal(country, reader.Country);
        Assert.Null(reader.Region);
        Assert.Null(reader.City);

        // Coordinates are the fuzzed grid values, never the raw input.
        Assert.Equal(SeedFuzzed.Lat, reader.Lat, 6);
        Assert.Equal(SeedFuzzed.Lng, reader.Lng, 6);
        Assert.NotEqual(38.88, reader.Lat, 6);
    }

    [Fact]
    public async Task Discover_MapReaders_Clamps_Limit_To_MaxPageSize()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/discover/map-readers?limit=9999");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // A limit above MaxPageSize must not fail; it is silently clamped to 50.
        var payload = await res.Content.ReadFromJsonAsync<MapReadersDto>();
        Assert.NotNull(payload);
        Assert.True(payload.Readers.Count <= 50);
    }

    [Fact]
    public async Task Discover_Nearby_Redacts_Country_Only_Candidates_And_Excludes_Private_Shelves()
    {
        var country = $"Nearbyland{Guid.NewGuid():N}"[..22];
        const string region = "NearbyRegion";
        const string city = "NearbyCity";

        // Caller: registered normally, region_city visibility so the city scope resolves.
        var caller = _factory.CreateClient();
        var callerEmail = $"nearby_caller_{Guid.NewGuid():N}@curiomap.local";
        var reg = await caller.PostAsJsonAsync("/auth/register", new RegisterRequest(callerEmail, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        caller.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var geo = await caller.PatchAsJsonAsync("/geo/me", new UpdateLocationRequest(country, region, city));
        Assert.Equal(HttpStatusCode.OK, geo.StatusCode);

        var (visibleId, _) = SeedReader(country, region, city, LocationVisibility.Country);

        // Private-shelf reader in the same city must never surface in discovery.
        var privateClient = _factory.CreateClient();
        var privateEmail = $"nearby_private_{Guid.NewGuid():N}@curiomap.local";
        var privateReg = await privateClient.PostAsJsonAsync("/auth/register", new RegisterRequest(privateEmail, "Password123!"));
        var privateAuth = await privateReg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(privateAuth);
        privateClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", privateAuth.AccessToken);
        Assert.Equal(HttpStatusCode.OK,
            (await privateClient.PatchAsJsonAsync("/geo/me", new UpdateLocationRequest(country, region, city))).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await privateClient.PatchAsJsonAsync("/users/me/settings", new UpdateSettingsRequest(null, "private"))).StatusCode);

        var res = await caller.GetAsync("/discover/nearby?limit=50");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var nearby = await res.Content.ReadFromJsonAsync<NearbyDto>();
        Assert.NotNull(nearby);

        // Country-only neighbor is visible, but region/city/coordinates are stripped.
        var visible = nearby.Readers.FirstOrDefault(r => r.User.Id == visibleId);
        Assert.NotNull(visible);
        Assert.Equal(country, visible!.Location.Country);
        Assert.Null(visible.Location.Region);
        Assert.Null(visible.Location.City);
        Assert.Null(visible.Location.LatFuzzed);
        Assert.Null(visible.Location.LngFuzzed);

        // Private-shelf reader is excluded from discovery entirely.
        Assert.DoesNotContain(nearby.Readers, r => r.User.Id == privateAuth.User.Id);
    }

    [Fact]
    public async Task Streak_Leaderboard_Redacts_Anonymous_Handles()
    {
        var seedHandle = $"board_reader_{Guid.NewGuid():N}"[..24];

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var anon = new User
            {
                Email = $"board_{Guid.NewGuid():N}@curiomap.local",
                PasswordHash = "not-a-real-hash",
                Handle = seedHandle,
                DisplayNameMode = DisplayMode.Anonymous,
                BookshelfVisibility = ShelfVisibility.Public,
            };
            db.Users.Add(anon);
            db.ReadingStreaks.Add(new ReadingStreak
            {
                UserId = anon.Id,
                CurrentStreak = 9,
                LongestStreak = 12,
            });
            db.SaveChanges();
        }

        var client = _factory.CreateClient();
        var res = await client.GetAsync("/streaks/leaderboard");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var entries = await res.Content.ReadFromJsonAsync<List<LeaderboardEntryDto>>();
        Assert.NotNull(entries);

        Assert.NotEmpty(entries);
        // Anonymous display mode must never surface the stored handle.
        Assert.DoesNotContain(entries, e => e.Handle == seedHandle);
        Assert.All(entries, e => Assert.False(string.IsNullOrWhiteSpace(e.DisplayName)));
        Assert.Contains(entries, e => e.Handle == "anonymous");
    }

    [Fact]
    public async Task Thread_Excludes_Muted_And_Deleted_Messages()
    {
        Guid conversationId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var author = new User
            {
                Email = $"mod_author_{Guid.NewGuid():N}@curiomap.local",
                PasswordHash = "not-a-real-hash",
                Handle = $"mod_author_{Guid.NewGuid():N}"[..24],
            };
            db.Users.Add(author);
            var conversation = new Conversation { Title = "Moderation test thread", CreatedBy = author.Id };
            db.Conversations.Add(conversation);
            db.Messages.AddRange(
                new Message { ConversationId = conversation.Id, AuthorId = author.Id, Content = "visible one", Status = MessageStatus.Visible },
                new Message { ConversationId = conversation.Id, AuthorId = author.Id, Content = "muted one", Status = MessageStatus.Muted },
                new Message { ConversationId = conversation.Id, AuthorId = author.Id, Content = "deleted one", Status = MessageStatus.Deleted });
            db.SaveChanges();
            conversationId = conversation.Id;
        }

        var client = _factory.CreateClient();
        var res = await client.GetAsync($"/conversations/{conversationId}/messages");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var page = await res.Content.ReadFromJsonAsync<MessagesPage<MessageDto>>();
        Assert.NotNull(page);

        // AGENTS §2.4.2: muted/deleted messages are excluded from public thread
        // queries — not returned blanked out. Total must reflect visible only.
        Assert.Equal(1, page.Total);
        Assert.Single(page.Items);
        Assert.Equal("visible one", page.Items[0].Content);
    }

    [Fact]
    public async Task Rating_Out_Of_Range_Value_Is_Bad_Request()
    {
        var (_, bookId) = SeedReader(
            $"Ratingland{Guid.NewGuid():N}"[..20], null, null,
            LocationVisibility.RegionCity, withReadingBook: true);

        var client = _factory.CreateClient();
        var email = $"rater_{Guid.NewGuid():N}@curiomap.local";
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var tooHigh = await client.PutAsJsonAsync($"/books/{bookId}/rating", new RateBookRequest(6));
        Assert.Equal(HttpStatusCode.BadRequest, tooHigh.StatusCode);

        var tooLow = await client.PutAsJsonAsync($"/books/{bookId}/rating", new RateBookRequest(0));
        Assert.Equal(HttpStatusCode.BadRequest, tooLow.StatusCode);
    }

    [Fact]
    public async Task Challenge_Invalid_Year_Is_Bad_Request()
    {
        var client = _factory.CreateClient();
        var email = $"challenge_{Guid.NewGuid():N}@curiomap.local";
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // `?year=0` must not reach DateTime construction and 500.
        var zero = await client.GetAsync("/me/challenge?year=0");
        Assert.Equal(HttpStatusCode.BadRequest, zero.StatusCode);

        var future = await client.GetAsync("/me/challenge?year=99999");
        Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
    }

    [Fact]
    public async Task Challenge_Average_Is_Fractional_Not_Integer_Division()
    {
        // Regression: `finished / monthsElapsed` truncated to 0 whenever the
        // reader had finished fewer books than whole months elapsed. The DTO
        // must carry a double so 1 book in month 9 renders as ~0.11, not 0.
        var client = _factory.CreateClient();
        var email = $"challenge_avg_{Guid.NewGuid():N}@curiomap.local";
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        var (_, bookId) = SeedReader(
            $"Avgland{Guid.NewGuid():N}"[..20], null, null,
            LocationVisibility.RegionCity, withReadingBook: true);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // Finish one book so the challenge numerator is 1.
        var add = await client.PostAsJsonAsync("/bookshelf", new AddBookshelfRequest(bookId, "finished", "public"));
        Assert.Equal(HttpStatusCode.OK, add.StatusCode);

        var res = await client.GetAsync("/me/challenge");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var stats = await res.Content.ReadFromJsonAsync<ChallengeStatsDto>();
        Assert.NotNull(stats);

        Assert.Equal(1, stats.Finished);
        // Months elapsed is at least 1, so a single finished book must never
        // read as a truncated 0 (the old integer-division bug).
        Assert.True(stats.Average > 0, $"Average was {stats.Average}; integer division regression.");
        Assert.Equal(1.0 / Math.Max(1, DateTime.UtcNow.Month), stats.Average, precision: 4);
    }

    [Fact]
    public async Task Seed_Gate_Demo_Scripts_Are_Classified_Correctly()
    {
        // Regression: demo-reader seeds (0013-0014) must never run in prod.
        // DbInitializer skips them when Seed:DemoReaders=false; the catalog
        // seeds (0010-0012) are product data and always apply.
        Assert.False(DbInitializer.IsDemoSeedScript(
            "CurioMap.Api.Data.Migrations.0010_seed_books_1.sql"));
        Assert.False(DbInitializer.IsDemoSeedScript(
            "CurioMap.Api.Data.Migrations.0012_seed_books_3.sql"));
        Assert.True(DbInitializer.IsDemoSeedScript(
            "CurioMap.Api.Data.Migrations.0013_seed_demo_readers.sql"));
        Assert.True(DbInitializer.IsDemoSeedScript(
            "CurioMap.Api.Data.Migrations.0014_seed_ratings_challenges.sql"));
        Assert.True(DbInitializer.IsDemoSeedScript("0013_anything.sql"));
        Assert.False(DbInitializer.IsDemoSeedScript("0008_fix_ratings_challenges.sql"));
    }

    [Fact]
    public async Task Conversation_Read_Does_Not_Persist_Archive_Flag()
    {
        // Regression: GET /conversations/{id} used to run ExecuteUpdateAsync,
        // mutating state on a read. Reads must be side-effect free — staleness
        // is derived for the response instead.
        Guid conversationId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var author = new User
            {
                Email = $"archiver_{Guid.NewGuid():N}@curiomap.local",
                PasswordHash = "not-a-real-hash",
                Handle = $"archiver_{Guid.NewGuid():N}"[..24],
            };
            db.Users.Add(author);
            var conversation = new Conversation
            {
                Title = "Stale thread",
                CreatedBy = author.Id,
                LastActivityAt = DateTime.UtcNow.AddDays(-400),
            };
            db.Conversations.Add(conversation);
            db.SaveChanges();
            conversationId = conversation.Id;
        }

        var client = _factory.CreateClient();
        var res = await client.GetAsync($"/conversations/{conversationId}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var dto = await res.Content.ReadFromJsonAsync<ConversationDto>();
        Assert.NotNull(dto);

        // The response reports the derived (stale) state...
        Assert.True(dto.IsArchived);

        // ...but the row itself was never mutated by the read.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var stored = await db.Conversations.AsNoTracking().FirstAsync(c => c.Id == conversationId);
            Assert.False(stored.IsArchived);
        }
    }

    [Fact]
    public async Task Streak_Read_Decays_For_Idle_Readers()
    {
        // Regression: a stored streak with no activity today/yesterday used to be
        // returned verbatim, so long-idle readers kept ranking forever.
        Guid userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = new User
            {
                Email = $"idle_{Guid.NewGuid():N}@curiomap.local",
                PasswordHash = "not-a-real-hash",
                Handle = $"idle_{Guid.NewGuid():N}"[..24],
            };
            db.Users.Add(user);
            db.ReadingStreaks.Add(new ReadingStreak
            {
                UserId = user.Id,
                CurrentStreak = 12,
                LongestStreak = 12,
                LastActivityAt = DateTime.UtcNow.AddDays(-9),
            });
            db.SaveChanges();
            userId = user.Id;
        }

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/users/{userId}/streak");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var streak = await res.Content.ReadFromJsonAsync<StreakStatsDto>();
        Assert.NotNull(streak);

        Assert.Equal(0, streak.CurrentStreak);
        Assert.False(streak.ActiveToday);
        // Longest is a historical fact and must survive the decay.
        Assert.Equal(12, streak.LongestStreak);
    }

    [Fact]
    public async Task Book_Search_Is_Case_Insensitive_And_Treats_Wildcards_As_Literals()
    {
        // Portable search path: replaces Postgres-only ILike (no SQLite
        // translation), so the tested path now matches production behavior.
        var title = $"Zephyrx{Guid.NewGuid():N}"[..20];
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Books.Add(new Book { Title = title, Author = "Casey Insensitive" });
            db.SaveChanges();
        }

        var client = _factory.CreateClient();

        var upper = await client.GetAsync($"/books/search?q={Uri.EscapeDataString(title.ToUpperInvariant())}");
        Assert.Equal(HttpStatusCode.OK, upper.StatusCode);
        var upperPage = await upper.Content.ReadFromJsonAsync<SearchResponse>();
        Assert.NotNull(upperPage);
        Assert.Contains(upperPage.Items, b => b.Title == title);

        var lower = await client.GetAsync($"/books/search?q={Uri.EscapeDataString(title.ToLowerInvariant())}");
        Assert.Equal(HttpStatusCode.OK, lower.StatusCode);
        var lowerPage = await lower.Content.ReadFromJsonAsync<SearchResponse>();
        Assert.NotNull(lowerPage);
        Assert.Contains(lowerPage.Items, b => b.Title == title);

        // `%` is a literal here, not a wildcard: it must not match everything.
        var wildcard = await client.GetAsync("/books/search?q=%25%25");
        Assert.Equal(HttpStatusCode.OK, wildcard.StatusCode);
        var wildcardPage = await wildcard.Content.ReadFromJsonAsync<SearchResponse>();
        Assert.NotNull(wildcardPage);
        Assert.DoesNotContain(wildcardPage.Items, b => b.Title == title);
    }

    [Fact]
    public async Task Auth_Register_And_Login_Are_Case_Insensitive_On_Email()
    {
        // Regression: the unique index is lower(email) while the pre-check compared
        // raw values, so mixed-case duplicates bypassed the 409 and mixed-case
        // logins missed existing lowercased rows.
        var local = $"cased_{Guid.NewGuid():N}".ToLowerInvariant();
        var email = $"{local}@curiomap.local";
        const string password = "Password123!";

        var client = _factory.CreateClient();
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);

        var upperEmail = $"{local.ToUpperInvariant()}@CURIOMAP.LOCAL";

        // Same address, different casing → conflict, not a second account.
        var duplicate = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(upperEmail, password));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        // Login with the upper-cased form still resolves the same account.
        var login = await client.PostAsJsonAsync("/auth/login", new LoginRequest(upperEmail, password));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var loginData = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(loginData);
        Assert.Equal(email, loginData.User.Email);
    }
}
