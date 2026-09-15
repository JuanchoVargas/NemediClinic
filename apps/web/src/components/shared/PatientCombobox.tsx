// ============================================================
// PatientCombobox.tsx — Selector de paciente con búsqueda server-side
//
// Patrón shadcn: Popover + Command + useDebounce + usePatients.
// Reutilizado en CalendarPage (crear cita) y PackageDetailPage (asignar paquete).
// ============================================================

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePatients } from "@/api/patients.api";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { PatientSummary } from "@/types/patient";

export function PatientCombobox({
  value,
  onChange,
  label = "Paciente",
}: {
  value: PatientSummary | null;
  onChange: (p: PatientSummary | null) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const { data } = usePatients(1, 20, debounced);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {value ? (
              <span>
                {value.nombre} {value.apellido}{" "}
                <span className="text-muted-foreground">({value.cedula})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Buscar paciente...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Nombre, apellido o cédula..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {data?.items.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      onChange(p);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === p.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>
                        {p.nombre} {p.apellido}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.cedula}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
