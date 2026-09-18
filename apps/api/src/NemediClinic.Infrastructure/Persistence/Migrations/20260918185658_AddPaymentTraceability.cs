using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NemediClinic.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentTraceability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ComprobanteId",
                table: "PatientPayments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Referencia",
                table: "PatientPayments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RegistradoPorId",
                table: "PatientPayments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientPayments_RegistradoPorId",
                table: "PatientPayments",
                column: "RegistradoPorId");

            migrationBuilder.AddForeignKey(
                name: "FK_PatientPayments_Users_RegistradoPorId",
                table: "PatientPayments",
                column: "RegistradoPorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PatientPayments_Users_RegistradoPorId",
                table: "PatientPayments");

            migrationBuilder.DropIndex(
                name: "IX_PatientPayments_RegistradoPorId",
                table: "PatientPayments");

            migrationBuilder.DropColumn(
                name: "ComprobanteId",
                table: "PatientPayments");

            migrationBuilder.DropColumn(
                name: "Referencia",
                table: "PatientPayments");

            migrationBuilder.DropColumn(
                name: "RegistradoPorId",
                table: "PatientPayments");
        }
    }
}
