// Estado de un paquete asignado (pestañas Paquetes y Pagos de la ficha).
import { Badge } from "@/components/ui/badge";

export function PackageStatusBadge({ estado }: { estado: string }) {
  switch (estado) {
    case "Activo":
      return <Badge variant="success">Activo</Badge>;
    case "Pausado":
      return <Badge variant="warning">Pausado</Badge>;
    case "Completado":
      return <Badge variant="secondary">Completado</Badge>;
    case "Vencido":
      return <Badge variant="destructive">Vencido</Badge>;
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
}
