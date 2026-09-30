using System.Text;
using System.Threading.RateLimiting;
using CurioMap.Api.Auth;
using CurioMap.Api.Common;
using CurioMap.Api.Data;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Configuration: Load local .env if present, then environment first (12-factor / Fly.io).
// ---------------------------------------------------------------------------
DotEnv.Load();

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var configuredDb = builder.Configuration.GetConnectionString("Database");
var connectionString = !string.IsNullOrWhiteSpace(databaseUrl)
    ? DbUrl.ToNpgsql(databaseUrl)
    : !string.IsNullOrWhiteSpace(configuredDb)
        ? configuredDb
        : "Host=localhost;Port=5433;Database=curiomap;Username=curiomap;Password=curiomap";

var redisEnv = Environment.GetEnvironmentVariable("REDIS_URL");
var configuredRedis = builder.Configuration.GetConnectionString("Redis");
var redisUrl = !string.IsNullOrWhiteSpace(redisEnv)
    ? redisEnv
    : !string.IsNullOrWhiteSpace(configuredRedis)
        ? configuredRedis
        : "localhost:6380";

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    // Dynamic JSON opt-in: Dictionary<string,string> etc. map to jsonb (Npgsql 8+ requirement).
    var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
    dataSourceBuilder.EnableDynamicJson();
    var dataSource = dataSourceBuilder.Build();

    options.UseNpgsql(dataSource, npgsql => npgsql.EnableRetryOnFailure(3))
           .UseSnakeCaseNamingConvention();
});

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var logger = sp.GetRequiredService<ILogger<Program>>();
    try
    {
        return ConnectionMultiplexer.Connect(
            RedisUrl.Normalize(redisUrl),
            options =>
            {
                options.AbortOnConnectFail = false;
                options.ConnectRetry = 5;
                options.ConnectTimeout = 5000;
            });
    }
    catch (Exception ex)
    {
        // Redis is a best-effort cache/rate-limit tier: boot healthy without it.
        logger.LogWarning(ex, "Redis unavailable at startup; continuing without cache.");
        return ConnectionMultiplexer.Connect("localhost:0,abortConnect=false,connectTimeout=500");
    }
});

builder.Services.AddScoped<ICacheService, RedisCacheService>();
builder.Services.AddScoped<IRedisRateLimiter, RedisRateLimiter>();
builder.Services.AddScoped<IRatingService, RatingService>();
builder.Services.AddScoped<IChallengeService, ChallengeService>();
builder.Services.AddScoped<IStreakService, StreakService>();
builder.Services.AddScoped<ICircleStreakService, CircleStreakService>();
builder.Services.AddHostedService<ConversationArchiver>();

builder.Services.AddHttpClient<OpenLibraryService>(client =>
{
    client.BaseAddress = new Uri("https://openlibrary.org/");
    client.Timeout = TimeSpan.FromSeconds(5);
});
builder.Services.AddHttpClient<GoogleBooksService>(client =>
{
    client.BaseAddress = new Uri("https://www.googleapis.com/");
    client.Timeout = TimeSpan.FromSeconds(5);
});
builder.Services.AddHttpClient<GeoResolveService>(client =>
{
    client.BaseAddress = new Uri("https://geocoding-api.open-meteo.com/");
    client.Timeout = TimeSpan.FromSeconds(4);
});

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<AffiliateOptions>(builder.Configuration.GetSection("Affiliate"));
builder.Services.Configure<OpenLibraryOptions>(builder.Configuration.GetSection("OpenLibrary"));
builder.Services.Configure<GoogleBooksOptions>(builder.Configuration.GetSection("GoogleBooks"));
builder.Services.Configure<ConversationOptions>(builder.Configuration.GetSection("Conversations"));
builder.Services.Configure<AdminOptions>(builder.Configuration.GetSection("Admin"));
builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection("Seed"));
builder.Services.Configure<ProxyOptions>(builder.Configuration.GetSection("Proxy"));

builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<RefreshTokenService>();
builder.Services.AddScoped<PasswordHasher>();
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddScoped<HandleGenerator>();
builder.Services.AddScoped<ProfanityFilter>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<AffiliateLinkService>();
builder.Services.AddSingleton<ClientIpResolver>();
builder.Services.AddHttpContextAccessor();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSecret = Environment.GetEnvironmentVariable("JWT__SECRET")
    ?? Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? jwtSection["Secret"];

var usingDevJwtFallback = false;
if (string.IsNullOrWhiteSpace(jwtSecret) && builder.Environment.IsDevelopment())
{
    // Local development fallback only when no environment secret is provided.
    // Public constant on purpose: it must be obvious in logs and unusable in prod.
    jwtSecret = "dev-only-secret-change-me-0123456789abcdef0123456789abcdef";
    usingDevJwtFallback = true;
}

if (!string.IsNullOrWhiteSpace(jwtSecret))
{
    jwtSection["Secret"] = jwtSecret;
}

var jwt = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Secret) || jwt.Secret.Length < 32)
{
    throw new InvalidOperationException("JWT secret must be at least 32 characters. Set JWT__SECRET in .env or environment.");
}
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep raw JWT claim names ("sub", "role", "email") — no MS claim remapping.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            // Pin the signing algorithm family: never accept algorithm-switching tokens (§5.1).
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

builder.Services.AddAuthorization(options =>
    options.AddPolicy("Admin", policy => policy.RequireClaim("role", "admin")));

// ---------------------------------------------------------------------------
// CORS (the web app normally proxies same-origin; this supports direct clients)
// ---------------------------------------------------------------------------
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000"];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// ---------------------------------------------------------------------------
// Rate limiting (per-instance; message posting also has a Redis-backed limiter)
// ---------------------------------------------------------------------------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            PartitionKey(context),
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 200, Window = TimeSpan.FromMinutes(1) }));
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        PartitionKey(context),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1) }));
    options.AddPolicy("write", context => RateLimitPartition.GetFixedWindowLimiter(
        PartitionKey(context),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 40, Window = TimeSpan.FromMinutes(1) }));
    options.AddPolicy("search", context => RateLimitPartition.GetFixedWindowLimiter(
        PartitionKey(context),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 60, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddExceptionHandler<AppExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

if (usingDevJwtFallback)
{
    app.Logger.LogWarning(
        "JWT secret is the built-in DEVELOPMENT fallback. Every token is forgeable. " +
        "Set JWT__SECRET before exposing this instance to any network.");
}

// Security headers run first so every response - including error and static
// responses - carries them (AGENTS §5.22).
app.UseMiddleware<SecurityHeadersMiddleware>();

// ---------------------------------------------------------------------------
// Database: apply ordered SQL migrations + seed at startup (advisory-locked).
// ---------------------------------------------------------------------------
await DbInitializer.InitializeAsync(app.Services, app.Logger);

app.UseExceptionHandler();
app.UseCors();
app.UseRateLimiter();

// The OpenAPI document and the Scalar docs page (wwwroot/docs.html, which boots
// against /openapi/v1.json) are development surfaces: production ships neither,
// and the root metadata stops advertising them (AGENTS §5.5).
var isDevelopment = app.Environment.IsDevelopment();
if (isDevelopment)
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.UseAuthentication();
app.UseAuthorization();

if (isDevelopment)
{
    app.MapOpenApi();
}
app.MapControllers();

app.MapGet("/", () => Results.Json(new
{
    name = "CurioMap API",
    tagline = "live map of human curiosity",
    docs = isDevelopment ? "/docs" : null,
    openapi = isDevelopment ? "/openapi/v1.json" : null,
    health = "/health",
}));

if (isDevelopment)
{
    // /docs.html under the friendlier /docs path - scoped so unmatched API routes
    // still 404 instead of returning HTML.
    app.MapFallbackToFile("/docs", "docs.html");
}

static string PartitionKey(HttpContext context) =>
    context.User.FindFirst("sub")?.Value
    ?? context.RequestServices.GetRequiredService<ClientIpResolver>().Resolve(context)
    ?? "anon";

app.Run();

public partial class Program { }
