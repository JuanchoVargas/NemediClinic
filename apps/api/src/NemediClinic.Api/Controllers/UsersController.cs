using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Common;
using NemediClinic.Application.DTOs.Users;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PagedRequest request)
    {
        var query = _db.Users.AsNoTracking();

        // Admin only sees users from their branch; SuperAdmin sees all
        if (!User.IsInRole("SuperAdmin"))
        {
            var branchId = GetBranchId();
            if (branchId.HasValue)
                query = query.Where(u => u.BranchId == branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(u =>
                u.Nombre.ToLower().Contains(search) ||
                u.Apellido.ToLower().Contains(search) ||
                u.Email.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderBy(u => u.Apellido).ThenBy(u => u.Nombre)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Nombre = u.Nombre,
                Apellido = u.Apellido,
                Email = u.Email,
                Rol = u.Rol.ToString(),
                BranchId = u.BranchId,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResponse<UserDto>
        {
            Items = users,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Nombre = u.Nombre,
                Apellido = u.Apellido,
                Email = u.Email,
                Rol = u.Rol.ToString(),
                BranchId = u.BranchId,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (user is null)
            return NotFound(new { error = "Usuario no encontrado." });

        return Ok(user);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { error = "Usuario no encontrado." });

        if (request.Email is not null && request.Email != user.Email)
        {
            var emailTaken = await _db.Users
                .AnyAsync(u => u.Email == request.Email && u.Id != id);
            if (emailTaken)
                return Conflict(new { error = "El email ya está en uso." });
            user.Email = request.Email;
        }

        if (request.Nombre is not null) user.Nombre = request.Nombre;
        if (request.Apellido is not null) user.Apellido = request.Apellido;
        if (request.Rol.HasValue) user.Rol = request.Rol.Value;
        if (request.BranchId.HasValue) user.BranchId = request.BranchId;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ── POST /api/v1/users/{id}/reset-password ── clave temporal (se muestra una vez) + cambio obligatorio
    [HttpPost("{id:guid}/reset-password")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromServices] NemediClinic.Api.Services.PasswordService passwords, CancellationToken ct)
    {
        var actorId = Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : Guid.Empty;
        var actorRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? string.Empty;
        return Ok(await passwords.ResetUserPasswordAsync(id, actorId, actorRole, ct));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { error = "Usuario no encontrado." });

        user.IsDeleted = true;
        user.IsActive = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private Guid? GetBranchId()
    {
        var claim = User.FindFirst("branch_id");
        return claim is not null && Guid.TryParse(claim.Value, out var bid) ? bid : null;
    }
}
