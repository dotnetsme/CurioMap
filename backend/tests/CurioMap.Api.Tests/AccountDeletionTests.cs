using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CurioMap.Api.Tests;

public class AccountDeletionTests : IClassFixture<CurioMapTestFactory>
{
    private const string Password = "Password123!";
    private readonly CurioMapTestFactory _factory;

    public AccountDeletionTests(CurioMapTestFactory factory)
    {
        _factory = factory;
    }

    private sealed record Reader(HttpClient Client, Guid Id, string Email);

    private async Task<Reader> RegisterAsync()
    {
        var client = _factory.CreateClient();
        var email = $"del_{Guid.NewGuid():N}@curiomap.local";
        var res = await client.PostAsJsonAsync("/auth/register", new RegisterRequest(email, Password, true));
        res.EnsureSuccessStatusCode();
        var auth = (await res.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return new Reader(client, auth.User.Id, email);
    }

    private async Task<Guid> SeedBookAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var book = new Book { Title = $"Deletion test {Guid.NewGuid():N}", Author = "QA" };
        db.Books.Add(book);
        await db.SaveChangesAsync();
        return book.Id;
    }

    private async Task<Guid> StartConversationAsync(Reader reader, Guid bookId)
    {
        var res = await reader.Client.PostAsJsonAsync(
            $"/books/{bookId}/conversations",
            new CreateConversationRequest("Thread for deletion test", "General", null));
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<ConversationDto>())!.Id;
    }

    private static Task<HttpResponseMessage> PostMessageAsync(Reader reader, Guid conversationId, string text) =>
        reader.Client.PostAsJsonAsync($"/conversations/{conversationId}/messages", new CreateMessageRequest(text));

    private Task<T> QueryAsync<T>(Func<AppDbContext, Task<T>> query)
    {
        var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return query(db).ContinueWith(t => { scope.Dispose(); return t.Result; });
    }

    [Fact]
    public async Task Wrong_Password_Is_Forbidden_And_Keeps_The_Account()
    {
        var reader = await RegisterAsync();

        var res = await reader.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest("not-the-password"));

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        Assert.True(await QueryAsync(db => db.Users.AnyAsync(u => u.Id == reader.Id)));
    }

    [Fact]
    public async Task Requires_Authentication()
    {
        var res = await _factory.CreateClient().PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password));

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Deleting_Removes_The_Account_Its_Messages_And_Blocks_Login()
    {
        var bookId = await SeedBookAsync();
        var author = await RegisterAsync();
        var other = await RegisterAsync();

        // `other` starts the thread; `author` posts in it and shelves the book.
        var conversationId = await StartConversationAsync(other, bookId);
        Assert.Equal(HttpStatusCode.OK, (await PostMessageAsync(author, conversationId, "to be deleted")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await PostMessageAsync(other, conversationId, "stays")).StatusCode);

        var res = await author.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password));

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.False(await QueryAsync(db => db.Users.AnyAsync(u => u.Id == author.Id)));
        Assert.False(await QueryAsync(db => db.Messages.AnyAsync(m => m.AuthorId == author.Id)));
        Assert.True(await QueryAsync(db => db.Messages.AnyAsync(m => m.AuthorId == other.Id && m.ConversationId == conversationId)));

        var login = await _factory.CreateClient().PostAsJsonAsync("/auth/login", new LoginRequest(author.Email, Password));
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task A_Deleted_Readers_Existing_Access_Token_Stops_Working()
    {
        var reader = await RegisterAsync();
        Assert.Equal(HttpStatusCode.OK, (await reader.Client.GetAsync("/auth/me")).StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await reader.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password))).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await reader.Client.GetAsync("/auth/me")).StatusCode);
    }

    [Fact]
    public async Task A_Thread_Others_Replied_To_Survives_Under_The_Deleted_Reader_Placeholder()
    {
        var bookId = await SeedBookAsync();
        var starter = await RegisterAsync();
        var replier = await RegisterAsync();
        var conversationId = await StartConversationAsync(starter, bookId);
        Assert.Equal(HttpStatusCode.OK, (await PostMessageAsync(replier, conversationId, "a reply that must survive")).StatusCode);

        var res = await starter.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password));

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(
            AccountDeletionService.DeletedReaderId,
            await QueryAsync(db => db.Conversations.Where(c => c.Id == conversationId).Select(c => c.CreatedBy).SingleAsync()));
        Assert.True(await QueryAsync(db => db.Messages.AnyAsync(m => m.ConversationId == conversationId && m.AuthorId == replier.Id)));
    }

    [Fact]
    public async Task A_Placeholder_Owned_Thread_Is_Removed_When_Its_Last_Replier_Deletes_Too()
    {
        var bookId = await SeedBookAsync();
        var starter = await RegisterAsync();
        var replier = await RegisterAsync();
        var conversationId = await StartConversationAsync(starter, bookId);
        Assert.Equal(HttpStatusCode.OK, (await PostMessageAsync(replier, conversationId, "the only reply")).StatusCode);

        // Starter leaves first: the thread survives under the placeholder because of the reply.
        Assert.Equal(HttpStatusCode.OK,
            (await starter.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password))).StatusCode);
        Assert.True(await QueryAsync(db => db.Conversations.AnyAsync(c => c.Id == conversationId)));

        // The replier leaves: no replies remain, so the placeholder-owned thread must go too.
        Assert.Equal(HttpStatusCode.OK,
            (await replier.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password))).StatusCode);
        Assert.False(await QueryAsync(db => db.Conversations.AnyAsync(c => c.Id == conversationId)));
    }

    [Fact]
    public async Task A_Thread_Nobody_Replied_To_Is_Deleted()
    {
        var bookId = await SeedBookAsync();
        var starter = await RegisterAsync();
        var conversationId = await StartConversationAsync(starter, bookId);

        var res = await starter.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password));

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.False(await QueryAsync(db => db.Conversations.AnyAsync(c => c.Id == conversationId)));
    }

    [Fact]
    public async Task A_Circle_Passes_To_The_Longest_Standing_Member_Or_Is_Deleted_When_Empty()
    {
        var owner = await RegisterAsync();
        var member = await RegisterAsync();

        var shared = await (await owner.Client.PostAsJsonAsync("/circles",
            new CreateCircleRequest($"Shared {Guid.NewGuid():N}"[..20], null, null, null, null))).Content.ReadFromJsonAsync<CircleDto>();
        var solo = await (await owner.Client.PostAsJsonAsync("/circles",
            new CreateCircleRequest($"Solo {Guid.NewGuid():N}"[..20], null, null, null, null))).Content.ReadFromJsonAsync<CircleDto>();
        Assert.Equal(HttpStatusCode.OK, (await member.Client.PostAsync($"/circles/{shared!.Handle}/join", null)).StatusCode);

        var res = await owner.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password));

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(member.Id, await QueryAsync(db => db.ReadingCircles.Where(c => c.Id == shared.Id).Select(c => c.CreatedBy).SingleAsync()));
        Assert.Equal(CircleRole.Moderator, await QueryAsync(db => db.CircleMemberships
            .Where(m => m.CircleId == shared.Id && m.UserId == member.Id).Select(m => m.Role).SingleAsync()));
        Assert.False(await QueryAsync(db => db.ReadingCircles.AnyAsync(c => c.Id == solo!.Id)));
    }

    [Fact]
    public async Task The_Only_Administrator_Cannot_Delete_Their_Account()
    {
        var admin = await RegisterAsync();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // Make this reader the single admin on the instance.
            await db.Users.Where(u => u.IsAdmin).ExecuteUpdateAsync(s => s.SetProperty(u => u.IsAdmin, false));
            await db.Users.Where(u => u.Id == admin.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.IsAdmin, true));
        }

        var res = await admin.Client.PostAsJsonAsync("/auth/delete-account", new DeleteAccountRequest(Password));

        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        Assert.True(await QueryAsync(db => db.Users.AnyAsync(u => u.Id == admin.Id)));
    }

    [Fact]
    public async Task The_Deleted_Reader_Handle_Cannot_Be_Claimed()
    {
        var reader = await RegisterAsync();

        var res = await reader.Client.PatchAsJsonAsync("/users/me", new { handle = AccountDeletionService.DeletedReaderHandle });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
