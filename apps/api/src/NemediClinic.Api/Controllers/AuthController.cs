using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public AuthController(AppDbContext db, IJwtService jwt, ITenantProvider tenantProvider)
    {
        _db = db;
        _jwt = jwt;
        _tenantProvider = tenantProvider;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Credenciales inválidas." });

        if (!user.IsActive)
            return Unauthorized(new { error = "Usuario desactivado." });

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
            // Subsequent registrations require an authenticated SuperAdmin.
            if (User.Identity is null || !User.Identity.IsAuthenticated)
                return Unauthorized(new { error = "Requiere autenticación de SuperAdmin." });

            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value
                            ?? User.FindFirst("role")?.Value;
            if (!string.Equals(roleClaim, UserRole.SuperAdmin.ToString(), StringComparison.Ordinal))
                return Forbid();

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
            Email = request.TenantEmail
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
            BranchId = branch.Id
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

        if (user is null
            || user.RefreshToken != request.RefreshToken
            || user.RefreshTokenExpiry < DateTime.UtcNow)
        {
            return Unauthorized(new { error = "Refresh token inválido o expirado." });
        }

        var newToken = _jwt.GenerateToken(user);
        var newRefreshToken = _jwt.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        return Ok(BuildLoginResponse(user, newToken, newRefreshToken));
    }

    private static LoginResponse BuildLoginResponse(User user, string token, string refreshToken) =>
        new()
        {
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

    private Guid GetTenantId()
    {
        var claim = User.FindFirst("tenant_id");
        return claim is not null && Guid.TryParse(claim.Value, out var tid) ? tid : Guid.Empty;
    }
}
