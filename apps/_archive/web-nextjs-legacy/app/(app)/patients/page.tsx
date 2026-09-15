"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/api";
import type { PatientListItem, PagedResponse } from "@/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await get<PagedResponse<PatientListItem> | PatientListItem[]>(
          "/api/v1/patients",
        );
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.items ?? []);
        setPatients(list);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Error al cargar pacientes.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
        <button
          type="button"
          disabled
          className="px-4 py-2 rounded-md text-white text-sm font-medium opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#1A3A5C" }}
        >
          Nuevo paciente
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Cédula</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Paquete activo</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && patients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No hay pacientes registrados.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {p.nombre} {p.apellido}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.cedula}</td>
                  <td className="px-4 py-3 text-gray-700">{p.telefono}</td>
                  <td className="px-4 py-3 text-gray-700">{p.paqueteActivo ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-400">—</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
