using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NemediClinic.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicalNoteDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EvaluacionPaciente",
                table: "ClinicalNotes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IndicacionesPost",
                table: "ClinicalNotes",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Parametros",
                table: "ClinicalNotes",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "ProximaSesionSugerida",
                table: "ClinicalNotes",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZonaTratada",
                table: "ClinicalNotes",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EvaluacionPaciente",
                table: "ClinicalNotes");

            migrationBuilder.DropColumn(
                name: "IndicacionesPost",
                table: "ClinicalNotes");

            migrationBuilder.DropColumn(
                name: "Parametros",
                table: "ClinicalNotes");

            migrationBuilder.DropColumn(
                name: "ProximaSesionSugerida",
                table: "ClinicalNotes");

            migrationBuilder.DropColumn(
                name: "ZonaTratada",
                table: "ClinicalNotes");
        }
    }
}
