// ============================================================
// CommandPalette.tsx — Buscador global (Ctrl+K / ⌘K)
//
// Busca en el servidor pacientes y productos (mismos hooks paginados que las
// tablas, con debounce) y filtra en el cliente las citas de hoy, que ya vienen
// completas. Elegir un resultado navega a su pantalla.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, Package2, UserRound } from "lucide-react";
import {
  CommandDialog,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppointments } from "@/api/appointments.api";
import { useProducts } from "@/api/inventory.api";
import { usePatients } from "@/api/patients.api";
import { useDebounce } from "@/hooks/use-debounce";
import { toLocalIso } from "@/lib/dates";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: toLocalIso(start), end: toLocalIso(end) };
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  // Atajo global: Ctrl+K / ⌘K abre o cierra
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar"
      description="Busca pacientes, citas de hoy y productos"
      className="sm:max-w-xl"
    >
      {/* Montado solo al abrir: la búsqueda arranca vacía y no se consulta nada con el diálogo cerrado */}
      {open && <PaletteContent onDone={() => onOpenChange(false)} />}
    </CommandDialog>
  );
}

function PaletteContent({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim(), 250);
  const hasQuery = debounced.length >= 2;

  const [range] = useState(todayRange);
  const { data: patients } = usePatients(1, 6, hasQuery ? debounced : undefined);
  const { data: products } = useProducts(1, 6, hasQuery ? debounced : undefined);
  const { data: appointments } = useAppointments(range.start, range.end);

  const todayAppointments = useMemo(() => {
    const list = [...(appointments ?? [])].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    if (!hasQuery) return list.slice(0, 6);
    const q = normalize(debounced);
    return list.filter((a) => normalize(`${a.patientNombre} ${a.procedureNombre}`).includes(q)).slice(0, 6);
  }, [appointments, debounced, hasQuery]);

  const go = (run: () => void) => {
    onDone();
    run();
  };

  return (
    // shouldFilter=false: los resultados ya vienen filtrados (servidor / useMemo)
    <Command shouldFilter={false}>
      <CommandInput placeholder="Buscar pacientes, citas de hoy, productos…" value={query} onValueChange={setQuery} />
      <CommandList className="max-h-[22rem]">
        <CommandEmpty>Sin resultados para "{query}".</CommandEmpty>

        {hasQuery && patients && patients.items.length > 0 && (
          <CommandGroup heading="Pacientes">
            {patients.items.map((p) => (
              <CommandItem
                key={p.id}
                value={`patient-${p.id}`}
                onSelect={() => go(() => navigate({ to: "/patients/$id", params: { id: p.id } }))}
              >
                <UserRound />
                <span>
                  {p.nombre} {p.apellido}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">CC {p.cedula}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {todayAppointments.length > 0 && (
          <CommandGroup heading="Citas de hoy">
            {todayAppointments.map((a) => (
              <CommandItem
                key={a.id}
                value={`appointment-${a.id}`}
                onSelect={() => go(() => navigate({ to: "/calendar/day-sheet" }))}
              >
                <CalendarClock />
                <span>
                  {a.fechaInicio.slice(11, 16)} · {a.patientNombre}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{a.procedureNombre}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasQuery && products && products.items.length > 0 && (
          <CommandGroup heading="Productos">
            {products.items.map((p) => (
              <CommandItem key={p.id} value={`product-${p.id}`} onSelect={() => go(() => navigate({ to: "/inventory" }))}>
                <Package2 />
                <span>{p.nombre}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {p.stockActual} {p.unidadMedida}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
