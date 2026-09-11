using CurioMap.Api.Auth;

namespace CurioMap.Api.Tests;

public class PasswordHasherTests
{
    private readonly PasswordHasher _hasher = new();

    [Fact]
    public void Hash_Then_Verify_Succeeds_For_Correct_Password()
    {
        var hash = _hasher.Hash("correct horse battery staple");
        Assert.True(_hasher.Verify("correct horse battery staple", hash));
    }

    [Fact]
    public void Verify_Fails_For_Wrong_Password()
    {
        var hash = _hasher.Hash("correct horse battery staple");
        Assert.False(_hasher.Verify("wrong password", hash));
    }

    [Fact]
    public void Hash_Is_Salted_So_Same_Password_Yields_Different_Hashes()
    {
        var a = _hasher.Hash("same password");
        var b = _hasher.Hash("same password");
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void Hash_Uses_Versioned_Pbkdf2_Format()
    {
        var hash = _hasher.Hash("anything");
        Assert.StartsWith("pbkdf2.v1.100000.", hash);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-valid-hash")]
    public void Verify_Fails_For_Invalid_Stored_Values(string? stored)
    {
        Assert.False(_hasher.Verify("anything", stored));
    }
}
