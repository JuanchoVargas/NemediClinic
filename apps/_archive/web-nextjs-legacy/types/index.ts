export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  tenantId: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiration: string;
  user: UserInfo;
}

export interface Patient {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  email: string;
  fechaNacimiento: string;
  notasGenerales: string;
  isActive: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: string[];
}

export interface PatientListItem {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  paqueteActivo?: string | null;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
