using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.Interfaces;
using NemediClinic.Domain.Entities;

namespace NemediClinic.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    private readonly ITenantProvider _tenantProvider;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantProvider tenantProvider)
        : base(options)
    {
        _tenantProvider = tenantProvider;
    }

    /// <summary>
    /// Tenant de la request actual. El filtro global debe referenciar ESTE miembro
    /// del DbContext (no el provider directamente): EF Core cachea el modelo una sola
    /// vez por proceso y solo re-evalúa por request las expresiones que acceden a
    /// miembros de la instancia actual del DbContext.
    /// </summary>
    public Guid CurrentTenantId => _tenantProvider.TenantId;

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Procedure> Procedures => Set<Procedure>();
    public DbSet<Package> Packages => Set<Package>();
    public DbSet<PackageProcedure> PackageProcedures => Set<PackageProcedure>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<ClinicalRecord> ClinicalRecords => Set<ClinicalRecord>();
    public DbSet<ClinicalNote> ClinicalNotes => Set<ClinicalNote>();
    public DbSet<PatientPackage> PatientPackages => Set<PatientPackage>();
    public DbSet<PatientPackageSession> PatientPackageSessions => Set<PatientPackageSession>();
    public DbSet<PatientPayment> PatientPayments => Set<PatientPayment>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<InventoryEntry> InventoryEntries => Set<InventoryEntry>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<Attachment> Attachments => Set<Attachment>();

    // Nivel de plataforma: sin TenantId ni filtro global.
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<PlatformAdmin> PlatformAdmins => Set<PlatformAdmin>();

    /// <summary>Ids fijos de los canales sembrados por la migración AddPlatformLevel.</summary>
    public static readonly Guid NemediChannelId = new("11111111-1111-1111-1111-111111111111");
    public static readonly Guid InfotexChannelId = new("22222222-2222-2222-2222-222222222222");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tenant: exclude from tenant filter (it IS the tenant)
        modelBuilder.Entity<Tenant>()
            .HasQueryFilter(t => !t.IsDeleted);

        // ── Attachment (imágenes) ───────────────────────────
        // Relación polimórfica (EntityType + EntityId): sin FK a propósito.
        modelBuilder.Entity<Attachment>(a =>
        {
            a.Property(x => x.EntityType).HasConversion<string>().HasMaxLength(20);
            a.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
            a.Property(x => x.FileName).HasMaxLength(200);
            a.Property(x => x.ContentType).HasMaxLength(100);
            a.Property(x => x.StoragePath).HasMaxLength(300);
            a.Property(x => x.ThumbnailPath).HasMaxLength(300);
            a.HasIndex(x => new { x.TenantId, x.EntityType, x.EntityId });
        });

        // ── Plataforma: Channel / Lead / PlatformAdmin ──────
        modelBuilder.Entity<Channel>(c =>
        {
            c.Property(x => x.Nombre).HasMaxLength(100);
            c.Property(x => x.Slug).HasMaxLength(50);
            c.Property(x => x.NombreComercial).HasMaxLength(100);
            c.Property(x => x.LogoUrl).HasMaxLength(500);
            c.Property(x => x.ColorPrimario).HasMaxLength(7);
            c.Property(x => x.ColorSecundario).HasMaxLength(7);
            c.Property(x => x.Dominio).HasMaxLength(200);
            c.Property(x => x.PorcentajeCanal).HasPrecision(5, 4);
            c.HasIndex(x => x.Slug).IsUnique();
            c.HasIndex(x => x.Dominio).IsUnique();
            c.HasData(
                new Channel
                {
                    Id = NemediChannelId, Nombre = "Nemedi", Slug = "nemedi",
                    NombreComercial = "NemediClinic", ColorPrimario = "#1F4E79", ColorSecundario = "#D9A441",
                    Dominio = "app.nemediclinic.com", PorcentajeCanal = 0m, Activo = true,
                    CreatedAt = new DateTime(2026, 9, 18, 0, 0, 0, DateTimeKind.Utc)
                },
                new Channel
                {
                    Id = InfotexChannelId, Nombre = "Infotex", Slug = "infotex",
                    NombreComercial = "Infotex Clinic", ColorPrimario = "#0B5FFF", ColorSecundario = "#0A2540",
                    Dominio = "app.infotex.co", PorcentajeCanal = 0.50m, Activo = true,
                    CreatedAt = new DateTime(2026, 9, 18, 0, 0, 0, DateTimeKind.Utc)
                });
        });

        modelBuilder.Entity<Tenant>(t =>
        {
            t.Property(x => x.Plan).HasConversion<string>().HasMaxLength(20);
            t.Property(x => x.Estado).HasConversion<string>().HasMaxLength(20);
            t.Property(x => x.PorcentajeCanalOverride).HasPrecision(5, 4);
            t.HasOne(x => x.Channel)
                .WithMany(c => c.Tenants)
                .HasForeignKey(x => x.ChannelId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Lead>(l =>
        {
            l.Property(x => x.Nombre).HasMaxLength(200);
            l.Property(x => x.NIT).HasMaxLength(20);
            l.Property(x => x.Ciudad).HasMaxLength(100);
            l.Property(x => x.Contacto).HasMaxLength(200);
            l.Property(x => x.Estado).HasConversion<string>().HasMaxLength(20);
            l.HasIndex(x => x.NIT);
            l.HasOne(x => x.Channel)
                .WithMany(c => c.Leads)
                .HasForeignKey(x => x.ChannelId)
                .OnDelete(DeleteBehavior.Restrict);
            l.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PlatformAdmin>(a =>
        {
            a.Property(x => x.Nombre).HasMaxLength(100);
            a.Property(x => x.Email).HasMaxLength(200);
            a.HasIndex(x => x.Email).IsUnique();
        });

        // User: unique email per tenant
        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.TenantId, u.Email })
            .IsUnique()
            .HasFilter("IsDeleted = 0");

        modelBuilder.Entity<User>()
            .Property(u => u.Rol)
            .HasConversion<string>()
            .HasMaxLength(20);

        // User -> Branch (optional)
        modelBuilder.Entity<User>()
            .HasOne(u => u.Branch)
            .WithMany(b => b.Users)
            .HasForeignKey(u => u.BranchId)
            .OnDelete(DeleteBehavior.SetNull);

        // User -> Tenant
        modelBuilder.Entity<User>()
            .HasOne(u => u.Tenant)
            .WithMany(t => t.Users)
            .HasForeignKey(u => u.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        // Branch -> Tenant
        modelBuilder.Entity<Branch>()
            .HasOne(b => b.Tenant)
            .WithMany(t => t.Branches)
            .HasForeignKey(b => b.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        // Procedure: precision for PrecioBase
        modelBuilder.Entity<Procedure>()
            .Property(p => p.PrecioBase)
            .HasPrecision(18, 2);

        // Package: precision for PrecioTotal
        modelBuilder.Entity<Package>()
            .Property(p => p.PrecioTotal)
            .HasPrecision(18, 2);

        // PackageProcedure: composite key
        modelBuilder.Entity<PackageProcedure>()
            .HasKey(pp => new { pp.PackageId, pp.ProcedureId });

        modelBuilder.Entity<PackageProcedure>()
            .HasOne(pp => pp.Package)
            .WithMany(p => p.PackageProcedures)
            .HasForeignKey(pp => pp.PackageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PackageProcedure>()
            .HasOne(pp => pp.Procedure)
            .WithMany(p => p.PackageProcedures)
            .HasForeignKey(pp => pp.ProcedureId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── Patient ─────────────────────────────────────────
        modelBuilder.Entity<Patient>()
            .HasIndex(p => new { p.TenantId, p.Cedula })
            .IsUnique()
            .HasFilter("IsDeleted = 0");

        // Patient -> ClinicalRecord (1:1)
        modelBuilder.Entity<ClinicalRecord>()
            .HasOne(cr => cr.Patient)
            .WithOne(p => p.ClinicalRecord)
            .HasForeignKey<ClinicalRecord>(cr => cr.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        // ClinicalNote -> ClinicalRecord
        modelBuilder.Entity<ClinicalNote>()
            .HasOne(cn => cn.ClinicalRecord)
            .WithMany(cr => cr.ClinicalNotes)
            .HasForeignKey(cn => cn.ClinicalRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        // ClinicalNote -> User (Esteticist)
        modelBuilder.Entity<ClinicalNote>()
            .HasOne(cn => cn.Esteticist)
            .WithMany()
            .HasForeignKey(cn => cn.EsteticistId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── PatientPackage ──────────────────────────────────
        modelBuilder.Entity<PatientPackage>()
            .Property(pp => pp.PrecioAcordado)
            .HasPrecision(18, 2);

        modelBuilder.Entity<PatientPackage>()
            .Property(pp => pp.Estado)
            .HasConversion<string>()
            .HasMaxLength(20);

        modelBuilder.Entity<PatientPackage>()
            .HasOne(pp => pp.Patient)
            .WithMany(p => p.PatientPackages)
            .HasForeignKey(pp => pp.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PatientPackage>()
            .HasOne(pp => pp.Package)
            .WithMany()
            .HasForeignKey(pp => pp.PackageId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── PatientPackageSession ───────────────────────────
        modelBuilder.Entity<PatientPackageSession>()
            .Property(s => s.Estado)
            .HasConversion<string>()
            .HasMaxLength(20);

        modelBuilder.Entity<PatientPackageSession>()
            .HasOne(s => s.PatientPackage)
            .WithMany(pp => pp.Sessions)
            .HasForeignKey(s => s.PatientPackageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientPackageSession>()
            .HasOne(s => s.Procedure)
            .WithMany()
            .HasForeignKey(s => s.ProcedureId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── PatientPayment ──────────────────────────────────
        modelBuilder.Entity<PatientPayment>()
            .Property(p => p.Monto)
            .HasPrecision(18, 2);

        modelBuilder.Entity<PatientPayment>()
            .Property(p => p.MetodoPago)
            .HasConversion<string>()
            .HasMaxLength(20);

        modelBuilder.Entity<PatientPayment>()
            .HasOne(p => p.PatientPackage)
            .WithMany(pp => pp.Payments)
            .HasForeignKey(p => p.PatientPackageId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Appointment ─────────────────────────────────────
        modelBuilder.Entity<Appointment>()
            .Property(a => a.Estado)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Índice para acelerar búsqueda de conflictos por esteticista + ventana de tiempo
        modelBuilder.Entity<Appointment>()
            .HasIndex(a => new { a.EsteticistId, a.FechaInicio });

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Patient)
            .WithMany()
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.PatientPackageSession)
            .WithMany()
            .HasForeignKey(a => a.PatientPackageSessionId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Esteticist)
            .WithMany()
            .HasForeignKey(a => a.EsteticistId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Procedure)
            .WithMany()
            .HasForeignKey(a => a.ProcedureId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Branch)
            .WithMany()
            .HasForeignKey(a => a.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── Product ─────────────────────────────────────────
        modelBuilder.Entity<Product>()
            .Property(p => p.TipoProducto)
            .HasConversion<string>()
            .HasMaxLength(20);

        modelBuilder.Entity<Product>()
            .Property(p => p.StockActual)
            .HasPrecision(18, 4);

        modelBuilder.Entity<Product>()
            .Property(p => p.StockMinimo)
            .HasPrecision(18, 4);

        modelBuilder.Entity<Product>()
            .Property(p => p.StockMaximo)
            .HasPrecision(18, 4);

        // ── InventoryEntry ──────────────────────────────────
        modelBuilder.Entity<InventoryEntry>()
            .Property(e => e.MotivoEntrada)
            .HasConversion<string>()
            .HasMaxLength(20);

        modelBuilder.Entity<InventoryEntry>()
            .Property(e => e.Cantidad)
            .HasPrecision(18, 4);

        modelBuilder.Entity<InventoryEntry>()
            .HasOne(e => e.Product)
            .WithMany()
            .HasForeignKey(e => e.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryEntry>()
            .HasOne(e => e.Usuario)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // ── InventoryMovement ───────────────────────────────
        modelBuilder.Entity<InventoryMovement>()
            .Property(m => m.TipoMovimiento)
            .HasConversion<string>()
            .HasMaxLength(20);

        modelBuilder.Entity<InventoryMovement>()
            .Property(m => m.Cantidad)
            .HasPrecision(18, 4);

        modelBuilder.Entity<InventoryMovement>()
            .HasIndex(m => new { m.ProductId, m.FechaMovimiento });

        modelBuilder.Entity<InventoryMovement>()
            .HasOne(m => m.Product)
            .WithMany()
            .HasForeignKey(m => m.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryMovement>()
            .HasOne(m => m.Usuario)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
                continue;

            // RowVersion as concurrency token
            modelBuilder.Entity(entityType.ClrType)
                .Property(nameof(BaseEntity.RowVersion))
                .IsRowVersion();

            // Tenant has its own filter (no TenantId filtering on itself)
            if (entityType.ClrType == typeof(Tenant))
                continue;

            // Global query filter: TenantId + soft delete
            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(
                BuildFilterExpression(entityType.ClrType));
        }
    }

    private LambdaExpression BuildFilterExpression(Type entityType)
    {
        // e => e.TenantId == this.CurrentTenantId && !e.IsDeleted
        // IMPORTANTE: la constante debe ser el DbContext (this). Antes era el
        // ITenantProvider, y como EF cachea el modelo por proceso, el filtro
        // quedaba fijado al tenant de la PRIMERA request que construyó el modelo.
        var parameter = System.Linq.Expressions.Expression.Parameter(entityType, "e");

        var tenantIdProperty = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.TenantId));
        var tenantIdValue = System.Linq.Expressions.Expression.Property(
            System.Linq.Expressions.Expression.Constant(this),
            nameof(CurrentTenantId));
        var tenantFilter = System.Linq.Expressions.Expression.Equal(tenantIdProperty, tenantIdValue);

        var isDeletedProperty = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
        var notDeleted = System.Linq.Expressions.Expression.Not(isDeletedProperty);

        var combined = System.Linq.Expressions.Expression.AndAlso(tenantFilter, notDeleted);

        return System.Linq.Expressions.Expression.Lambda(combined, parameter);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.TenantId = _tenantProvider.TenantId;
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
