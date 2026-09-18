using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NemediClinic.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductLots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Concentracion",
                table: "Products",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrincipioActivo",
                table: "Products",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RegistroSanitarioInvima",
                table: "Products",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiereCadenaFrio",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TipoRegulatorio",
                table: "Products",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "ProductLotId",
                table: "InventoryMovements",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProductLotId",
                table: "InventoryEntries",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductLots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NumeroLote = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    FechaVencimiento = table.Column<DateOnly>(type: "date", nullable: true),
                    CantidadInicial = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CantidadDisponible = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    FechaIngreso = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Proveedor = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    NumeroFactura = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    RegistroSanitario = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductLots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductLots_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryMovements_ProductLotId",
                table: "InventoryMovements",
                column: "ProductLotId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryEntries_ProductLotId",
                table: "InventoryEntries",
                column: "ProductLotId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductLots_ProductId_FechaVencimiento",
                table: "ProductLots",
                columns: new[] { "ProductId", "FechaVencimiento" });

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryEntries_ProductLots_ProductLotId",
                table: "InventoryEntries",
                column: "ProductLotId",
                principalTable: "ProductLots",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryMovements_ProductLots_ProductLotId",
                table: "InventoryMovements",
                column: "ProductLotId",
                principalTable: "ProductLots",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryEntries_ProductLots_ProductLotId",
                table: "InventoryEntries");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryMovements_ProductLots_ProductLotId",
                table: "InventoryMovements");

            migrationBuilder.DropTable(
                name: "ProductLots");

            migrationBuilder.DropIndex(
                name: "IX_InventoryMovements_ProductLotId",
                table: "InventoryMovements");

            migrationBuilder.DropIndex(
                name: "IX_InventoryEntries_ProductLotId",
                table: "InventoryEntries");

            migrationBuilder.DropColumn(
                name: "Concentracion",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "PrincipioActivo",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "RegistroSanitarioInvima",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "RequiereCadenaFrio",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "TipoRegulatorio",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ProductLotId",
                table: "InventoryMovements");

            migrationBuilder.DropColumn(
                name: "ProductLotId",
                table: "InventoryEntries");
        }
    }
}
