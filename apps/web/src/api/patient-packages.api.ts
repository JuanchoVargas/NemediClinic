// ============================================================
// patient-packages.api.ts — Paquetes asignados a pacientes
//
// Backend: /api/v1/patient-packages
// Policy: Admin (Esteticista NO puede consultar — recibirá 403)
// ============================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { PatientPackage, PatientPayment } from "@/types/patient-package";

/**
 * Body de POST /api/v1/patient-packages.
 * Backend: AssignPackageRequest.cs (FechaInicio es DateOnly).
 */
export interface AssignPackageBody {
  patientId: string;
  packageId: string;
  precioAcordado: number;
  fechaInicio: string; // YYYY-MM-DD
}

export function useAssignPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AssignPackageBody) => {
      const { data } = await api.post<{ id: string }>(
        "/api/v1/patient-packages",
        body,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["patient-packages"] });
      qc.invalidateQueries({
        queryKey: ["patient-packages", "by-patient", variables.patientId],
      });
    },
  });
}

export function usePatientPackagesByPatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-packages", "by-patient", patientId],
    queryFn: async () => {
      const { data } = await api.get<PatientPackage[]>(
        `/api/v1/patient-packages/patient/${patientId}`,
      );
      return data;
    },
    enabled: !!patientId,
  });
}

export function usePatientPackage(id: string | undefined) {
  return useQuery({
    queryKey: ["patient-packages", id],
    queryFn: async () => {
      const { data } = await api.get<PatientPackage>(
        `/api/v1/patient-packages/${id}`,
      );
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientPackagePayments(id: string | undefined) {
  return useQuery({
    queryKey: ["patient-packages", id, "payments"],
    queryFn: async () => {
      const { data } = await api.get<PatientPayment[]>(
        `/api/v1/patient-packages/${id}/payments`,
      );
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Body de POST /api/v1/patient-packages/{id}/payments.
 */
export interface RegisterPaymentBody {
  monto: number;
  fechaPago: string; // YYYY-MM-DD
  metodoPago: string;
  observacion?: string;
}

export function useRegisterPayment(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RegisterPaymentBody) => {
      const { data } = await api.post<{ id: string }>(
        `/api/v1/patient-packages/${packageId}/payments`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      // Prefix-match: refresca by-patient list, paquete individual y payments
      qc.invalidateQueries({ queryKey: ["patient-packages"] });
    },
  });
}
