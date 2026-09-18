using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Auth;
using NemediClinic.Application.Interfaces;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;
    private readonly ITenantProvider _tenantProvider;
    private readonly IWebHostEnvironment _env;
    private readonly PasswordService _passwords;

    public AuthController(AppDbContext db, IJwtService jwt, ITenantProvider tenantProvider, IWebHostEnvironment env, PasswordService passwords)
    {
        _passwords = passwords;
        _db = db;
        _jwt = jwt;
        _tenantProvider = tenantProvider;
        _env = env;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted);

        // Sin usuario de tenant con ese correo: puede ser un administrador de plataforma.
        if (user is null)
        {
            var platformAdmin = await _db.PlatformAdmins.FirstOrDefaultAsync(a => a.Email == request.Email);
            if (platformAdmin is not null)
                return await LoginPlatformAdmin(platformAdmin, request.Password);
        }

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Credenciales inválidas." });

        if (!user.IsActive)
            return Unauthorized(new { error = "Usuario desactivado." });

        if (await TenantBlockedAsync(user.TenantId) is { } bloqueo)
            return Unauthorized(new { error = bloqueo });

        var token = _jwt.GenerateToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        return Ok(BuildLoginResponse(user, token, refreshToken));
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
    {
        var anySuperAdmin = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Rol == UserRole.SuperAdmin && !u.IsDeleted);

        Guid tenantId;

        if (anySuperAdmin)
        {
            // Ya hay clínica montada: crear usuarios exige sesión.
            if (User.Identity is null || !User.Identity.IsAuthenticated)
                return Unauthorized(new { error = "Requiere autenticación." });

            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value
                            ?? User.FindFirst("role")?.Value;

            // El dueño crea cualquier rol; recepción (Admin) solo esteticistas: es quien da de alta
            // al personal de cabina en el día a día, pero no puede crear pares ni dueños.
            var esSuperAdmin = string.Equals(roleClaim, UserRole.SuperAdmin.ToString(), StringComparison.Ordinal);
            var esAdmin = string.Equals(roleClaim, UserRole.Admin.ToString(), StringComparison.Ordinal);

            if (!esSuperAdmin && !esAdmin)
                return Forbid();
            if (!esSuperAdmin && request.Rol != UserRole.Esteticista)
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Solo el dueño puede crear usuarios de recepción o administración." });

            tenantId = GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest(new { error = "Token sin tenant_id válido." });
        }
        else
        {
            // Bootstrap case: no SuperAdmin exists yet. Attach the new user to the
            // first tenant available; if there is none, require /seed first.
            var firstTenant = await _db.Tenants
                .IgnoreQueryFilters()
                .OrderBy(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (firstTenant is null)
                return BadRequest(new { error = "Sistema sin inicializar. Use /api/v1/auth/seed primero." });

            tenantId = firstTenant.Id;
            _tenantProvider.SetTenant(tenantId);
        }

        var emailExists = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == tenantId && u.Email == request.Email && !u.IsDeleted);

        if (emailExists)
            return Conflict(new { error = "El email ya está registrado en este tenant." });

        if (request.BranchId.HasValue)
        {
            var branchExists = await _db.Branches
                .IgnoreQueryFilters()
                .AnyAsync(b => b.Id == request.BranchId.Value && b.TenantId == tenantId);
            if (!branchExists)
                return BadRequest(new { error = "La sede especificada no existe." });
        }

        var invalidPassword = PasswordPolicy.Validate(request.Password);
        if (invalidPassword is not null)
            return BadRequest(new { error = invalidPassword });

        // MustChangePassword queda en true (valor por defecto): la clave la eligió quien crea al usuario
        var user = new User
        {
            Nombre = request.Nombre,
            Apellido = request.Apellido,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Rol = request.Rol,
            BranchId = request.BranchId,
            TenantId = tenantId
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Register), new { id = user.Id }, new UserInfo
        {
            Id = user.Id,
            Nombre = user.Nombre,
            Apellido = user.Apellido,
            Email = user.Email,
            Rol = user.Rol.ToString(),
            TenantId = user.TenantId,
            BranchId = user.BranchId
        });
    }

    [HttpPost("seed")]
    [AllowAnonymous]
    public async Task<IActionResult> Seed([FromBody] SeedRequest request)
    {
        // Fuera de Development los tenants los crea SOLO el PlatformAdmin (api/v1/platform/tenants).
        if (!_env.IsDevelopment())
            return NotFound();

        var anyTenant = await _db.Tenants
            .IgnoreQueryFilters()
            .AnyAsync();

        if (anyTenant)
            return Conflict(new { error = "Sistema ya inicializado" });

        await using var tx = await _db.Database.BeginTransactionAsync();

        var tenant = new Tenant
        {
            Nombre = request.TenantNombre,
            NIT = request.TenantNit,
            Email = request.TenantEmail,
            ChannelId = AppDbContext.NemediChannelId,
            FechaActivacion = DateTime.Now
        };

        // The tenant provider override ensures SaveChangesAsync stamps the
        // freshly-created tenant's Id on Tenant, Branch and User in a single pass.
        _tenantProvider.SetTenant(tenant.Id);
        _db.Tenants.Add(tenant);

        var branch = new Branch
        {
            Nombre = "Sede Principal",
            TenantId = tenant.Id
        };
        _db.Branches.Add(branch);

        var admin = new User
        {
            Nombre = request.AdminNombre,
            Apellido = request.AdminApellido,
            Email = request.AdminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
            Rol = UserRole.SuperAdmin,
            TenantId = tenant.Id,
            BranchId = branch.Id,
            MustChangePassword = false // la eligió quien hace el seed
        };
        _db.Users.Add(admin);

        var token = _jwt.GenerateToken(admin);
        var refreshToken = _jwt.GenerateRefreshToken();
        admin.RefreshToken = refreshToken;
        admin.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return Ok(BuildLoginResponse(admin, token, refreshToken));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        var principal = _jwt.ValidateToken(request.Token);
        if (principal is null)
            return Unauthorized(new { error = "Token inválido." });

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId is null || !Guid.TryParse(userId, out var uid))
            return Unauthorized(new { error = "Token inválido." });

        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == uid && !u.IsDeleted);

        if (user is null && principal.IsInRole(PlatformAdmin.RoleName))
            return await RefreshPlatformAdmin(uid, request.RefreshToken);

        if (user is null
            || user.RefreshToken != request.RefreshToken
            || user.RefreshTokenExpiry < DateTime.UtcNow)
        {
            return Unauthorized(new { error = "Refresh token inválido o expirado." });
        }

        // Misma puerta que el login: si la clínica se suspendió, la sesión no se renueva
        if (await TenantBlockedAsync(user.TenantId) is { } bloqueo)
            return Unauthorized(new { error = bloqueo });

        var newToken = _jwt.GenerateToken(user);
        var newRefreshToken = _jwt.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        return Ok(BuildLoginResponse(user, newToken, newRefreshToken));
    }

    // ── POST /api/v1/auth/change-password ───────────────────────────
    // Cualquier rol, incluido PlatformAdmin. Invalida los refresh tokens y devuelve una sesión
    // nueva (JWT sin el claim pwd_change) para que la web siga sin volver a pedir credenciales.
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id))
            return Unauthorized(new { error = "Sesión inválida." });

        if (User.IsInRole(PlatformAdmin.RoleName))
        {
            var admin = await _passwords.ChangePlatformAdminPasswordAsync(id, request, ct);
            return Ok(await IssuePlatformTokens(admin));
        }

        var user = await _passwords.ChangeUserPasswordAsync(id, request, ct);
        var token = _jwt.GenerateToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync(ct);
        return Ok(BuildLoginResponse(user, token, refreshToken));
    }

    // ── PlatformAdmin (fuera de todo tenant) ────────────────────────
    private async Task<IActionResult> LoginPlatformAdmin(PlatformAdmin admin, string password)
    {
        if (!BCrypt.Net.BCrypt.Verify(password, admin.PasswordHash))
            return Unauthorized(new { error = "Credenciales inválidas." });

        if (!admin.IsActive)
            return Unauthorized(new { error = "Usuario desactivado." });

        return Ok(await IssuePlatformTokens(admin));
    }

    private async Task<IActionResult> RefreshPlatformAdmin(Guid adminId, string refreshToken)
    {
        var admin = await _db.PlatformAdmins.FirstOrDefaultAsync(a => a.Id == adminId && a.IsActive);
        if (admin is null || admin.RefreshToken != refreshToken || admin.RefreshTokenExpiry < DateTime.UtcNow)
            return Unauthorized(new { error = "Refresh token inválido o expirado." });

        return Ok(await IssuePlatformTokens(admin));
    }

    private async Task<LoginResponse> IssuePlatformTokens(PlatformAdmin admin)
    {
        var token = _jwt.GeneratePlatformToken(admin);
        var refreshToken = _jwt.GenerateRefreshToken();
        admin.RefreshToken = refreshToken;
        admin.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            MustChangePassword = admin.MustChangePassword,
            Token = token,
            RefreshToken = refreshToken,
            Expiration = DateTime.UtcNow.AddHours(1),
            UserInfo = new UserInfo
            {
                Id = admin.Id,
                Nombre = admin.Nombre,
                Apellido = string.Empty,
                Email = admin.Email,
                Rol = PlatformAdmin.RoleName,
                TenantId = Guid.Empty,
                BranchId = null
            }
        };
    }

    private static LoginResponse BuildLoginResponse(User user, string token, string refreshToken) =>
        new()
        {
            MustChangePassword = user.MustChangePassword,
            Token = token,
            RefreshToken = refreshToken,
            Expiration = DateTime.UtcNow.AddHours(1),
            UserInfo = new UserInfo
            {
                Id = user.Id,
                Nombre = user.Nombre,
                Apellido = user.Apellido,
                Email = user.Email,
                Rol = user.Rol.ToString(),
                TenantId = user.TenantId,
                BranchId = user.BranchId
            }
        };

    /// <summary>
    /// Motivo por el que la clínica no puede iniciar sesión, o null si puede. Una clínica eliminada o
    /// inactiva no entra nunca; una suspendida por mora tampoco abre sesión nueva (la sesión ya
    /// abierta sigue en modo lectura hasta que expire: de eso se encarga TenantStatusMiddleware).
    /// Va con IgnoreQueryFilters porque aún no hay JWT y el filtro global no tiene tenant.
    /// </summary>
    private async Task<string?> TenantBlockedAsync(Guid tenantId)
    {
        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Select(t => new { t.IsDeleted, t.IsActive, t.Estado })
            .FirstOrDefaultAsync();

        if (tenant is null || tenant.IsDeleted || !tenant.IsActive)
            return "Esta clínica ya no está activa. Comunícate con el administrador.";

        if (tenant.Estado == TenantEstado.Suspendido)
            return "Cuenta suspendida por mora. Comunícate con soporte para reactivarla.";

        return null;
    }

    private Guid GetTenantId()
    {
        var claim = User.FindFirst("tenant_id");
        return claim is not null && Guid.TryParse(claim.Value, out var tid) ? tid : Guid.Empty;
    }
}
