using System.Text;
using System.Text.Json.Serialization;
using Hangfire;
using Hangfire.SqlServer;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NemediClinic.Api.Json;
using NemediClinic.Api.Middleware;
using NemediClinic.Api.Providers;
using NemediClinic.Api.Services;
using NemediClinic.Application.Interfaces;
using NemediClinic.Domain.Entities;
using NemediClinic.Infrastructure.Persistence;
using NemediClinic.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// ── JWT: Jwt__Secret obligatorio en Production ──────────────────
// La clave de appsettings.json es solo para desarrollo. En Production debe venir por
// variable de entorno (Jwt__Secret), tener al menos 32 caracteres y no ser la de dev.
const string DevJwtSecret = "CHANGE_ME_IN_PRODUCTION_MIN_32_CHARS!!";
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (builder.Environment.IsProduction())
{
    if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret == DevJwtSecret || jwtSecret.Length < 32)
        throw new InvalidOperationException(
            "Jwt__Secret no está configurado para Production. Define la variable de entorno Jwt__Secret " +
            "con una clave aleatoria de al menos 32 caracteres (openssl rand -base64 48). " +
            "No se acepta la clave de desarrollo de appsettings.json.");
}
if (string.IsNullOrWhiteSpace(jwtSecret))
    throw new InvalidOperationException("Jwt:Secret no está configurado.");

// ── Authentication ──────────────────────────────────────────────
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSection = builder.Configuration.GetSection("Jwt");
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

// ── Authorization ───────────────────────────────────────────────
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("SuperAdmin", p => p.RequireRole("SuperAdmin"))
    .AddPolicy("Admin", p => p.RequireRole("SuperAdmin", "Admin"))
    .AddPolicy("Esteticista", p => p.RequireRole("SuperAdmin", "Admin", "Esteticista"))
    // Fuera de todo tenant: su JWT no lleva tenant_id y NO entra en las políticas de clínica.
    .AddPolicy("PlatformAdmin", p => p.RequireRole(PlatformAdmin.RoleName));

// ── EF Core ─────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Tenant ──────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantProvider, HttpTenantProvider>();

// ── JWT Service ─────────────────────────────────────────────────
builder.Services.AddScoped<IJwtService, JwtService>();

// ── Contraseñas y correo ────────────────────────────────────────
builder.Services.AddSingleton<IEmailService, SmtpEmailService>(); // sin Smtp:Host no envía nada
builder.Services.AddScoped<PasswordService>();

// ── Nivel de plataforma ─────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.AddSingleton(builder.Configuration.GetSection("Platform:Precios").Get<PlatformPricing>() ?? new PlatformPricing());
builder.Services.AddScoped<TenantStatusCache>();
builder.Services.AddScoped<BrandingResolver>();
builder.Services.AddScoped<PlatformTenantService>();
builder.Services.AddScoped<ChannelService>();
builder.Services.AddScoped<LeadService>();
builder.Services.AddScoped<LiquidacionService>();

// ── Adjuntos de imagen ──────────────────────────────────────────
// IFileStorage es el punto de cambio a S3/R2: basta registrar otra implementación aquí.
builder.Services.AddSingleton<IFileStorage, LocalFileStorage>();
builder.Services.AddSingleton<FileTokenService>();
builder.Services.AddScoped<AttachmentService>();
builder.Services.AddScoped<DemoImageSeeder>();

// ── Dashboard y ciclo de vida de paquetes ───────────────────────
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<PatientPackageService>();

// ── Hangfire: jobs recurrentes sobre la misma base (esquema HangFire) ──
// Sin dashboard web de Hangfire: no se expone nada nuevo. El schema se crea solo al arrancar
// el servidor de jobs, que en Production ocurre DESPUÉS de Database.Migrate() (crea la base).
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection"),
        new SqlServerStorageOptions { PrepareSchemaIfNecessary = true, QueuePollInterval = TimeSpan.FromSeconds(30) }));
builder.Services.AddHangfireServer(options => options.WorkerCount = 1);
builder.Services.AddHostedService<AttachmentCleanupService>();

