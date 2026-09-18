using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Auth;
using NemediClinic.Application.Interfaces;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Cambio y restablecimiento de contraseñas (usuarios de clínica y PlatformAdmin).
///   · Cambiar: exige la actual, aplica PasswordPolicy, apaga MustChangePassword e invalida los
///     refresh tokens (cualquier otra sesión tendrá que volver a ingresar al vencer su JWT).
///   · Restablecer: clave temporal que se devuelve UNA vez, MustChangePassword = true, refresh
///     tokens invalidados y, si hay SMTP configurado, correo al usuario.
/// </summary>
public class PasswordService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;

    public PasswordService(AppDbContext db, IEmailService email)
    {
        _db = db;
        _email = email;
    }

    // ── Cambiar la propia ───────────────────────────────────────────
    public async Task<User> ChangeUserPasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct)
    {
        // Filtro global: el usuario del JWT siempre pertenece a su tenant
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new ApiException(StatusCodes.Status401Unauthorized, "Sesión inválida.");

        user.PasswordHash = NewHash(request, user.PasswordHash);
        user.MustChangePassword = false;
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<PlatformAdmin> ChangePlatformAdminPasswordAsync(Guid adminId, ChangePasswordRequest request, CancellationToken ct)
    {
        var admin = await _db.PlatformAdmins.FirstOrDefaultAsync(a => a.Id == adminId && a.IsActive, ct)
            ?? throw new ApiException(StatusCodes.Status401Unauthorized, "Sesión inválida.");

        admin.PasswordHash = NewHash(request, admin.PasswordHash);
        admin.MustChangePassword = false;
        admin.RefreshToken = null;
        admin.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync(ct);
        return admin;
    }

    private static string NewHash(ChangePasswordRequest request, string currentHash)
    {
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, currentHash))
            throw ApiException.BadRequest("La contraseña actual no es correcta.");

        var invalid = PasswordPolicy.Validate(request.NewPassword);
        if (invalid is not null)
            throw ApiException.BadRequest(invalid);

        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, currentHash))
            throw ApiException.BadRequest("La contraseña nueva debe ser distinta de la actual.");

        return BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
    }

    // ── Restablecer la de otro ──────────────────────────────────────
    /// <summary>SuperAdmin/Admin sobre usuarios de SU tenant. Un Admin no puede restablecer a un SuperAdmin.</summary>
    public async Task<ResetPasswordResponse> ResetUserPasswordAsync(Guid targetUserId, Guid actorId, string actorRole, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId, ct)
            ?? throw ApiException.NotFound("Usuario no encontrado.");

        if (user.Id == actorId)
            throw ApiException.BadRequest("Para tu propia contraseña usa \"Cambiar contraseña\".");
        if (user.Rol == UserRole.SuperAdmin && actorRole != nameof(UserRole.SuperAdmin))
            throw new ApiException(StatusCodes.Status403Forbidden, "Solo un SuperAdmin puede restablecer la contraseña de otro SuperAdmin.");

        return await ResetAsync(user, ct);
    }

    /// <summary>PlatformAdmin sobre el SuperAdmin de un tenant (el más antiguo, el que creó bootstrap-admin).</summary>
    public async Task<ResetPasswordResponse> ResetTenantAdminPasswordAsync(Guid tenantId, CancellationToken ct)
    {
        if (!await _db.Tenants.AnyAsync(t => t.Id == tenantId, ct))
            throw ApiException.NotFound("Tenant no encontrado.");

        var admin = await _db.Users.IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId && u.Rol == UserRole.SuperAdmin && !u.IsDeleted)
            .OrderBy(u => u.CreatedAt)
            .FirstOrDefaultAsync(ct)
            ?? throw ApiException.Conflict("Este tenant aún no tiene SuperAdmin. Usa \"Crear admin\".");

        return await ResetAsync(admin, ct);
    }

    private async Task<ResetPasswordResponse> ResetAsync(User user, CancellationToken ct)
    {
        var temporal = PasswordPolicy.GenerateTemporary();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporal);
        user.MustChangePassword = true;
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync(ct);

        var sent = await _email.SendAsync(
            user.Email,
            "Tu contraseña fue restablecida",
            $"Hola {user.Nombre},\n\nTu contraseña fue restablecida. Ingresa con esta clave temporal:\n\n    {temporal}\n\n" +
            "El sistema te pedirá cambiarla al entrar. Si no pediste este cambio, avisa al administrador de tu clínica.\n",
            ct);

        return new ResetPasswordResponse { UserId = user.Id, Email = user.Email, PasswordTemporal = temporal, EmailEnviado = sent };
    }
}
