using Microsoft.AspNetCore.Identity;

namespace Nemedi.CRM.Domain.Entities;

public class User : IdentityUser {
	public string TenantId { get; set; } = string.Empty;
	public string FirstName { get; set; } = string.Empty;
	public string LastName { get; set; } = string.Empty;
	public bool IsActive { get; set; } = true;
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public DateTime? LastLoginAt { get; set; }
}

public class Role : IdentityRole {
	// Roles globales: usar 'GLOBAL' como TenantId para compatibilidad
	public string TenantId { get; set; } = "GLOBAL";
	public string Description { get; set; } = string.Empty;
}