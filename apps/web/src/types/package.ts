// ============================================================
// package.ts — Tipos del catálogo de paquetes
//
// Backend: PackagesController.cs + DTOs/Packages/*.cs
//
// NOTA: el backend NO acepta procedures en POST /packages. Hay que
// crear el paquete y luego POST /packages/{id}/procedures uno por uno.
// Tampoco hay DELETE de PackageProcedure individual.
// El frontend orquesta ambos pasos en useCreatePackage.
// ============================================================

export interface Package {
  id: string;
  nombre: string;
  descripcion: string;
  precioTotal: number;
  sesionesTotales: number;
  vigenciaDias: number;
  diasAlertaVencimiento: number;
  activo: boolean;
  createdAt?: string;
}

export interface PackageProcedure {
  packageId?: string;
  procedureId: string;
  procedureNombre: string;
  cantidadSesiones: number;
}

/**
 * Paquete + sus procedimientos. Lo devuelve GET /packages/{id}.
 * El campo viene como `procedimientos` desde el backend.
 */
export interface PackageDetail extends Package {
  procedimientos: PackageProcedure[];
}

/**
 * Forma "lógica" del request de creación que orquesta el frontend.
 * El hook useCreatePackage divide esto en: POST /packages + N POST /packages/{id}/procedures.
 */
export interface CreatePackageRequest {
  nombre: string;
  descripcion: string;
  precioTotal: number;
  sesionesTotales: number;
  vigenciaDias: number;
  diasAlertaVencimiento: number;
  procedures: Array<{
    procedureId: string;
    cantidadSesiones: number;
  }>;
}

export interface UpdatePackageRequest {
  nombre?: string;
  descripcion?: string;
  precioTotal?: number;
  sesionesTotales?: number;
  vigenciaDias?: number;
  diasAlertaVencimiento?: number;
  activo?: boolean;
}

export interface AddPackageProcedureRequest {
  procedureId: string;
  cantidadSesiones: number;
}
