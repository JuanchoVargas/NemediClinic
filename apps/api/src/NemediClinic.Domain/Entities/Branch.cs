namespace NemediClinic.Domain.Entities;

public class Branch : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string Direccion { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<User> Users { get; set; } = [];
}
