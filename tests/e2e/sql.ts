// Acceso SQL mínimo para los tests e2e, vía `sqlcmd` con autenticación de Windows
// (misma conexión que appsettings.Development.json). Sin dependencias nativas.
//
// Variables opcionales:
//   E2E_SQL_SERVER   (default: localhost\SQL2022)
//   E2E_SQL_DATABASE (default: NemediClinic_Dev)
import { spawnSync } from "node:child_process";

const SERVER = process.env.E2E_SQL_SERVER ?? "localhost\\SQL2022";
const DATABASE = process.env.E2E_SQL_DATABASE ?? "NemediClinic_Dev";
const SEP = ""; // separador de columnas improbable en datos

/** Ejecuta T-SQL y devuelve las filas como arreglos de strings (sin encabezados). */
export function sql(query: string): string[][] {
  // -I: QUOTED_IDENTIFIER ON. Sin él, sqlcmd falla en UPDATE/DELETE sobre tablas
  // con índices filtrados (los únicos de EF, p. ej. Users.Email). -b: exit code 1 en error.
  const r = spawnSync(
    "sqlcmd",
    ["-S", SERVER, "-d", DATABASE, "-E", "-I", "-W", "-h", "-1", "-s", SEP, "-b", "-Q", `SET NOCOUNT ON; ${query}`],
    { encoding: "utf8" },
  );
  if (r.error) throw r.error;
  if (r.status !== 0) {
    // sqlcmd imprime los errores de T-SQL en stdout
    throw new Error(`sqlcmd (${SERVER}/${DATABASE}) falló:\n${r.stdout}${r.stderr}\nQuery: ${query.slice(0, 300)}`);
  }
  return r.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split(SEP).map((c) => c.trim()));
}

/** Escalar: primera columna de la primera fila. */
export function scalar(query: string): string {
  const rows = sql(query);
  return rows[0]?.[0] ?? "";
}

/** Escapa un literal para T-SQL (solo para valores de prueba controlados por el test). */
export function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Borrado físico de todo lo que pertenece a los tenants indicados, en orden de FK.
 * Solo para datos creados por los tests (tenants con NIT que empieza por E2E-).
 */
export function hardDeleteTenants(tenantIds: string[]): void {
  if (tenantIds.length === 0) return;
  const inList = tenantIds.map(lit).join(",");
  const byTenant = (table: string) => `DELETE FROM ${table} WHERE TenantId IN (${inList});`;
  const statements = [
    byTenant("InventoryMovements"),
    byTenant("InventoryEntries"),
    byTenant("Products"),
    byTenant("Appointments"),
    byTenant("ClinicalNotes"),
    byTenant("ClinicalRecords"),
    byTenant("PatientPayments"),
    byTenant("PatientPackageSessions"),
    byTenant("PatientPackages"),
    // PackageProcedures no hereda BaseEntity (sin TenantId): se borra por PackageId
    `DELETE FROM PackageProcedures WHERE PackageId IN (SELECT Id FROM Packages WHERE TenantId IN (${inList}));`,
    byTenant("Packages"),
    byTenant("Procedures"),
    byTenant("Patients"),
    byTenant("Users"),
    byTenant("Branches"),
    // Oportunidades activadas que apuntan al tenant (nivel de plataforma)
    byTenant("Leads"),
    `DELETE FROM Tenants WHERE Id IN (${inList});`,
  ];
  sql(statements.join(" "));
}
