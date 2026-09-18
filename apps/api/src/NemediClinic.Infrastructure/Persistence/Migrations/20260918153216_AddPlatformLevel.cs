using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace NemediClinic.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformLevel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ChannelId",
                table: "Tenants",
                type: "uniqueidentifier",
                nullable: false,
                // Los tenants que ya existen pasan al canal Nemedi (se inserta más abajo, antes de crear la FK).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<bool>(
                name: "EsIps",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Estado",
                table: "Tenants",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Activo");

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaActivacion",
                table: "Tenants",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Plan",
                table: "Tenants",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Basico");

            migrationBuilder.AddColumn<decimal>(
                name: "PorcentajeCanalOverride",
                table: "Tenants",
                type: "decimal(5,4)",
                precision: 5,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SedesAdicionales",
                table: "Tenants",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Channels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NombreComercial = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ColorPrimario = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    ColorSecundario = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    Dominio = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PorcentajeCanal = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Channels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformAdmins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RefreshToken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RefreshTokenExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformAdmins", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Leads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NIT = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Ciudad = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Contacto = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ChannelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FechaRegistro = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaLiberacion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Leads_Channels_ChannelId",
                        column: x => x.ChannelId,
                        principalTable: "Channels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Leads_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "Channels",
                columns: new[] { "Id", "Activo", "ColorPrimario", "ColorSecundario", "CreatedAt", "Dominio", "LogoUrl", "Nombre", "NombreComercial", "PorcentajeCanal", "Slug" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), true, "#171717", "#737373", new DateTime(2026, 9, 18, 0, 0, 0, 0, DateTimeKind.Utc), "app.nemediclinic.com", null, "Nemedi", "NemediClinic", 0m, "nemedi" },
                    { new Guid("22222222-2222-2222-2222-222222222222"), true, "#0B5FFF", "#0A2540", new DateTime(2026, 9, 18, 0, 0, 0, 0, DateTimeKind.Utc), "app.infotex.co", null, "Infotex", "Infotex Clinic", 0.50m, "infotex" }
                });

            // Tenants previos a la plataforma: se consideran activados el día en que se crearon.
            migrationBuilder.Sql("UPDATE Tenants SET FechaActivacion = CreatedAt WHERE FechaActivacion IS NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_ChannelId",
                table: "Tenants",
                column: "ChannelId");

            migrationBuilder.CreateIndex(
                name: "IX_Channels_Dominio",
                table: "Channels",
                column: "Dominio",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Channels_Slug",
                table: "Channels",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Leads_ChannelId",
                table: "Leads",
                column: "ChannelId");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_NIT",
                table: "Leads",
                column: "NIT");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_TenantId",
                table: "Leads",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformAdmins_Email",
                table: "PlatformAdmins",
                column: "Email",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Tenants_Channels_ChannelId",
                table: "Tenants",
                column: "ChannelId",
                principalTable: "Channels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tenants_Channels_ChannelId",
                table: "Tenants");

            migrationBuilder.DropTable(
                name: "Leads");

            migrationBuilder.DropTable(
                name: "PlatformAdmins");

            migrationBuilder.DropTable(
                name: "Channels");

            migrationBuilder.DropIndex(
                name: "IX_Tenants_ChannelId",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ChannelId",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "EsIps",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "Estado",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "FechaActivacion",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "Plan",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "PorcentajeCanalOverride",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "SedesAdicionales",
                table: "Tenants");
        }
    }
}
