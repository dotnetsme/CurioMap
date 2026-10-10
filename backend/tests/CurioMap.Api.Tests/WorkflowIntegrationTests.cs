using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CurioMap.Api.Common;
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
    public async Task Remaining_Routes_Return_Expected_Authorization_And_NotFound_Outcomes()
    {
        var client = _factory.CreateClient();
        var registration = await client.PostAsJsonAsync(
            "/auth/register",
            new RegisterRequest($"route_{Guid.NewGuid():N}@curiomap.local", "Password123!"));
        var auth = await registration.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var missingBook = Guid.NewGuid();
        var missingUser = Guid.NewGuid();
        var missingEntry = Guid.NewGuid();
        var missingMessage = Guid.NewGuid();
        var missingCircle = $"missing-{Guid.NewGuid():N}";

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/auth/me/terms")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/auth/me/terms/accept", new AcceptTermsRequest(true))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/stats/summary")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/discover/top-books")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/bookshelf/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/books/import", new ImportBookRequest("9780132350884"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/books/{missingBook}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/books/{missingBook}/conversations")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/bookshelf/{missingEntry}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/me/challenge", new SetChallengeTargetRequest(12))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync("/geo/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/geo/me", new UpdateLocationRequest("United States", "Virginia", "Arlington"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/users/{auth.User.Id}/followers")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/users/{auth.User.Id}/following")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/users/{auth.User.Id}/streak/calendar")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.DeleteAsync($"/follow/{missingUser}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/users/me/settings")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync($"/messages/{missingMessage}/report", new ReportRequest("route coverage"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PatchAsJsonAsync($"/messages/{missingMessage}", new SetMessageStatusRequest("deleted"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync($"/messages/{missingMessage}/reactions", new ReactRequest("insightful"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.DeleteAsync($"/messages/{missingMessage}/reactions?kind=insightful")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/books/{missingBook}/rating")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/circles/{missingCircle}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync($"/circles/{missingCircle}/leave", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/circles/{missingCircle}/messages")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/circles/{missingCircle}/streak")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync($"/circles/{missingCircle}/messages/{missingMessage}/react", new ReactRequest("insightful"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/circles/{missingCircle}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync("/admin/gamification/backfill", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/admin/reports")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync($"/admin/reports/{Guid.NewGuid()}/resolve", new ResolveReportRequest("dismiss"))).StatusCode);
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
        bool withReadingBook = false,
        string? topic = null)
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
            var book = new Book { Title = "Seeded Reading Book", Author = "Seeded Author", Topic = topic };
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
    public async Task Discover_Topics_Returns_Active_Curiosity_Vectors()
    {
        var topic = $"Curiosity_{Guid.NewGuid():N}"[..18];
        var country = $"TopicLand_{Guid.NewGuid():N}"[..20];
        SeedReader(country, "TopicRegion", "TopicCity", LocationVisibility.RegionCity, withReadingBook: true, topic: topic);

        var client = _factory.CreateClient();
        var res = await client.GetAsync("/discover/topics");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var topics = await res.Content.ReadFromJsonAsync<List<TopicStatDto>>();
        Assert.NotNull(topics);
        Assert.Contains(topics, t => t.Topic == topic && t.ReaderCount >= 1);
    }

    [Fact]
    public async Task Discover_Global_And_MapReaders_Filter_By_Curiosity_Topic()
    {
        var targetTopic = $"Target_{Guid.NewGuid():N}"[..18];
        var otherTopic = $"Other_{Guid.NewGuid():N}"[..18];

        var targetCountry = $"TargetLand_{Guid.NewGuid():N}"[..22];
        var otherCountry = $"OtherLand_{Guid.NewGuid():N}"[..22];

        SeedReader(targetCountry, "TargetRegion", "TargetCity", LocationVisibility.RegionCity, withReadingBook: true, topic: targetTopic);
        SeedReader(otherCountry, "OtherRegion", "OtherCity", LocationVisibility.RegionCity, withReadingBook: true, topic: otherTopic);

        var client = _factory.CreateClient();

        // 1. Global topic filter
        var globalRes = await client.GetAsync($"/discover/global?topic={Uri.EscapeDataString(targetTopic)}");
        Assert.Equal(HttpStatusCode.OK, globalRes.StatusCode);
        var global = await globalRes.Content.ReadFromJsonAsync<GlobalDiscoveryDto>();
        Assert.NotNull(global);
        Assert.Contains(global.Regions, r => r.Country == targetCountry);
        Assert.DoesNotContain(global.Regions, r => r.Country == otherCountry);

        // 2. Map-readers topic filter
        var mapRes = await client.GetAsync($"/discover/map-readers?topic={Uri.EscapeDataString(targetTopic)}");
        Assert.Equal(HttpStatusCode.OK, mapRes.StatusCode);
        var map = await mapRes.Content.ReadFromJsonAsync<MapReadersDto>();
        Assert.NotNull(map);
        Assert.Contains(map.Readers, r => r.Country == targetCountry);
        Assert.DoesNotContain(map.Readers, r => r.Country == otherCountry);
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
    public async Task Conversations_Create_Salon_And_Filter_By_Curiosity_Topic()
    {
        var topic = $"Salon_{Guid.NewGuid():N}"[..18];
        var otherTopic = $"OtherSalon_{Guid.NewGuid():N}"[..18];

        var client = _factory.CreateClient();
        var email = $"salon_creator_{Guid.NewGuid():N}@curiomap.local";
        var reg = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, "Password123!"));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // 1. Create open curiosity salon without a book
        var createRes = await authClient.PostAsJsonAsync("/conversations", new CreateConversationRequest(
            Title: "Exploring the Nature of Curiosity",
            TopicType: "general",
            PromptKey: null,
            Topic: topic));
        Assert.Equal(HttpStatusCode.OK, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<ConversationDto>();
        Assert.NotNull(created);
        Assert.Equal(topic, created.Topic);
        Assert.Null(created.BookId);

        // 2. Create another salon under a different topic
        var otherRes = await authClient.PostAsJsonAsync("/conversations", new CreateConversationRequest(
            Title: "Different Topic Salon",
            TopicType: "general",
            PromptKey: null,
            Topic: otherTopic));
        Assert.Equal(HttpStatusCode.OK, otherRes.StatusCode);

        // 3. Query GET /conversations?topic={topic}
        var listRes = await client.GetAsync($"/conversations?topic={Uri.EscapeDataString(topic)}");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var paged = await listRes.Content.ReadFromJsonAsync<PagedResult<ConversationDto>>();
        Assert.NotNull(paged);
        Assert.Contains(paged.Items, c => c.Id == created.Id && c.Topic == topic);
        Assert.DoesNotContain(paged.Items, c => c.Topic == otherTopic);
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

    // ── Feed privacy: private shelf entries never reach followers (AGENTS §2.2.4) ──

    /// <summary>Registers a reader through the real API and returns an authenticated client.</summary>
    private async Task<(HttpClient Client, AuthResponse Auth)> RegisterFeedReaderAsync(string prefix)
    {
        var client = _factory.CreateClient();
        var reg = await client.PostAsJsonAsync("/auth/register",
            new RegisterRequest($"{prefix}_{Guid.NewGuid():N}@curiomap.local", "Password123!"));
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return (client, auth);
    }

    /// <summary>Creates a book straight through the DbContext (tests seed no catalog).</summary>
    private Guid CreateFeedBook(string title)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var book = new Book { Title = title, Author = "Feed Author" };
        db.Books.Add(book);
        db.SaveChanges();
        return book.Id;
    }

    private async Task<List<FeedEventDto>> ReadFeedAsync(HttpClient client)
    {
        var res = await client.GetAsync("/feed");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var page = await res.Content.ReadFromJsonAsync<FeedPage>();
        Assert.NotNull(page);
        return page.Items.ToList();
    }

    [Fact]
    public async Task Feed_Never_Shows_Private_Shelf_Entries_To_Followers()
    {
        var (follower, _) = await RegisterFeedReaderAsync("feed_private_follower");
        var (author, authorAuth) = await RegisterFeedReaderAsync("feed_private_author");

        var follow = await follower.PostAsync($"/follow/{authorAuth.User.Id}", null);
        Assert.Equal(HttpStatusCode.OK, follow.StatusCode);

        var bookId = CreateFeedBook("Never Advertised Book");
        var add = await author.PostAsJsonAsync("/bookshelf", new AddBookshelfRequest(bookId, "reading", "private"));
        Assert.Equal(HttpStatusCode.OK, add.StatusCode);

        // Regression: the shelf add used to emit an unconditional activity event, so a
        // follower saw the title, author and cover of a private shelf entry.
        var items = await ReadFeedAsync(follower);
        Assert.DoesNotContain(items, e => e.Book?.Id == bookId);
        Assert.DoesNotContain(items, e => e.Type == ActivityService.BookshelfAdded);
    }

    [Fact]
    public async Task Feed_Hides_Historical_Shelf_Event_When_Entry_Becomes_Private()
    {
        var (follower, _) = await RegisterFeedReaderAsync("feed_flip_follower");
        var (author, authorAuth) = await RegisterFeedReaderAsync("feed_flip_author");
        Assert.Equal(HttpStatusCode.OK, (await follower.PostAsync($"/follow/{authorAuth.User.Id}", null)).StatusCode);

        var bookId = CreateFeedBook("Flip To Private Book");
        var add = await author.PostAsJsonAsync("/bookshelf", new AddBookshelfRequest(bookId, "reading", "public"));
        Assert.Equal(HttpStatusCode.OK, add.StatusCode);
        var entry = await add.Content.ReadFromJsonAsync<BookshelfEntryDto>();
        Assert.NotNull(entry);

        // Positive control: a public add IS advertised to followers.
        Assert.Contains(await ReadFeedAsync(follower), e => e.Book?.Id == bookId);

        // Flip to private: the historical event must disappear, not linger.
        var flip = await author.PatchAsJsonAsync($"/bookshelf/{entry.Id}", new UpdateBookshelfRequest(null, "private", null, null));
        Assert.Equal(HttpStatusCode.OK, flip.StatusCode);
        Assert.DoesNotContain(await ReadFeedAsync(follower), e => e.Book?.Id == bookId);

        // Flip back to public: the event is re-published rather than lost forever.
        var back = await author.PatchAsJsonAsync($"/bookshelf/{entry.Id}", new UpdateBookshelfRequest(null, "public", null, null));
        Assert.Equal(HttpStatusCode.OK, back.StatusCode);
        Assert.Contains(await ReadFeedAsync(follower), e => e.Book?.Id == bookId);
    }

    [Fact]
    public async Task Feed_Excludes_Shelf_Events_When_The_Reader_Goes_Private_Globally()
    {
        var (follower, _) = await RegisterFeedReaderAsync("feed_global_follower");
        var (author, authorAuth) = await RegisterFeedReaderAsync("feed_global_author");
        Assert.Equal(HttpStatusCode.OK, (await follower.PostAsync($"/follow/{authorAuth.User.Id}", null)).StatusCode);

        var bookId = CreateFeedBook("Global Visibility Book");
        var add = await author.PostAsJsonAsync("/bookshelf", new AddBookshelfRequest(bookId, "reading", "public"));
        Assert.Equal(HttpStatusCode.OK, add.StatusCode);
        Assert.Contains(await ReadFeedAsync(follower), e => e.Book?.Id == bookId);

        // The reader-level privacy switch must retro-hide shelf activity even though the
        // per-entry visibility was never touched.
        var settings = await author.PatchAsJsonAsync("/users/me/settings", new UpdateSettingsRequest(null, "private"));
        Assert.Equal(HttpStatusCode.OK, settings.StatusCode);

        Assert.DoesNotContain(await ReadFeedAsync(follower), e => e.Book?.Id == bookId);
    }

    [Fact]
    public async Task Geo_Ip_Ignores_Spoofed_Country_Header_From_An_Untrusted_Remote()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-geo-country", "US");

        var response = await client.GetAsync("/geo/ip");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var geo = await response.Content.ReadFromJsonAsync<IpGeoDto>();
        Assert.NotNull(geo);

        // TestServer has no socket peer, so it is not inside any trusted network: the
        // endpoint must fail closed rather than echo the spoofed header.
        Assert.Equal("none", geo.Source);
        Assert.Null(geo.Country);
    }

    [Fact]
    public async Task Geo_Ip_Returns_None_When_No_Country_Header_Is_Present()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/geo/ip");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var geo = await response.Content.ReadFromJsonAsync<IpGeoDto>();
        Assert.NotNull(geo);
        Assert.Equal("none", geo.Source);
        Assert.Null(geo.Country);
    }

    [Fact]
    public async Task SeedStyle_Lowercase_Visibility_Row_Fails_Materialization()
    {
        // Documents why 0017_normalize_enum_casing.sql exists and why its CHECKs are not
        // optional: EF's enum converter reads case-sensitively, so a legacy lowercase
        // row ('region_city') does not silently filter - it throws on materialization,
        // which surfaces as a 500 in any endpoint that loads that row. The migration
        // eliminates the rows; the CHECKs stop them coming back.
        var lowerEmail = $"lower_{Guid.NewGuid():N}@curiomap.local";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.ExecuteSqlRaw(
                "INSERT INTO users (id, email, password_hash, handle, avatar_id, display_name_mode, bio, location_visibility, bookshelf_visibility, is_admin, is_author, terms_accepted_at, created_at, updated_at) " +
                "VALUES ({0}, {1}, {2}, {3}, 'curio-01', 'anonymous', NULL, 'region_city', 'public', 0, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                Guid.NewGuid(), lowerEmail, "not-a-real-hash", $"lower_reader_{Guid.NewGuid():N}"[..24]);
        }

        using var readScope = _factory.Services.CreateScope();
        var reader = readScope.ServiceProvider.GetRequiredService<AppDbContext>();
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            reader.Users.SingleAsync(u => u.Email == lowerEmail));
    }

    [Fact]
    public async Task Feed_Drops_Message_Events_Once_A_Message_Is_Hidden()
    {
        var (follower, _) = await RegisterFeedReaderAsync("feed_mod_follower");
        var (_, authorAuth) = await RegisterFeedReaderAsync("feed_mod_author");
        Assert.Equal(HttpStatusCode.OK, (await follower.PostAsync($"/follow/{authorAuth.User.Id}", null)).StatusCode);

        Guid messageId;
        Guid conversationId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var book = new Book { Title = "Moderated Feed Book", Author = "Feed Author" };
            db.Books.Add(book);
            var conversation = new Conversation
            {
                BookId = book.Id,
                CreatedBy = authorAuth.User.Id,
                Title = "Moderated thread",
                TopicType = TopicType.General,
            };
            db.Conversations.Add(conversation);
            var message = new Message
            {
                ConversationId = conversation.Id,
                AuthorId = authorAuth.User.Id,
                Content = "an excerpt that must not survive moderation",
                Status = MessageStatus.Visible,
            };
            db.Messages.Add(message);
            db.ActivityEvents.Add(new ActivityEvent
            {
                ActorId = authorAuth.User.Id,
                Type = ActivityService.MessagePosted,
                BookId = book.Id,
                ConversationId = conversation.Id,
                MessageId = message.Id,
            });
            db.SaveChanges();
            messageId = message.Id;
            conversationId = conversation.Id;
        }

        Assert.Contains(await ReadFeedAsync(follower), e => e.Conversation?.Id == conversationId);

        // Moderation hides the message (PATCH /messages/{id} needs the Admin policy, which
        // is asserted separately), so a direct status change stands in for it here.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var message = await db.Messages.FirstAsync(m => m.Id == messageId);
            message.Status = MessageStatus.Deleted;
            await db.SaveChangesAsync();
        }

        // AGENTS §2.4.2: a hidden message must not resurface as a feed excerpt.
        Assert.DoesNotContain(await ReadFeedAsync(follower), e => e.Conversation?.Id == conversationId);
    }

    [Fact]
    public async Task Auth_Refresh_Token_Reuse_Invalidates_The_Whole_Family()
    {
        // The API resolves the refresh token cookie-first and only falls back to the body
        // for non-browser clients. In-memory clients also keep a cookie jar, so every
        // refresh below runs on a cookie-free client and names its token in the body -
        // the only way to deterministically present a STALE token after a newer one.
        string? rawRefresh;
        using (var bootstrap = _factory.CreateClient())
        {
            var reg = await bootstrap.PostAsJsonAsync("/auth/register",
                new RegisterRequest($"theft_{Guid.NewGuid():N}@curiomap.local", "Password123!"));
            Assert.Equal(HttpStatusCode.OK, reg.StatusCode);
            Assert.True(reg.Headers.TryGetValues("Set-Cookie", out var cookies));
            rawRefresh = CaptureRefreshCookie(cookies);
            Assert.False(string.IsNullOrWhiteSpace(rawRefresh));
        }

        // First rotation succeeds: token #1 is consumed, token #2 is issued.
        string? rotatedRaw;
        AuthResponse? rotatedAuth;
        using (var rotator = _factory.CreateClient())
        {
            var first = await PostRefreshAsync(rotator, rawRefresh);
            Assert.Equal(HttpStatusCode.OK, first.StatusCode);
            Assert.True(first.Headers.TryGetValues("Set-Cookie", out var rotatedCookies));
            rotatedRaw = CaptureRefreshCookie(rotatedCookies);
            rotatedAuth = await first.Content.ReadFromJsonAsync<AuthResponse>();
            Assert.NotNull(rotatedAuth);
        }

        // Reusing the consumed token is theft: 401 immediately, AND the whole live family
        // is wiped, so the freshly rotated token #2 dies with it.
        using (var attacker = _factory.CreateClient())
        {
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await PostRefreshAsync(attacker, rawRefresh)).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await PostRefreshAsync(attacker, rotatedRaw)).StatusCode);
        }

        // Boundary this test documents: the bearer access token minted before the wipe
        // still verifies, because it carries no server-side state. Family invalidation
        // (refresh-chain death) - not access-token revocation - is the theft response
        // defined by ADR 0004.
        using (var victim = _factory.CreateClient())
        {
            victim.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", rotatedAuth!.AccessToken);
            Assert.Equal(HttpStatusCode.OK, (await victim.GetAsync("/auth/me")).StatusCode);
        }
    }

    private static async Task<HttpResponseMessage> PostRefreshAsync(HttpClient client, string? raw)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/auth/refresh")
        {
            Content = JsonContent.Create(new RefreshRequest(raw)),
        };
        return await client.SendAsync(request);
    }

    private static string CaptureRefreshCookie(IEnumerable<string> setCookies)
    {
        foreach (var header in setCookies)
        {
            var pair = header.Split(';', 2, StringSplitOptions.TrimEntries)[0].Split('=', 2);
            if (pair.Length == 2 && pair[0].Equals("curio_rt", StringComparison.OrdinalIgnoreCase))
            {
                return pair[1];
            }
        }

        throw new InvalidOperationException("No curio_rt cookie was set by the auth endpoint.");
    }

    [Fact]
    public async Task OpenApi_Document_Is_Served_In_Development()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Security_Headers_Are_On_Every_Response()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("X-Content-Type-Options", out var nosniff));
        Assert.Equal("nosniff", nosniff.First());
        Assert.True(response.Headers.TryGetValues("X-Frame-Options", out var frame));
        Assert.Equal("DENY", frame.First());
        Assert.True(response.Headers.TryGetValues("Referrer-Policy", out var referrer));
        Assert.Equal("strict-origin-when-cross-origin", referrer.First());
        Assert.True(response.Headers.TryGetValues("Content-Security-Policy", out var csp));
        Assert.Contains("default-src 'none'", csp.First());

        // HSTS over the plaintext dev loop is meaningless - its presence is pinned by
        // ProductionEnvironmentTests instead.
        Assert.False(response.Headers.Contains("Strict-Transport-Security"));
    }

    [Fact]
    public async Task Book_Search_Clamps_Limit_And_Offset()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/books/search?q=the&limit=500&offset=999999");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.ReadFromJsonAsync<SearchResponse>();
        Assert.NotNull(page);
        Assert.True(page.Items.Count <= PageBounds.MaxPageSize);
    }

    [Fact]
    public async Task Handle_Profanity_Is_Rejected()
    {
        var (client, _) = await RegisterFeedReaderAsync("handle_prof");

        var flagged = await client.PatchAsJsonAsync("/users/me",
            new UpdateProfileRequest("asshole_reader", null, null, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, flagged.StatusCode);

        // Positive control: a clean handle still updates.
        var clean = await client.PatchAsJsonAsync("/users/me",
            new UpdateProfileRequest($"clean_reader_{Guid.NewGuid():N}"[..24], null, null, null, null));
        Assert.Equal(HttpStatusCode.OK, clean.StatusCode);
    }
}