// ── Swagger ─────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "NemediClinic API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── CORS: CORS_ORIGINS (coma-separado); en dev, los orígenes locales ──
const string WebAppCorsPolicy = "WebApp";
var corsOrigins = (builder.Configuration["CORS_ORIGINS"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(o => o.TrimEnd('/'))
    .ToArray();
if (corsOrigins.Length == 0 && builder.Environment.IsDevelopment())
    corsOrigins = ["http://localhost:3000", "http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy(WebAppCorsPolicy, policy =>
    {
        policy.WithOrigins(corsOrigins)
              .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
              .WithHeaders("Authorization", "Content-Type", "X-Branding-Host");
    });
});

// ── Detrás de Caddy: respetar X-Forwarded-Proto/For/Host ────────
// X-Forwarded-Host conserva el dominio original: de él depende el branding por canal.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ── Controllers ─────────────────────────────────────────────────
builder.Services
    .AddControllers(options => options.Filters.Add<ApiExceptionFilter>())
    .AddJsonOptions(options =>
    {
        // Hora local sin conversión UTC en toda la API (ver LocalDateTimeJsonConverter).
        options.JsonSerializerOptions.Converters.Add(new LocalDateTimeJsonConverter());
        // Enums aceptan nombre ("Confirmada", "Efectivo") además de entero. El frontend
        // envía nombres en estado de cita, método de pago, tipo de producto y motivo de entrada.
        // Ningún DTO de respuesta expone enums crudos (todos van como string vía ToString()).
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

var app = builder.Build();

// ── Migraciones al arrancar (Production) ────────────────────────
// Espera hasta 60 s a que SQL Server responda; crea la base si no existe y aplica las
// migraciones pendientes. Si no hay conexión en ese tiempo, termina con código 1 y un
// mensaje claro (Compose reinicia el contenedor).
if (app.Environment.IsProduction())
{
    var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    var deadline = DateTime.UtcNow.AddSeconds(60);
    var attempt = 0;
    while (true)
    {
        attempt++;
        try
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var pending = db.Database.GetPendingMigrations().ToList();
            db.Database.Migrate();
            logger.LogInformation("Migraciones aplicadas: {Count} pendientes ejecutadas (intento {Attempt}).", pending.Count, attempt);
            break;
        }
        catch (Exception ex) when (DateTime.UtcNow < deadline)
        {
            logger.LogWarning("Base de datos no disponible (intento {Attempt}): {Message}. Reintentando en 3 s...", attempt, ex.GetBaseException().Message);
            Thread.Sleep(3000);
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "No se pudo conectar a la base de datos en 60 s. Revisa ConnectionStrings__DefaultConnection y que el servicio mssql esté healthy. Último error: {Message}", ex.GetBaseException().Message);
            Environment.Exit(1);
        }
    }
}

// ── Primer PlatformAdmin (Platform__AdminEmail / Platform__AdminPassword) ──
await PlatformAdminSeeder.SeedAsync(
    app.Services, app.Configuration, app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("PlatformAdminSeeder"));

// ── Jobs recurrentes (hora local de Bogotá, como el resto del sistema) ──
// 02:00 todos los días: paquetes cuya vigencia ya pasó → Vencido.
try
{
    app.Services.GetRequiredService<IRecurringJobManager>().AddOrUpdate<PatientPackageService>(
        "paquetes-vencimiento",
        service => service.ExpireOverdueAsync(),
        "0 2 * * *",
        new RecurringJobOptions { TimeZone = TimeZoneInfo.Local });
}
catch (Exception ex)
{
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Hangfire")
        .LogWarning("No se pudo registrar el job de vencimiento de paquetes: {Message}", ex.GetBaseException().Message);
}

// ── Pipeline ────────────────────────────────────────────────────
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // En Production el HTTPS lo termina Caddy; Kestrel solo escucha HTTP en 8080.
    app.UseHttpsRedirection();
}

app.UseCors(WebAppCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantMiddleware>();
app.UseMiddleware<PasswordChangeMiddleware>(); // claim pwd_change: solo /auth/* hasta cambiar la clave
app.UseMiddleware<TenantStatusMiddleware>(); // tenant Suspendido: escrituras → 423
app.UseMiddleware<BrandingMiddleware>();     // branding por Host para GET /api/v1/branding
app.MapControllers();

app.Run();
