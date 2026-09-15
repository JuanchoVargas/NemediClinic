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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tenant: exclude from tenant filter (it IS the tenant)
        modelBuilder.Entity<Tenant>()
            .HasQueryFilter(t => !t.IsDeleted);

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
        // e => e.TenantId == _tenantProvider.TenantId && !e.IsDeleted
        var parameter = System.Linq.Expressions.Expression.Parameter(entityType, "e");

        var tenantIdProperty = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.TenantId));
        var tenantIdValue = System.Linq.Expressions.Expression.Property(
            System.Linq.Expressions.Expression.Constant(_tenantProvider),
            nameof(ITenantProvider.TenantId));
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
