using Microsoft.EntityFrameworkCore;
using NemediClinic.Domain.Entities;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Crea el primer PlatformAdmin desde configuración (Platform:AdminEmail / Platform:AdminPassword;
/// en Docker: Platform__AdminEmail / Platform__AdminPassword). Solo actúa si la tabla está vacía:
/// no pisa contraseñas ya cambiadas. No hay endpoint para crear PlatformAdmins.
/// </summary>
public static class PlatformAdminSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration config, ILogger logger)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            // En Development las migraciones se aplican a mano: si falta AddPlatformLevel, la tabla no existe.
            if ((await db.Database.GetPendingMigrationsAsync()).Any())
            {
                logger.LogWarning("PlatformAdmin no sembrado: hay migraciones pendientes (dotnet ef database update).");
                return;
            }

            if (await db.PlatformAdmins.AnyAsync())
                return;

            var email = config["Platform:AdminEmail"];
            var password = config["Platform:AdminPassword"];
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                logger.LogWarning("PlatformAdmin no sembrado: define Platform__AdminEmail y Platform__AdminPassword.");
                return;
            }

            if (password.Length < 10)
            {
                logger.LogWarning("PlatformAdmin no sembrado: Platform__AdminPassword debe tener al menos 10 caracteres.");
                return;
            }

            db.PlatformAdmins.Add(new PlatformAdmin
            {
                Nombre = config["Platform:AdminNombre"] ?? "Administrador de plataforma",
                Email = email.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
            });
            await db.SaveChangesAsync();
            logger.LogInformation("PlatformAdmin inicial creado: {Email}", email);
        }
        catch (Exception ex)
        {
            logger.LogWarning("PlatformAdmin no sembrado: {Message}", ex.GetBaseException().Message);
        }
    }
}
