using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Nemedi.CRM.Domain.Entities;
using Nemedi.CRM.Domain.Services;
using Nemedi.CRM.Infrastructure.Data.Configurations;

namespace Nemedi.CRM.Infrastructure.Data;

public partial class ApplicationDbContext : IdentityDbContext<User, Role, string> {
	private readonly string _tenantId;

	public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ITenantService tenantService)
			: base(options) {
		_tenantId = tenantService.GetTenantId();
	}

	// DbSets
	public DbSet<Tenant> Tenants { get; set; } = null!;
	public DbSet<Subscription> Subscriptions { get; set; } = null!;
	public DbSet<Product> Products { get; set; } = null!;
	public DbSet<UnitOfMeasure> UnitOfMeasures { get; set; } = null!;
	public DbSet<ProductGroup> ProductGroups { get; set; } = null!;
	public DbSet<ProductSubgroup> ProductSubgroups { get; set; } = null!;
	public DbSet<Presentation> Presentations { get; set; } = null!;
	public DbSet<BrandGroup> BrandGroups { get; set; } = null!;
	public DbSet<BrandPresentation> BrandPresentations { get; set; } = null!;
	public DbSet<ProductPresentation> ProductPresentations { get; set; } = null!;
	public DbSet<InventoryItem> InventoryItems { get; set; } = null!;
	public DbSet<Warehouse> Warehouses { get; set; } = null!;
	public DbSet<PriceList> PriceLists { get; set; } = null!;
	public DbSet<PriceListItem> PriceListsItems { get; set; } = null!;
	public DbSet<Supplier> Suppliers { get; set; } = null!;
	public DbSet<ClassifierType> ClassifierTypes { get; set; } = null!;
	public DbSet<Classifier> Classifiers { get; set; } = null!;
	public DbSet<Brand> Brands { get; set; } = null!;
	public DbSet<BrandBudget> BrandBudgets { get; set; } = null!;
	public DbSet<SellerTarget> SellerTargets { get; set; } = null!;
	public DbSet<HolidaysCache> HolidaysCaches { get; set; } = null!;
	public DbSet<InventoryMovement> InventoryMovements { get; set; } = null!;
	public DbSet<InventoryMovementLine> InventoryMovementLines { get; set; } = null!;
	public DbSet<StockAlert> StockAlerts { get; set; } = null!;
	public DbSet<Customer> Customers { get; set; } = null!;
	public DbSet<DocumentSequence> DocumentSequences { get; set; } = null!;
	public DbSet<SalesDocument> SalesDocuments { get; set; } = null!;
	public DbSet<SalesDocumentLine> SalesDocumentLines { get; set; } = null!;
	public DbSet<ProductCost> ProductCosts { get; set; } = null!;
	public DbSet<PurchaseOrder> PurchaseOrders { get; set; } = null!;
	public DbSet<PurchaseOrderLine> PurchaseOrderLines { get; set; } = null!;
	public DbSet<SalesPayment> SalesPayments { get; set; } = null!;
	public DbSet<Account> Accounts { get; set; } = null!;
	public DbSet<AccountMovement> AccountMovements { get; set; } = null!;

	protected override void OnModelCreating(ModelBuilder modelBuilder) {
		base.OnModelCreating(modelBuilder);

		// Apply IEntityTypeConfiguration<> from this assembly (ensures Identity tables use configured names)
		modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

		// Map ASP.NET Identity ancillary tables to custom names in dbo schema
		modelBuilder.Entity<IdentityUserRole<string>>().ToTable("UserRoles", "dbo");
		modelBuilder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims", "dbo");
		modelBuilder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins", "dbo");
		modelBuilder.Entity<IdentityUserToken<string>>().ToTable("UserTokens", "dbo");
		modelBuilder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims", "dbo");

		// ══════════════════════════════════════════════════════════════
		// GLOBAL QUERY FILTERS — STRICT MULTI-TENANT
		// Rule: entity.TenantId == _tenantId (direct comparison, NO relaxation)
		// When _tenantId is empty or sentinel, queries return zero rows by design.
		// Use IgnoreQueryFilters() ONLY in explicit, documented SuperAdmin endpoints.
		// ══════════════════════════════════════════════════════════════

		// Tenant-scoped entities (strict TenantId + soft delete)
		modelBuilder.Entity<User>().HasQueryFilter(u => u.TenantId == _tenantId);
		modelBuilder.Entity<Subscription>().HasQueryFilter(s => s.TenantId == _tenantId && !s.IsDeleted);
		modelBuilder.Entity<Product>().HasQueryFilter(p => p.TenantId == _tenantId && !p.IsDeleted);
		modelBuilder.Entity<InventoryItem>().HasQueryFilter(i => i.TenantId == _tenantId && !i.IsDeleted);
		modelBuilder.Entity<Warehouse>().HasQueryFilter(w => w.TenantId == _tenantId && !w.IsDeleted);
		modelBuilder.Entity<PriceList>().HasQueryFilter(pl => pl.TenantId == _tenantId && !pl.IsDeleted);
		modelBuilder.Entity<Supplier>().HasQueryFilter(s => s.TenantId == _tenantId && !s.IsDeleted);
		modelBuilder.Entity<Brand>().HasQueryFilter(b => b.TenantId == _tenantId && !b.IsDeleted);
		modelBuilder.Entity<UnitOfMeasure>().HasQueryFilter(e => e.TenantId == _tenantId && !e.IsDeleted);
		modelBuilder.Entity<ProductGroup>().HasQueryFilter(e => e.TenantId == _tenantId && !e.IsDeleted);
		modelBuilder.Entity<ProductSubgroup>().HasQueryFilter(e => e.TenantId == _tenantId && !e.IsDeleted);
		modelBuilder.Entity<Presentation>().HasQueryFilter(e => e.TenantId == _tenantId && !e.IsDeleted);
		modelBuilder.Entity<BrandGroup>().HasQueryFilter(e => e.TenantId == _tenantId && !e.IsDeleted);
		modelBuilder.Entity<BrandPresentation>().HasQueryFilter(e => e.TenantId == _tenantId && !e.IsDeleted);
		modelBuilder.Entity<ProductPresentation>().HasQueryFilter(e => e.TenantId == _tenantId && !e.IsDeleted);
		modelBuilder.Entity<BrandBudget>().HasQueryFilter(bb => bb.TenantId == _tenantId && !bb.IsDeleted);
		modelBuilder.Entity<SellerTarget>().HasQueryFilter(st => st.TenantId == _tenantId);
		modelBuilder.Entity<InventoryMovement>().HasQueryFilter(im => im.TenantId == _tenantId && !im.IsDeleted);
		modelBuilder.Entity<StockAlert>().HasQueryFilter(sa => sa.TenantId == _tenantId);
		modelBuilder.Entity<Customer>().HasQueryFilter(c => c.TenantId == _tenantId && !c.IsDeleted);
		modelBuilder.Entity<DocumentSequence>().HasQueryFilter(ds => ds.TenantId == _tenantId);
		modelBuilder.Entity<SalesDocument>().HasQueryFilter(sd => sd.TenantId == _tenantId && !sd.IsDeleted);
		modelBuilder.Entity<ProductCost>().HasQueryFilter(pc => pc.TenantId == _tenantId && !pc.IsDeleted);
		modelBuilder.Entity<PurchaseOrder>().HasQueryFilter(po => po.TenantId == _tenantId && !po.IsDeleted);
		modelBuilder.Entity<SalesPayment>().HasQueryFilter(sp => sp.TenantId == _tenantId && !sp.IsDeleted);
		modelBuilder.Entity<Account>().HasQueryFilter(a => a.TenantId == _tenantId && !a.IsDeleted);
		modelBuilder.Entity<AccountMovement>().HasQueryFilter(am => am.TenantId == _tenantId && !am.IsDeleted);

		// Child entities filtered via parent's TenantId (no direct TenantId column)
		modelBuilder.Entity<InventoryMovementLine>().HasQueryFilter(iml => iml.Movement.TenantId == _tenantId && !iml.IsDeleted);
		modelBuilder.Entity<SalesDocumentLine>().HasQueryFilter(sdl => sdl.SalesDocument.TenantId == _tenantId && !sdl.IsDeleted);
		modelBuilder.Entity<PurchaseOrderLine>().HasQueryFilter(pol => pol.PurchaseOrder.TenantId == _tenantId && !pol.IsDeleted);

		// Classifier: dual-scope — global (TenantId=null) visible to all tenants, tenant-scoped visible only to owner
		modelBuilder.Entity<Classifier>().HasQueryFilter(c => !c.IsDeleted && (c.TenantId == null || c.TenantId == _tenantId));

		// Global entities (no tenant filter, soft delete only)
		modelBuilder.Entity<ClassifierType>().HasQueryFilter(ct => !ct.IsDeleted);
		// Roles: global (no filter)
		// HolidaysCache: global (no filter)

		// Configuraciones de entidades
		ConfigureTenant(modelBuilder);
		ConfigureUser(modelBuilder);
		ConfigureRole(modelBuilder);
		ConfigureSubscription(modelBuilder);
		ConfigureProduct(modelBuilder);
		ConfigureUnitOfMeasure(modelBuilder);
		ConfigureProductGroup(modelBuilder);
		ConfigureProductSubgroup(modelBuilder);
		ConfigurePresentation(modelBuilder);
		ConfigureBrandGroup(modelBuilder);
		ConfigureBrandPresentation(modelBuilder);
		ConfigureProductPresentation(modelBuilder);
		ConfigureInventoryItem(modelBuilder);
		ConfigureWarehouse(modelBuilder);
		ConfigurePriceList(modelBuilder);
		ConfigurePriceListItem(modelBuilder);
		ConfigureSupplier(modelBuilder);
		ConfigureBrand(modelBuilder);
		ConfigureBrandBudget(modelBuilder);
		ConfigureSellerTarget(modelBuilder);
		ConfigureHolidaysCache(modelBuilder);
		ConfigureInventoryMovement(modelBuilder);
		ConfigureInventoryMovementLine(modelBuilder);
		ConfigureStockAlert(modelBuilder);
		ConfigureCustomer(modelBuilder);
		ConfigureDocumentSequence(modelBuilder);
		ConfigureSalesDocument(modelBuilder);
		ConfigureSalesDocumentLine(modelBuilder);
		ConfigureProductCost(modelBuilder);
		ConfigurePurchaseOrder(modelBuilder);
		ConfigurePurchaseOrderLine(modelBuilder);
		ConfigureSalesPayment(modelBuilder);
		ConfigureAccount(modelBuilder);
		ConfigureAccountMovement(modelBuilder);

		// Seeding deshabilitado temporalmente para facilitar pruebas en Development
		// modelBuilder.ApplyConfiguration(new TenantSeedConfiguration());
		// modelBuilder.ApplyConfiguration(new UserSeedConfiguration());
		// modelBuilder.ApplyConfiguration(new RoleSeedConfiguration());
		// modelBuilder.ApplyConfiguration(new SubscriptionSeedConfiguration());

		// Índices únicos y de performance
		modelBuilder.Entity<Tenant>()
			.HasIndex(t => t.Code)
			.IsUnique()
			.HasDatabaseName("IX_Tenants_Code");

		modelBuilder.Entity<User>()
			.HasIndex(u => new { u.TenantId, u.Email })
			.IsUnique();

		modelBuilder.Entity<Product>()
			.HasIndex(p => new { p.TenantId, p.Code })
			.IsUnique();

		// Product group index for filtering
		modelBuilder.Entity<Product>()
			.HasIndex(p => new { p.TenantId, p.ProductGroupId });

		modelBuilder.Entity<Warehouse>()
			.HasIndex(w => new { w.TenantId, w.Code })
			.IsUnique();

		modelBuilder.Entity<Supplier>()
			.HasIndex(s => new { s.TenantId, s.Code })
			.IsUnique();

		modelBuilder.Entity<Supplier>()
			.HasIndex(s => new { s.TenantId, s.Email });

		modelBuilder.Entity<Subscription>()
			.HasIndex(s => new { s.TenantId, s.Status });

		modelBuilder.Entity<InventoryItem>()
			.HasIndex(i => new { i.ProductId, i.WarehouseId });

		// Índices para Kardex
		modelBuilder.Entity<InventoryMovement>()
			.HasIndex(im => new { im.TenantId, im.Date })
			.HasDatabaseName("IX_InventoryMovement_TenantId_Date");

		modelBuilder.Entity<InventoryMovement>()
			.HasIndex(im => new { im.WarehouseId, im.Date })
			.HasDatabaseName("IX_InventoryMovement_WarehouseId_Date");

		modelBuilder.Entity<InventoryMovement>()
			.HasIndex(im => im.ReferenceType)
			.HasDatabaseName("IX_InventoryMovement_ReferenceType");

		modelBuilder.Entity<InventoryMovementLine>()
			.HasIndex(iml => new { iml.ProductId, iml.MovementId })
			.HasDatabaseName("IX_InventoryMovementLine_ProductId_MovementId");

		modelBuilder.Entity<StockAlert>()
			.HasIndex(sa => new { sa.TenantId, sa.WarehouseId, sa.ProductId })
			.HasDatabaseName("IX_StockAlert_TenantId_WarehouseId_ProductId");

		modelBuilder.Entity<StockAlert>()
			.HasIndex(sa => new { sa.TriggeredAt, sa.IsResolved })
			.HasDatabaseName("IX_StockAlert_TriggeredAt_IsResolved");

		// RowVersion para concurrencia optimista
		modelBuilder.Entity<User>()
				.Property(u => u.ConcurrencyStamp)
				.IsConcurrencyToken();

		modelBuilder.Entity<Subscription>()
				.Property<byte[]>("RowVersion")
				.HasColumnName("RowVersion")
				.HasDefaultValueSql("NEWID()")
				.ValueGeneratedOnAddOrUpdate()
				.IsConcurrencyToken();
	}

	partial void OnModelCreatingPartial(ModelBuilder modelBuilder);

	private void ConfigureTenant(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Tenant>(entity => {
			entity.Property(t => t.Code).IsRequired().HasMaxLength(50);
			entity.Property(t => t.BusinessName).IsRequired().HasMaxLength(200);
			entity.Property(t => t.CommercialName).HasMaxLength(200);
			entity.Property(t => t.PersonType).HasConversion<string>();
			entity.Property(t => t.IdentificationType).HasConversion<string>();
			entity.Property(t => t.IdentificationNumber).IsRequired().HasMaxLength(20);
			entity.Property(t => t.VerificationDigit).HasMaxLength(1);
			entity.Property(t => t.LegalRepresentativeName).HasMaxLength(200);
			entity.Property(t => t.LegalRepresentativeId).HasMaxLength(20);
			entity.Property(t => t.LegalRepresentativeEmail).HasMaxLength(256);
			entity.Property(t => t.LegalRepresentativePhone).HasMaxLength(20);
			entity.Property(t => t.TaxRegime).HasMaxLength(50);
			entity.Property(t => t.TaxAddress).HasMaxLength(300);
			entity.Property(t => t.TaxCity).HasMaxLength(100);
			entity.Property(t => t.TaxDepartment).HasMaxLength(100);
			entity.Property(t => t.ContactName).HasMaxLength(200);
			entity.Property(t => t.ContactEmail).HasMaxLength(256);
			entity.Property(t => t.ContactPhone).HasMaxLength(20);
			entity.Property(t => t.Address).HasMaxLength(300);
			entity.Property(t => t.City).HasMaxLength(100);
			entity.Property(t => t.Department).HasMaxLength(100);
			entity.Property(t => t.Country).HasMaxLength(100);
			entity.Property(t => t.TimeZone).HasMaxLength(100);
			entity.Property(t => t.Language).HasMaxLength(10);
			entity.Property(t => t.Currency).HasMaxLength(3);
			entity.Property(t => t.Status).HasConversion<string>();

			// Avoid unintended relationships that conflict with string TenantId in dependents
			// These collections are not mapped to prevent EF from creating shadow FKs (TenantId1)
			entity.Ignore(t => t.Users);
			entity.Ignore(t => t.Subscriptions);
			entity.Ignore(t => t.Products);
			entity.Ignore(t => t.Warehouses);
			entity.Ignore(t => t.Suppliers);
			entity.Ignore(t => t.PriceLists);
		});
	}

	private void ConfigureUser(ModelBuilder modelBuilder) {
		modelBuilder.Entity<User>(entity => {
			entity.Property(u => u.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(u => u.FirstName).IsRequired().HasMaxLength(100);
			entity.Property(u => u.LastName).IsRequired().HasMaxLength(100);
			entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
			entity.Property(u => u.UserName).IsRequired().HasMaxLength(256);
		});
	}

	private void ConfigureRole(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Role>(entity => {
			entity.Property(r => r.Name).IsRequired().HasMaxLength(256);
			entity.Property(r => r.NormalizedName).IsRequired().HasMaxLength(256);
			entity.Property(r => r.Description).HasMaxLength(500);
		});
	}

	private void ConfigureSubscription(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Subscription>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(e => e.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(e => e.PlanName).IsRequired().HasMaxLength(100);
			entity.Property(e => e.Currency).HasMaxLength(3).HasDefaultValue("COP");
			entity.Property(e => e.MaxUsers).HasDefaultValue(10);
			entity.Property(e => e.Status).HasConversion<string>();
		});
	}

	private void ConfigureProduct(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Product>(entity => {
			entity.Property(p => p.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(p => p.Code).IsRequired().HasMaxLength(50);
			entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
			entity.Property(p => p.Description).HasMaxLength(1000);
			entity.Property(p => p.CreatedBy).HasMaxLength(100);
			entity.Property(p => p.UpdatedBy).HasMaxLength(100);

			// Navigation: FK a Brand (opcional)
			entity.HasOne(p => p.Brand)
				.WithMany(b => b.Products)
				.HasForeignKey(p => p.BrandId)
				.OnDelete(DeleteBehavior.SetNull);

			// Navigation: FK a tablas maestras nuevas (opcionales)
			entity.HasOne(p => p.ProductGroup)
				.WithMany(g => g.Products)
				.HasForeignKey(p => p.ProductGroupId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(p => p.ProductSubgroup)
				.WithMany(s => s.Products)
				.HasForeignKey(p => p.ProductSubgroupId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(p => p.UnitOfMeasure)
				.WithMany(u => u.Products)
				.HasForeignKey(p => p.UnitOfMeasureId)
				.OnDelete(DeleteBehavior.Restrict);

			// Índices
			entity.HasIndex(p => new { p.TenantId, p.BrandId });
			entity.HasIndex(p => p.ProductGroupId);
			entity.HasIndex(p => p.ProductSubgroupId);
			entity.HasIndex(p => p.UnitOfMeasureId);
		});
	}

	private void ConfigurePresentation(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Presentation>(entity => {
			entity.Property(p => p.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(p => p.Name).IsRequired().HasMaxLength(100);
			entity.Property(p => p.Description).HasMaxLength(500);
			entity.Property(p => p.CreatedBy).HasMaxLength(100);
			entity.Property(p => p.UpdatedBy).HasMaxLength(100);

			entity.HasIndex(p => new { p.TenantId, p.Name })
				.IsUnique()
				.HasFilter("[IsDeleted] = 0")
				.HasDatabaseName("IX_Presentations_TenantId_Name");
		});
	}

	private void ConfigureUnitOfMeasure(ModelBuilder modelBuilder) {
		modelBuilder.Entity<UnitOfMeasure>(entity => {
			entity.Property(u => u.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(u => u.Name).IsRequired().HasMaxLength(100);
			entity.Property(u => u.Abbreviation).IsRequired().HasMaxLength(10);
			entity.Property(u => u.CreatedBy).HasMaxLength(100);
			entity.Property(u => u.UpdatedBy).HasMaxLength(100);

			entity.HasIndex(u => new { u.TenantId, u.Abbreviation })
				.IsUnique()
				.HasFilter("[IsDeleted] = 0")
				.HasDatabaseName("IX_UnitOfMeasures_TenantId_Abbreviation");
		});
	}

	private void ConfigureProductGroup(ModelBuilder modelBuilder) {
		modelBuilder.Entity<ProductGroup>(entity => {
			entity.Property(g => g.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(g => g.Name).IsRequired().HasMaxLength(200);
			entity.Property(g => g.Description).HasMaxLength(500);
			entity.Property(g => g.CreatedBy).HasMaxLength(100);
			entity.Property(g => g.UpdatedBy).HasMaxLength(100);

			entity.HasIndex(g => new { g.TenantId, g.Name })
				.IsUnique()
				.HasFilter("[IsDeleted] = 0")
				.HasDatabaseName("IX_ProductGroups_TenantId_Name");
		});
	}

	private void ConfigureProductSubgroup(ModelBuilder modelBuilder) {
		modelBuilder.Entity<ProductSubgroup>(entity => {
			entity.Property(s => s.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(s => s.Name).IsRequired().HasMaxLength(200);
			entity.Property(s => s.Description).HasMaxLength(500);
			entity.Property(s => s.CreatedBy).HasMaxLength(100);
			entity.Property(s => s.UpdatedBy).HasMaxLength(100);

			entity.HasOne(s => s.ProductGroup)
				.WithMany(g => g.Subgroups)
				.HasForeignKey(s => s.ProductGroupId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(s => new { s.TenantId, s.ProductGroupId, s.Name })
				.IsUnique()
				.HasFilter("[IsDeleted] = 0")
				.HasDatabaseName("IX_ProductSubgroups_TenantId_Group_Name");
		});
	}

	private void ConfigureBrandGroup(ModelBuilder modelBuilder) {
		modelBuilder.Entity<BrandGroup>(entity => {
			entity.Property(bg => bg.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(bg => bg.CreatedBy).HasMaxLength(100);
			entity.Property(bg => bg.UpdatedBy).HasMaxLength(100);

			entity.HasOne(bg => bg.Brand)
				.WithMany(b => b.BrandGroups)
				.HasForeignKey(bg => bg.BrandId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasOne(bg => bg.ProductGroup)
				.WithMany(g => g.BrandGroups)
				.HasForeignKey(bg => bg.ProductGroupId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(bg => new { bg.TenantId, bg.BrandId, bg.ProductGroupId })
				.IsUnique()
				.HasFilter("[IsDeleted] = 0")
				.HasDatabaseName("IX_BrandGroups_TenantId_Brand_Group");
		});
	}

	private void ConfigureBrandPresentation(ModelBuilder modelBuilder) {
		modelBuilder.Entity<BrandPresentation>(entity => {
			entity.Property(bp => bp.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(bp => bp.Content).HasColumnType("decimal(18,3)");
			entity.Property(bp => bp.DisplayName).IsRequired().HasMaxLength(200);
			entity.Property(bp => bp.CreatedBy).HasMaxLength(100);
			entity.Property(bp => bp.UpdatedBy).HasMaxLength(100);

			entity.HasOne(bp => bp.Brand)
				.WithMany(b => b.BrandPresentations)
				.HasForeignKey(bp => bp.BrandId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasOne(bp => bp.Presentation)
				.WithMany(p => p.BrandPresentations)
				.HasForeignKey(bp => bp.PresentationId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(bp => bp.UnitOfMeasure)
				.WithMany(u => u.BrandPresentations)
				.HasForeignKey(bp => bp.UnitOfMeasureId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(bp => new { bp.TenantId, bp.BrandId, bp.PresentationId, bp.Content })
				.IsUnique()
				.HasFilter("[IsDeleted] = 0")
				.HasDatabaseName("IX_BrandPresentations_TenantId_Brand_Pres_Content");
		});
	}

	private void ConfigureProductPresentation(ModelBuilder modelBuilder) {
		modelBuilder.Entity<ProductPresentation>(entity => {
			entity.Property(pp => pp.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(pp => pp.CreatedBy).HasMaxLength(100);
			entity.Property(pp => pp.UpdatedBy).HasMaxLength(100);

			entity.HasOne(pp => pp.Product)
				.WithMany(p => p.ProductPresentations)
				.HasForeignKey(pp => pp.ProductId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasOne(pp => pp.BrandPresentation)
				.WithMany(bp => bp.ProductPresentations)
				.HasForeignKey(pp => pp.BrandPresentationId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(pp => new { pp.TenantId, pp.ProductId, pp.BrandPresentationId })
				.IsUnique()
				.HasFilter("[IsDeleted] = 0")
				.HasDatabaseName("IX_ProductPresentations_TenantId_Product_BrandPres");
		});
	}

	private void ConfigureInventoryItem(ModelBuilder modelBuilder) {
		modelBuilder.Entity<InventoryItem>(entity => {
			entity.Property(i => i.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(i => i.Quantity).HasColumnType("decimal(18,3)");
			entity.Property(i => i.MinStock).HasColumnType("decimal(18,3)");
			entity.Property(i => i.MaxStock).HasColumnType("decimal(18,3)");
			entity.Property(i => i.CreatedBy).HasMaxLength(100);
			entity.Property(i => i.UpdatedBy).HasMaxLength(100);
			entity.HasOne(i => i.Product)
					.WithMany(p => p.InventoryItems)
					.HasForeignKey(i => i.ProductId)
					.OnDelete(DeleteBehavior.NoAction); // Cambiar a NoAction
			entity.HasOne(i => i.ProductPresentation)
					.WithMany(pp => pp.InventoryItems)
					.HasForeignKey(i => i.ProductPresentationId)
					.OnDelete(DeleteBehavior.Restrict);
			entity.HasOne(i => i.Warehouse)
					.WithMany(w => w.InventoryItems)
					.HasForeignKey(i => i.WarehouseId)
					.OnDelete(DeleteBehavior.NoAction); // Cambiar a NoAction

			// SKU identity: one stock record per (Tenant, Warehouse, Product, ProductPresentation)
			entity.HasIndex(i => new { i.TenantId, i.WarehouseId, i.ProductId, i.ProductPresentationId })
				.IsUnique()
				.HasDatabaseName("IX_InventoryItems_SKU");

			// Optimistic concurrency on stock quantity
			entity.Property(i => i.RowVersion).IsRowVersion();
		});
	}

	private void ConfigureWarehouse(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Warehouse>(entity => {
			entity.Property(w => w.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(w => w.Code).IsRequired().HasMaxLength(50);
			entity.Property(w => w.Name).IsRequired().HasMaxLength(200);
			entity.Property(w => w.Address).HasMaxLength(500);
			entity.Property(w => w.CreatedBy).HasMaxLength(100);
			entity.Property(w => w.UpdatedBy).HasMaxLength(100);
		});
	}

	private void ConfigurePriceList(ModelBuilder modelBuilder) {
		modelBuilder.Entity<PriceList>(entity => {
			entity.Property(pl => pl.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(pl => pl.Name).IsRequired().HasMaxLength(200);
			entity.Property(pl => pl.Description).HasMaxLength(1000);
			entity.Property(pl => pl.CreatedBy).HasMaxLength(100);
			entity.Property(pl => pl.UpdatedBy).HasMaxLength(100);
		});
	}

	private void ConfigurePriceListItem(ModelBuilder modelBuilder) {
		modelBuilder.Entity<PriceListItem>(entity => {
			entity.HasOne(pli => pli.PriceList)
					.WithMany(pl => pl.Items)
					.HasForeignKey(pli => pli.PriceListId);
			entity.HasOne(pli => pli.Product)
					.WithMany(p => p.PriceListItems)
					.HasForeignKey(pli => pli.ProductId)
					.OnDelete(DeleteBehavior.NoAction);
			entity.HasOne(pli => pli.ProductPresentation)
					.WithMany(pp => pp.PriceListItems)
					.HasForeignKey(pli => pli.ProductPresentationId)
					.OnDelete(DeleteBehavior.Restrict);
			entity.Property(pli => pli.Price).HasColumnType("decimal(18,2)");
			entity.Property(pli => pli.DiscountPercentage).HasColumnType("decimal(5,2)");
			entity.Property(pli => pli.CreatedBy).HasMaxLength(100);
			entity.Property(pli => pli.UpdatedBy).HasMaxLength(100);
		});

		// Matching filter: strict tenant via parent PriceList
		modelBuilder.Entity<PriceListItem>()
			.HasQueryFilter(pli => pli.PriceList.TenantId == _tenantId && !pli.IsDeleted);
	}

	private void ConfigureSupplier(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Supplier>(entity => {
			entity.Property(s => s.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(s => s.Code).IsRequired().HasMaxLength(50);
			entity.Property(s => s.Name).IsRequired().HasMaxLength(200);
			entity.Property(s => s.ContactName).HasMaxLength(200);
			entity.Property(s => s.DocumentType).HasMaxLength(20);
			entity.Property(s => s.DocumentNumber).HasMaxLength(30);
			entity.Property(s => s.Department).HasMaxLength(100);
			entity.Property(s => s.City).HasMaxLength(100);
			entity.Property(s => s.Address).HasMaxLength(500);
			entity.Property(s => s.Phone).HasMaxLength(20);
			entity.Property(s => s.Phone2).HasMaxLength(20);
			entity.Property(s => s.Email).HasMaxLength(256);
			entity.Property(s => s.CreatedBy).HasMaxLength(100);
			entity.Property(s => s.UpdatedBy).HasMaxLength(100);
			// Optional composite index for quick search by document
			entity.HasIndex(s => new { s.TenantId, s.DocumentNumber });
		});
	}

	private void ConfigureBrand(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Brand>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(b => b.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(b => b.Code).IsRequired().HasMaxLength(50);
			entity.Property(b => b.Name).IsRequired().HasMaxLength(200);
			entity.Property(b => b.Description).HasMaxLength(1000);
			entity.Property(b => b.CreatedBy).IsRequired().HasMaxLength(100);
			entity.Property(b => b.UpdatedBy).HasMaxLength(100);
			entity.Property(b => b.RowVersion).IsRowVersion();

			// Índices
			entity.HasIndex(b => new { b.TenantId, b.Code }).IsUnique();

			// Navigation
			entity.HasMany(b => b.Budgets)
				.WithOne(bb => bb.Brand)
				.HasForeignKey(bb => bb.BrandId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasMany(b => b.SellerTargets)
				.WithOne(st => st.Brand)
				.HasForeignKey(st => st.BrandId)
				.OnDelete(DeleteBehavior.Cascade);
		});
	}

	private void ConfigureBrandBudget(ModelBuilder modelBuilder) {
		modelBuilder.Entity<BrandBudget>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(bb => bb.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(bb => bb.AnnualAmount).HasColumnType("decimal(18,2)");
			entity.Property(bb => bb.GrowthRate).HasColumnType("decimal(10,5)");
			entity.Property(bb => bb.CreatedBy).IsRequired().HasMaxLength(100);
			entity.Property(bb => bb.UpdatedBy).HasMaxLength(100);

			// Índices
			entity.HasIndex(bb => new { bb.TenantId, bb.BrandId, bb.Year }).IsUnique();

			// Navigation
			entity.HasOne(bb => bb.Brand)
				.WithMany(b => b.Budgets)
				.HasForeignKey(bb => bb.BrandId)
				.OnDelete(DeleteBehavior.Cascade);
		});
	}

	private void ConfigureSellerTarget(ModelBuilder modelBuilder) {
		modelBuilder.Entity<SellerTarget>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(st => st.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(st => st.SellerId).IsRequired().HasMaxLength(450);
			entity.Property(st => st.TargetAmount).HasColumnType("decimal(18,2)");
			entity.Property(st => st.DailyTarget).HasColumnType("decimal(18,2)");
			entity.Property(st => st.ActualSales).HasColumnType("decimal(18,2)");
			entity.Property(st => st.CompletionPercentage).HasColumnType("decimal(5,2)");
			entity.Property(st => st.CreatedBy).IsRequired().HasMaxLength(100);
			entity.Property(st => st.UpdatedBy).HasMaxLength(100);

			// Índices
			entity.HasIndex(st => new { st.TenantId, st.BrandId, st.Year, st.Month });
			entity.HasIndex(st => new { st.TenantId, st.SellerId, st.Year, st.Month });

			// Navigation
			entity.HasOne(st => st.Brand)
				.WithMany(b => b.SellerTargets)
				.HasForeignKey(st => st.BrandId)
				.OnDelete(DeleteBehavior.Cascade);
		});
	}

	private void ConfigureHolidaysCache(ModelBuilder modelBuilder) {
		modelBuilder.Entity<HolidaysCache>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(h => h.Country).IsRequired().HasMaxLength(2);
			entity.Property(h => h.Name).IsRequired().HasMaxLength(200);

			// Índices para búsqueda rápida
			entity.HasIndex(h => new { h.Country, h.Year, h.HolidayDate }).IsUnique();
			entity.HasIndex(h => new { h.Country, h.Year });
		});
	}

	private void ConfigureInventoryMovement(ModelBuilder modelBuilder) {
		modelBuilder.Entity<InventoryMovement>(entity => {
			entity.HasKey(e => e.Id);

			// Propiedades requeridas
			entity.Property(im => im.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(im => im.Date).IsRequired();
			entity.Property(im => im.Type).IsRequired().HasConversion<string>();
			entity.Property(im => im.WarehouseId).IsRequired();

			// Propiedades opcionales
			entity.Property(im => im.WarehouseToId);
			entity.Property(im => im.Reason).HasMaxLength(500);
			entity.Property(im => im.Notes).HasMaxLength(1000);
			entity.Property(im => im.ReferenceType).HasMaxLength(100);
			entity.Property(im => im.ReferenceId).HasMaxLength(100);
			entity.Property(im => im.WasNegative);

			// Auditoría
			entity.Property(im => im.CreatedAt).IsRequired();
			entity.Property(im => im.CreatedBy).IsRequired().HasMaxLength(100);
			entity.Property(im => im.UpdatedAt);
			entity.Property(im => im.UpdatedBy).HasMaxLength(100);

			// Relaciones
			entity.HasOne(im => im.Warehouse)
				.WithMany(w => w.InventoryMovements)
				.HasForeignKey(im => im.WarehouseId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(im => im.WarehouseTo)
				.WithMany(w => w.IncomingTransfers)
				.HasForeignKey(im => im.WarehouseToId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(im => im.Supplier)
				.WithMany()
				.HasForeignKey(im => im.SupplierId)
				.IsRequired(false)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasMany(im => im.Lines)
				.WithOne(iml => iml.Movement)
				.HasForeignKey(iml => iml.MovementId)
				.OnDelete(DeleteBehavior.Cascade);

			// Índices
			entity.HasIndex(im => new { im.TenantId, im.SupplierId })
				.HasDatabaseName("IX_InventoryMovement_TenantId_SupplierId");

			entity.HasIndex(im => new { im.TenantId, im.Date })
				.HasDatabaseName("IX_InventoryMovement_TenantId_Date");

			entity.HasIndex(im => new { im.WarehouseId, im.Date })
				.HasDatabaseName("IX_InventoryMovement_WarehouseId_Date");

			entity.HasIndex(im => im.ReferenceType)
				.HasDatabaseName("IX_InventoryMovement_ReferenceType");
		});
	}

	private void ConfigureInventoryMovementLine(ModelBuilder modelBuilder) {
		modelBuilder.Entity<InventoryMovementLine>(entity => {
			entity.HasKey(e => e.Id);

			// Propiedades requeridas
			entity.Property(iml => iml.MovementId).IsRequired();
			entity.Property(iml => iml.ProductId).IsRequired();
			entity.Property(iml => iml.Quantity).HasColumnType("decimal(18,3)").IsRequired();

			// Propiedades
			entity.Property(iml => iml.ProductPresentationId).IsRequired();
			entity.Property(iml => iml.UnitCost).HasColumnType("decimal(18,2)");
			entity.Property(iml => iml.ConversionFactor).HasColumnType("decimal(18,3)").HasDefaultValue(1m);

			// Relaciones
			entity.HasOne(iml => iml.Movement)
				.WithMany(im => im.Lines)
				.HasForeignKey(iml => iml.MovementId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasOne(iml => iml.Product)
				.WithMany(p => p.InventoryMovementLines)
				.HasForeignKey(iml => iml.ProductId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(iml => iml.ProductPresentation)
				.WithMany(pp => pp.InventoryMovementLines)
				.HasForeignKey(iml => iml.ProductPresentationId)
				.OnDelete(DeleteBehavior.Restrict);

			// Índices
			entity.HasIndex(iml => new { iml.ProductId, iml.MovementId })
				.HasDatabaseName("IX_InventoryMovementLine_ProductId_MovementId");
		});
	}

	private void ConfigureStockAlert(ModelBuilder modelBuilder) {
		modelBuilder.Entity<StockAlert>(entity => {
			entity.HasKey(e => e.Id);

			// Propiedades requeridas
			entity.Property(sa => sa.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(sa => sa.Type).IsRequired().HasConversion<string>();
			entity.Property(sa => sa.WarehouseId).IsRequired();
			entity.Property(sa => sa.ProductId).IsRequired();
			entity.Property(sa => sa.Message).IsRequired().HasMaxLength(500);

			// Propiedades opcionales
			entity.Property(sa => sa.ReferenceType).HasMaxLength(100);
			entity.Property(sa => sa.ReferenceId).HasMaxLength(100);

			// Relaciones
			entity.HasOne(sa => sa.Warehouse)
				.WithMany(w => w.StockAlerts)
				.HasForeignKey(sa => sa.WarehouseId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(sa => sa.Product)
				.WithMany(p => p.StockAlerts)
				.HasForeignKey(sa => sa.ProductId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(sa => sa.ProductPresentation)
				.WithMany(pp => pp.StockAlerts)
				.HasForeignKey(sa => sa.ProductPresentationId)
				.OnDelete(DeleteBehavior.Restrict);

			// Índices
			entity.HasIndex(sa => new { sa.TenantId, sa.WarehouseId, sa.ProductId })
				.HasDatabaseName("IX_StockAlert_TenantId_WarehouseId_ProductId");

			entity.HasIndex(sa => new { sa.TriggeredAt, sa.IsResolved })
				.HasDatabaseName("IX_StockAlert_TriggeredAt_IsResolved");
		});
	}

	private void ConfigureCustomer(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Customer>(entity => {
			entity.Property(c => c.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(c => c.Code).IsRequired().HasMaxLength(50);
			entity.Property(c => c.Name).IsRequired().HasMaxLength(200);
			entity.Property(c => c.ContactName).HasMaxLength(200);
			entity.Property(c => c.DocumentType).HasMaxLength(20);
			entity.Property(c => c.DocumentNumber).HasMaxLength(30);
			entity.Property(c => c.Department).HasMaxLength(100);
			entity.Property(c => c.City).HasMaxLength(100);
			entity.Property(c => c.Address).HasMaxLength(500);
			entity.Property(c => c.Phone).HasMaxLength(20);
			entity.Property(c => c.Phone2).HasMaxLength(20);
			entity.Property(c => c.Email).HasMaxLength(256);
			entity.Property(c => c.CreatedBy).HasMaxLength(100);
			entity.Property(c => c.UpdatedBy).HasMaxLength(100);

			entity.HasOne(c => c.ZoneClassifier)
				.WithMany()
				.HasForeignKey(c => c.ZoneClassifierId)
				.OnDelete(DeleteBehavior.SetNull);

			entity.HasIndex(c => new { c.TenantId, c.Code }).IsUnique();
			entity.HasIndex(c => new { c.TenantId, c.DocumentNumber });
		});
	}

	private void ConfigureDocumentSequence(ModelBuilder modelBuilder) {
		modelBuilder.Entity<DocumentSequence>(entity => {
			entity.Property(ds => ds.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(ds => ds.DocType).IsRequired().HasMaxLength(20);

			entity.HasIndex(ds => new { ds.TenantId, ds.DocType, ds.Year }).IsUnique();
		});
	}

	private void ConfigureSalesDocument(ModelBuilder modelBuilder) {
		modelBuilder.Entity<SalesDocument>(entity => {
			entity.Property(sd => sd.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(sd => sd.DocNumber).HasMaxLength(50);
			entity.Property(sd => sd.SellerId).IsRequired().HasMaxLength(450);
			entity.Property(sd => sd.SellerName).HasMaxLength(200);
			entity.Property(sd => sd.Status).IsRequired().HasConversion<string>();
			entity.Property(sd => sd.Subtotal).HasColumnType("decimal(18,2)");
			entity.Property(sd => sd.Tax).HasColumnType("decimal(18,2)");
			entity.Property(sd => sd.Total).HasColumnType("decimal(18,2)");
			entity.Property(sd => sd.PaymentStatus).IsRequired().HasConversion<string>();
			entity.Property(sd => sd.Notes).HasMaxLength(1000);
			entity.Property(sd => sd.CreatedBy).HasMaxLength(100);
			entity.Property(sd => sd.UpdatedBy).HasMaxLength(100);

			entity.HasOne(sd => sd.Customer)
				.WithMany(c => c.SalesDocuments)
				.HasForeignKey(sd => sd.CustomerId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasOne(sd => sd.Warehouse)
				.WithMany()
				.HasForeignKey(sd => sd.WarehouseId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasMany(sd => sd.Lines)
				.WithOne(l => l.SalesDocument)
				.HasForeignKey(l => l.SalesDocumentId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasMany(sd => sd.Payments)
				.WithOne(sp => sp.SalesDocument)
				.HasForeignKey(sp => sp.SalesDocumentId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasIndex(sd => new { sd.TenantId, sd.Date });
			entity.HasIndex(sd => new { sd.TenantId, sd.Status });
			entity.HasIndex(sd => sd.CustomerId);
			entity.HasIndex(sd => new { sd.TenantId, sd.SellerId });
		});
	}

	private void ConfigureSalesDocumentLine(ModelBuilder modelBuilder) {
		modelBuilder.Entity<SalesDocumentLine>(entity => {
			entity.Property(l => l.SalesDocumentId).IsRequired();
			entity.Property(l => l.ProductId).IsRequired();
			entity.Property(l => l.Quantity).HasColumnType("decimal(18,3)");
			entity.Property(l => l.UnitPrice).HasColumnType("decimal(18,2)");
			entity.Property(l => l.UnitCost).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
			entity.Property(l => l.LineTotal).HasColumnType("decimal(18,2)");

			entity.HasOne(l => l.SalesDocument)
				.WithMany(sd => sd.Lines)
				.HasForeignKey(l => l.SalesDocumentId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasOne(l => l.Product)
				.WithMany()
				.HasForeignKey(l => l.ProductId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasOne(l => l.ProductPresentation)
				.WithMany(pp => pp.SalesDocumentLines)
				.HasForeignKey(l => l.ProductPresentationId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(l => l.PriceList)
				.WithMany()
				.HasForeignKey(l => l.PriceListId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasIndex(l => l.SalesDocumentId);
			entity.HasIndex(l => new { l.ProductId, l.SalesDocumentId });
		});
	}

	private void ConfigureSalesPayment(ModelBuilder modelBuilder) {
		modelBuilder.Entity<SalesPayment>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(sp => sp.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(sp => sp.Amount).HasColumnType("decimal(18,2)");
			entity.Property(sp => sp.Method).IsRequired().HasConversion<string>().HasMaxLength(50);
			entity.Property(sp => sp.Reference).HasMaxLength(200);
			entity.Property(sp => sp.Notes).HasMaxLength(500);
			entity.Property(sp => sp.CreatedBy).HasMaxLength(100);
			entity.Property(sp => sp.UpdatedBy).HasMaxLength(100);

			entity.HasOne(sp => sp.SalesDocument)
				.WithMany(sd => sd.Payments)
				.HasForeignKey(sp => sp.SalesDocumentId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasIndex(sp => new { sp.TenantId, sp.SalesDocumentId });
			entity.HasIndex(sp => sp.SalesDocumentId);
		});
	}

	private void ConfigureProductCost(ModelBuilder modelBuilder) {
		modelBuilder.Entity<ProductCost>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(pc => pc.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(pc => pc.StandardCost).HasColumnType("decimal(18,4)").HasDefaultValue(0m);
			entity.Property(pc => pc.LastPurchaseCost).HasColumnType("decimal(18,4)");
			entity.Property(pc => pc.CreatedBy).HasMaxLength(100);
			entity.Property(pc => pc.UpdatedBy).HasMaxLength(100);

			entity.HasOne(pc => pc.Product)
				.WithMany()
				.HasForeignKey(pc => pc.ProductId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasOne(pc => pc.ProductPresentation)
				.WithMany(pp => pp.ProductCosts)
				.HasForeignKey(pc => pc.ProductPresentationId)
				.OnDelete(DeleteBehavior.Restrict);

			// Unique index: one cost per (Tenant, Product, ProductPresentation)
			entity.HasIndex(pc => new { pc.TenantId, pc.ProductId, pc.ProductPresentationId })
				.IsUnique()
				.HasFilter("[IsDeleted] = 0")
				.HasDatabaseName("IX_ProductCosts_Tenant_Product_Presentation");
		});
	}

	private void ConfigurePurchaseOrder(ModelBuilder modelBuilder) {
		modelBuilder.Entity<PurchaseOrder>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(po => po.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(po => po.DocNumber).HasMaxLength(50);
			entity.Property(po => po.Status).IsRequired().HasConversion<string>();
			entity.Property(po => po.Notes).HasMaxLength(1000);
			entity.Property(po => po.CreatedBy).HasMaxLength(100);
			entity.Property(po => po.UpdatedBy).HasMaxLength(100);

			entity.HasOne(po => po.Supplier)
				.WithMany()
				.HasForeignKey(po => po.SupplierId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasOne(po => po.Warehouse)
				.WithMany()
				.HasForeignKey(po => po.WarehouseId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasOne(po => po.LastMovement)
				.WithMany()
				.HasForeignKey(po => po.LastMovementId)
				.IsRequired(false)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasMany(po => po.Lines)
				.WithOne(l => l.PurchaseOrder)
				.HasForeignKey(l => l.PurchaseOrderId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasIndex(po => new { po.TenantId, po.Date })
				.HasDatabaseName("IX_PurchaseOrders_TenantId_Date");
			entity.HasIndex(po => new { po.TenantId, po.Status })
				.HasDatabaseName("IX_PurchaseOrders_TenantId_Status");
			entity.HasIndex(po => po.SupplierId)
				.HasDatabaseName("IX_PurchaseOrders_SupplierId");
			entity.HasIndex(po => new { po.TenantId, po.DocNumber })
				.HasDatabaseName("IX_PurchaseOrders_TenantId_DocNumber");
		});
	}

	private void ConfigurePurchaseOrderLine(ModelBuilder modelBuilder) {
		modelBuilder.Entity<PurchaseOrderLine>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(l => l.PurchaseOrderId).IsRequired();
			entity.Property(l => l.ProductId).IsRequired();
			entity.Property(l => l.OrderedQuantity).HasColumnType("decimal(18,3)").IsRequired();
			entity.Property(l => l.ReceivedQuantity).HasColumnType("decimal(18,3)").HasDefaultValue(0m);
			entity.Property(l => l.UnitCost).HasColumnType("decimal(18,4)").IsRequired();

			entity.HasOne(l => l.PurchaseOrder)
				.WithMany(po => po.Lines)
				.HasForeignKey(l => l.PurchaseOrderId)
				.OnDelete(DeleteBehavior.Cascade);

			entity.HasOne(l => l.Product)
				.WithMany()
				.HasForeignKey(l => l.ProductId)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasOne(l => l.ProductPresentation)
				.WithMany(pp => pp.PurchaseOrderLines)
				.HasForeignKey(l => l.ProductPresentationId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(l => l.PurchaseOrderId)
				.HasDatabaseName("IX_PurchaseOrderLines_PurchaseOrderId");
			entity.HasIndex(l => new { l.ProductId, l.PurchaseOrderId })
				.HasDatabaseName("IX_PurchaseOrderLines_ProductId");
		});
	}

	private void ConfigureAccount(ModelBuilder modelBuilder) {
		modelBuilder.Entity<Account>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(a => a.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(a => a.Name).IsRequired().HasMaxLength(200);
			entity.Property(a => a.AccountType).IsRequired().HasConversion<string>().HasMaxLength(50);
			entity.Property(a => a.PaymentMethod).HasMaxLength(50);
			entity.Property(a => a.Currency).IsRequired().HasMaxLength(3).HasDefaultValue("COP");
			entity.Property(a => a.InitialBalance).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
			entity.Property(a => a.CurrentBalance).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
			entity.Property(a => a.CreatedBy).HasMaxLength(100);
			entity.Property(a => a.UpdatedBy).HasMaxLength(100);

			entity.HasMany(a => a.Movements)
				.WithOne(m => m.Account)
				.HasForeignKey(m => m.AccountId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasIndex(a => new { a.TenantId, a.AccountType })
				.HasDatabaseName("IX_Accounts_TenantId_AccountType");

			// Unique filtered index enforced at SQL level (one default per PaymentMethod per Tenant).
			// See _src/sql/202603161000_add_account_is_default.sql
			entity.HasIndex(a => new { a.TenantId, a.PaymentMethod })
				.HasDatabaseName("IX_Accounts_TenantId_PaymentMethod_Default")
				.HasFilter("[IsDefaultForPaymentMethod] = 1 AND [IsDeleted] = 0")
				.IsUnique();

			// Optimistic concurrency on balance
			entity.Property(a => a.RowVersion).IsRowVersion();
		});
	}

	private void ConfigureAccountMovement(ModelBuilder modelBuilder) {
		modelBuilder.Entity<AccountMovement>(entity => {
			entity.HasKey(e => e.Id);
			entity.Property(am => am.TenantId).IsRequired().HasMaxLength(50);
			entity.Property(am => am.AccountId).IsRequired();
			entity.Property(am => am.MovementType).IsRequired().HasConversion<string>().HasMaxLength(50);
			entity.Property(am => am.Amount).HasColumnType("decimal(18,2)").IsRequired();
			entity.Property(am => am.BalanceAfter).HasColumnType("decimal(18,2)").IsRequired();
			entity.Property(am => am.MovementDate).IsRequired();
			entity.Property(am => am.Description).IsRequired().HasMaxLength(500);
			entity.Property(am => am.Reference).HasMaxLength(200);
			entity.Property(am => am.SourceEntityType).HasMaxLength(100);
			entity.Property(am => am.CreatedBy).HasMaxLength(100);
			entity.Property(am => am.UpdatedBy).HasMaxLength(100);

			entity.HasOne(am => am.Account)
				.WithMany(a => a.Movements)
				.HasForeignKey(am => am.AccountId)
				.OnDelete(DeleteBehavior.Restrict);

			entity.HasOne(am => am.RelatedMovement)
				.WithMany()
				.HasForeignKey(am => am.RelatedMovementId)
				.IsRequired(false)
				.OnDelete(DeleteBehavior.NoAction);

			entity.HasIndex(am => new { am.AccountId, am.MovementDate })
				.HasDatabaseName("IX_AccountMovements_AccountId_MovementDate");
			entity.HasIndex(am => new { am.TenantId, am.MovementDate })
				.HasDatabaseName("IX_AccountMovements_TenantId_MovementDate");
		});
	}

	// NOTE: Programmatic migrations were removed. Schema must be applied via SQL scripts located in `_src/sql`.
}