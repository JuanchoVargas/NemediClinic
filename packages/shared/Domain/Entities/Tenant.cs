namespace Nemedi.CRM.Domain.Entities;

public class Tenant {
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;

    // Información básica
    public string BusinessName { get; set; } = string.Empty; // Razón social
    public string CommercialName { get; set; } = string.Empty; // Nombre comercial
    public PersonType PersonType { get; set; } = PersonType.Juridica; // Natural o Jurídica

    // Identificación
    public IdentificationType IdentificationType { get; set; } = IdentificationType.NIT;
    public string IdentificationNumber { get; set; } = string.Empty; // NIT, Cédula, etc.
    public string VerificationDigit { get; set; } = string.Empty; // Dígito de verificación para NIT

    // Información jurídica
    public string LegalRepresentativeName { get; set; } = string.Empty; // Representante legal
    public string LegalRepresentativeId { get; set; } = string.Empty; // ID del representante
    public string LegalRepresentativeEmail { get; set; } = string.Empty;
    public string LegalRepresentativePhone { get; set; } = string.Empty;

    // Información tributaria
    public string TaxRegime { get; set; } = string.Empty; // Régimen tributario
    public bool IsTaxPayer { get; set; } = true; // ¿Es contribuyente?
    public string TaxAddress { get; set; } = string.Empty; // Dirección fiscal
    public string TaxCity { get; set; } = string.Empty; // Ciudad fiscal
    public string TaxDepartment { get; set; } = string.Empty; // Departamento fiscal

    // Información de contacto
    public string ContactName { get; set; } = string.Empty; // Nombre de contacto
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string ContactMobile { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;

    // Dirección principal
    public string Address { get; set; } = string.Empty;
    public string AddressComplement { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Country { get; set; } = "Colombia";
    public string PostalCode { get; set; } = string.Empty;

    // Información financiera
    public string BankName { get; set; } = string.Empty;
    public string BankAccountNumber { get; set; } = string.Empty;
    public string BankAccountType { get; set; } = string.Empty; // Ahorros, Corriente
    public string PaymentTerms { get; set; } = string.Empty; // Términos de pago

    // Configuración del tenant
    public string TimeZone { get; set; } = "SA Pacific Standard Time"; // Colombia
    public string Language { get; set; } = "es-CO";
    public string Currency { get; set; } = "COP";
    public int MaxUsers { get; set; } = 10;
    public bool IsActive { get; set; } = true;
    public TenantStatus Status { get; set; } = TenantStatus.Active;
    public bool IsDeleted { get; set; } = false; // Soft delete (logical removal)

    // Auditoría
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? DeactivatedAt { get; set; }
    public string? DeactivatedBy { get; set; }

    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Warehouse> Warehouses { get; set; } = new List<Warehouse>();
    public ICollection<Supplier> Suppliers { get; set; } = new List<Supplier>();
    public ICollection<PriceList> PriceLists { get; set; } = new List<PriceList>();
}

public enum PersonType {
    Natural,    // Persona natural
    Juridica    // Persona jurídica
}

public enum IdentificationType {
    NIT,           // Número de Identificación Tributaria
    CedulaCiudadania,    // Cédula de ciudadanía
    CedulaExtranjeria,   // Cédula de extranjería
    Pasaporte,     // Pasaporte
    TarjetaIdentidad,    // Tarjeta de identidad
    RegistroCivil,       // Registro civil
    NUIP           // Número Único de Identificación Personal
}

public enum TenantStatus {
    Active,
    Inactive,
    Suspended,
    PendingApproval,
    Rejected,
    Deleted
}