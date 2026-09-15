using System.Security.Claims;
using NemediClinic.Domain.Entities;

namespace NemediClinic.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
    ClaimsPrincipal? ValidateToken(string token);
    string GenerateRefreshToken();
}
