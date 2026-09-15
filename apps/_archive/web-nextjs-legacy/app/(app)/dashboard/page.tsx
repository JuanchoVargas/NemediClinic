const KPIS = [
  { label: "Citas hoy", placeholder: "—" },
  { label: "Pacientes activos", placeholder: "—" },
  { label: "Ingresos del mes", placeholder: "—" },
  { label: "Paquetes por vencer", placeholder: "—" },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500 mb-2">{kpi.label}</p>
            <p className="text-3xl font-semibold text-gray-900">{kpi.placeholder}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
