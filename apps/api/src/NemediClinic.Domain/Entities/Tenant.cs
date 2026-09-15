namespace NemediClinic.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string NIT { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Branch> Branches { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
}
