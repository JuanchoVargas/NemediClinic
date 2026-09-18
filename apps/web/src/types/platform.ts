// ============================================================
// platform.ts — Tipos del nivel de plataforma (sobre los tenants)
//
// Backend: /api/v1/platform/* (solo PlatformAdmin) y GET /api/v1/branding (público).
// Espejo de NemediClinic.Application/DTOs/Platform/PlatformDtos.cs.
// ============================================================

export type TenantPlan = "Basico" | "Pro";
export type TenantEstado = "Activo" | "Suspendido" | "Exento";
export type LeadEstado = "Registrado" | "Activado" | "Liberado";

export interface Branding {
  canal: string;
  nombreComercial: string;
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  dominio: string;
}

export interface Channel {
  id: string;
  nombre: string;
  slug: string;
  branding: Branding;
  /** Entre 0 y 1 (0.5 = 50 %). */
  porcentajeCanal: number;
  activo: boolean;
  tenants: number;
  createdAt: string;
}

export interface SaveChannelRequest {
  nombre: string;
  slug: string;
  nombreComercial: string;
  logoUrl?: string | null;
  colorPrimario: string;
  colorSecundario: string;
  dominio: string;
  porcentajeCanal: number;
  activo: boolean;
}

export interface PlatformTenant {
  id: string;
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  channelId: string;
  canal: string;
  plan: TenantPlan;
  sedesAdicionales: number;
  esIps: boolean;
  estado: TenantEstado;
  fechaActivacion: string | null;
  porcentajeCanalOverride: number | null;
  porcentajeCanalEfectivo: number;
  tieneSuperAdmin: boolean;
  createdAt: string;
}

export interface CreatePlatformTenantRequest {
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  channelId: string;
  plan: TenantPlan;
  sedesAdicionales: number;
  esIps: boolean;
  estado: TenantEstado;
  porcentajeCanalOverride?: number | null;
}

export interface UpdatePlatformTenantRequest extends Partial<CreatePlatformTenantRequest> {
  quitarOverride?: boolean;
}

export interface BootstrapAdminRequest {
  adminNombre: string;
  adminApellido: string;
  adminEmail: string;
}

export interface BootstrapAdminResponse {
  tenantId: string;
  branchId: string;
  userId: string;
  email: string;
  passwordTemporal: string;
}

export interface Lead {
  id: string;
  nombre: string;
  nit: string;
  ciudad: string;
  contacto: string;
  channelId: string;
  canal: string;
  fechaRegistro: string;
  fechaLiberacion: string;
  diasProteccionRestantes: number;
  estado: LeadEstado;
  tenantId: string | null;
}

export interface CreateLeadRequest {
  nombre: string;
  nit: string;
  ciudad: string;
  contacto: string;
  channelId: string;
}

export interface ActivateLeadRequest {
  email: string;
  telefono: string;
  plan: TenantPlan;
  sedesAdicionales: number;
  esIps: boolean;
}

export interface LiquidacionTenant {
  tenantId: string;
  nombre: string;
  nit: string;
  plan: TenantPlan;
  sedesAdicionales: number;
  esIps: boolean;
  estado: TenantEstado;
  suma: boolean;
  precio: number;
  porcentaje: number;
  montoCanal: number;
  montoNemedi: number;
}

export interface LiquidacionCanal {
  channelId: string;
  canal: string;
  porcentajeCanal: number;
  tenantsActivos: number;
  totalFacturado: number;
  montoCanal: number;
  montoNemedi: number;
  tenants: LiquidacionTenant[];
}

export interface Liquidacion {
  mes: string;
  canales: LiquidacionCanal[];
  totalFacturado: number;
  totalCanales: number;
  totalNemedi: number;
}

export interface CurrentTenant {
  id: string;
  nombre: string;
  /** Logo subido por la clínica (Attachment Kind=Logo); reemplaza al del canal en su interfaz. */
  logoId: string | null;
  plan: TenantPlan;
  estado: TenantEstado;
}
