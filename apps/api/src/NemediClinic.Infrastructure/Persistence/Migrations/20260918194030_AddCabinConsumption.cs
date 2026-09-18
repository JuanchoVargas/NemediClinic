using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NemediClinic.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Consumo de cabina (ClinicalNoteProducts), PackageProcedure como BaseEntity con TenantId y
    /// copia del paquete en la asignación.
    ///
    /// Editada a mano en dos puntos, porque EF no puede adivinarlos:
    ///   · PackageProcedures pasa de clave compuesta a Id propio: el Id se rellena con NEWID() y el
    ///     TenantId se toma del paquete ANTES de crear la nueva clave primaria (si no, todas las filas
    ///     quedarían con Guid vacío y la clave chocaría).
    ///   · Las asignaciones existentes copian nombre, sesiones y vigencia de su paquete de catálogo.
    /// </summary>
    public partial class AddCabinConsumption : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── PatientPackages: copia del paquete de catálogo ──────────────
            migrationBuilder.AddColumn<string>(
                name: "PackageNombre",
                table: "PatientPackages",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SesionesTotales",
                table: "PatientPackages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "VigenciaDias",
                table: "PatientPackages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DiasAlertaVencimiento",
                table: "PatientPackages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Las ventas ya hechas conservan lo que decía el catálogo en este momento.
            migrationBuilder.Sql(@"
                UPDATE pp
                SET pp.PackageNombre = p.Nombre,
                    pp.SesionesTotales = p.SesionesTotales,
                    pp.VigenciaDias = p.VigenciaDias,
                    pp.DiasAlertaVencimiento = p.DiasAlertaVencimiento
                FROM PatientPackages pp
                INNER JOIN Packages p ON p.Id = pp.PackageId;");

            // ── PackageProcedures: de clave compuesta a BaseEntity ──────────
            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "PackageProcedures",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "PackageProcedures",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PackageProcedures",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "PackageProcedures",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "PackageProcedures",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "PackageProcedures",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            // Un Id único por fila y el tenant del paquete, antes de tocar la clave primaria.
            migrationBuilder.Sql(@"
                UPDATE pp
                SET pp.Id = NEWID(),
                    pp.TenantId = p.TenantId,
                    pp.CreatedAt = p.CreatedAt,
                    pp.UpdatedAt = SYSUTCDATETIME()
                FROM PackageProcedures pp
                INNER JOIN Packages p ON p.Id = pp.PackageId;");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PackageProcedures",
                table: "PackageProcedures");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PackageProcedures",
                table: "PackageProcedures",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_PackageProcedures_PackageId_ProcedureId",
                table: "PackageProcedures",
                columns: new[] { "PackageId", "ProcedureId" },
                unique: true,
                filter: "IsDeleted = 0");

            // ── Consumo de cabina ───────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "ClinicalNoteProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClinicalNoteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Cantidad = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClinicalNoteProducts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClinicalNoteProducts_ClinicalNotes_ClinicalNoteId",
                        column: x => x.ClinicalNoteId,
                        principalTable: "ClinicalNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClinicalNoteProducts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalNoteProducts_ClinicalNoteId",
                table: "ClinicalNoteProducts",
                column: "ClinicalNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_ClinicalNoteProducts_ProductId",
                table: "ClinicalNoteProducts",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClinicalNoteProducts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PackageProcedures",
                table: "PackageProcedures");

            migrationBuilder.DropIndex(
                name: "IX_PackageProcedures_PackageId_ProcedureId",
                table: "PackageProcedures");

            // Volver a la clave compuesta exige que no queden filas eliminadas en suave
            migrationBuilder.Sql("DELETE FROM PackageProcedures WHERE IsDeleted = 1;");

            migrationBuilder.DropColumn(name: "Id", table: "PackageProcedures");
            migrationBuilder.DropColumn(name: "TenantId", table: "PackageProcedures");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "PackageProcedures");
            migrationBuilder.DropColumn(name: "UpdatedAt", table: "PackageProcedures");
            migrationBuilder.DropColumn(name: "IsDeleted", table: "PackageProcedures");
            migrationBuilder.DropColumn(name: "RowVersion", table: "PackageProcedures");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PackageProcedures",
                table: "PackageProcedures",
                columns: new[] { "PackageId", "ProcedureId" });

            migrationBuilder.DropColumn(name: "PackageNombre", table: "PatientPackages");
            migrationBuilder.DropColumn(name: "SesionesTotales", table: "PatientPackages");
            migrationBuilder.DropColumn(name: "VigenciaDias", table: "PatientPackages");
            migrationBuilder.DropColumn(name: "DiasAlertaVencimiento", table: "PatientPackages");
        }
    }
}
