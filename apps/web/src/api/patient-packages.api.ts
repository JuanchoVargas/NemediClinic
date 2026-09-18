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
  referencia?: string;
  /** Adjunto subido antes como pendiente (entityType Payment, kind Comprobante). */
  comprobanteId?: string;
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
      qc.invalidateQueries({ queryKey: ["patients"] }); // el badge de la ficha muestra el % pagado
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Adjunta (o reemplaza) el comprobante de un pago ya registrado: PUT …/payments/{id}/comprobante. */
export function useSetPaymentComprobante(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, comprobanteId }: { paymentId: string; comprobanteId: string }) => {
      const { data } = await api.put<PatientPayment>(
        `/api/v1/patient-packages/${packageId}/payments/${paymentId}/comprobante`,
        { comprobanteId },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-packages", packageId, "payments"] });
    },
  });
}

/** Soft delete de la asignación con sus sesiones y pagos (solo Admin). */
export function useDeletePatientPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/patient-packages/${id}`);
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-packages"] });
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Soft delete de un pago (solo Admin): corrige un pago mal registrado. */
export function useDeletePayment(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      await api.delete(`/api/v1/patient-packages/${packageId}/payments/${paymentId}`);
      return { paymentId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-packages"] });
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
