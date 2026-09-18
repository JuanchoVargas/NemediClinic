using System.Security.Claims;
using NemediClinic.Domain.Entities;

namespace NemediClinic.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
    /// <summary>JWT del administrador de plataforma: rol PlatformAdmin y SIN claim tenant_id.</summary>
    string GeneratePlatformToken(PlatformAdmin admin);
    ClaimsPrincipal? ValidateToken(string token);
    string GenerateRefreshToken();
}
