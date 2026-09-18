using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NemediClinic.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddValuationsAndConsents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RequiereConsentimiento",
                table: "Procedures",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Consents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EsteticistId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FechaFirma = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Titulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TextoFirmado = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FirmanteNombre = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FirmanteCedula = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AttachmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Consents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Consents_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Consents_Procedures_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "Procedures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Consents_Users_EsteticistId",
                        column: x => x.EsteticistId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ConsentTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Titulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Texto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsentTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConsentTemplates_Procedures_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "Procedures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Valuations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProspectoNombre = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ProspectoTelefono = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EsteticistId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Fecha = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Diagnostico = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TratamientoSugerido = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PackageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PrecioCotizado = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    MotivoRechazo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    FechaCierre = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PatientPackageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Valuations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Valuations_Packages_PackageId",
                        column: x => x.PackageId,
                        principalTable: "Packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Valuations_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Valuations_Users_EsteticistId",
                        column: x => x.EsteticistId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ValuationProcedures",
                columns: table => new
                {
                    ValuationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ValuationProcedures", x => new { x.ValuationId, x.ProcedureId });
                    table.ForeignKey(
                        name: "FK_ValuationProcedures_Procedures_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "Procedures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ValuationProcedures_Valuations_ValuationId",
                        column: x => x.ValuationId,
                        principalTable: "Valuations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Consents_EsteticistId",
                table: "Consents",
                column: "EsteticistId");

            migrationBuilder.CreateIndex(
                name: "IX_Consents_PatientId_ProcedureId_FechaFirma",
                table: "Consents",
                columns: new[] { "PatientId", "ProcedureId", "FechaFirma" });

            migrationBuilder.CreateIndex(
                name: "IX_Consents_ProcedureId",
                table: "Consents",
                column: "ProcedureId");

            migrationBuilder.CreateIndex(
                name: "IX_ConsentTemplates_ProcedureId",
                table: "ConsentTemplates",
                column: "ProcedureId");

            migrationBuilder.CreateIndex(
                name: "IX_ConsentTemplates_TenantId_ProcedureId",
                table: "ConsentTemplates",
                columns: new[] { "TenantId", "ProcedureId" },
                unique: true,
                filter: "IsDeleted = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ValuationProcedures_ProcedureId",
                table: "ValuationProcedures",
                column: "ProcedureId");

            migrationBuilder.CreateIndex(
                name: "IX_Valuations_EsteticistId",
                table: "Valuations",
                column: "EsteticistId");

            migrationBuilder.CreateIndex(
                name: "IX_Valuations_PackageId",
                table: "Valuations",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_Valuations_PatientId",
                table: "Valuations",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Valuations_TenantId_Fecha",
                table: "Valuations",
                columns: new[] { "TenantId", "Fecha" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Consents");

            migrationBuilder.DropTable(
                name: "ConsentTemplates");

            migrationBuilder.DropTable(
                name: "ValuationProcedures");

            migrationBuilder.DropTable(
                name: "Valuations");

            migrationBuilder.DropColumn(
                name: "RequiereConsentimiento",
                table: "Procedures");
        }
    }
}
