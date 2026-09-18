// ============================================================
// PaymentsTab.tsx — Pestaña "Pagos" de la ficha del paciente
//
// Por cada paquete asignado: barra de progreso con lo pagado (el porcentaje y
// el estado vienen del backend) y la tabla de pagos con su trazabilidad:
// fecha, monto, método, referencia, quién lo registró y el comprobante.
// Solo Admin+ llega aquí (la ficha oculta la pestaña a la esteticista).
// ============================================================
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComprobanteCell } from "@/components/patient/ComprobanteCell";
import { PackageStatusBadge } from "@/components/patient/PackageStatusBadge";
import { PaymentProgress } from "@/components/patient/PaymentProgress";
import { RegisterPaymentDialog } from "@/components/patient/RegisterPaymentDialog";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
import { MotionTableRow, staggerProps } from "@/components/shared/motion-elements";
import { useDeletePayment, usePatientPackagePayments, usePatientPackagesByPatient } from "@/api/patient-packages.api";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCOP } from "@/lib/format-cop";
import { formatShortDate } from "@/lib/format-platform";
import { useToastStore } from "@/stores/toast.store";
import type { PatientPackage } from "@/types/patient-package";

export function PaymentsTab({ patientId }: { patientId: string }) {
  const { data: packages, isLoading } = usePatientPackagesByPatient(patientId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!packages || packages.length === 0) {
    return (
      <EmptyState
        illustration="generic"
        title="Sin paquetes"
        description="Cuando el paciente tenga un paquete asignado, aquí verás sus pagos."
      />
    );
  }

  // Primero los que aún deben; dentro de cada grupo, el más reciente arriba (así llega del API)
  const ordered = [...packages].sort((a, b) => Number(a.saldoPendiente <= 0) - Number(b.saldoPendiente <= 0));

  return (
    <div className="space-y-4">
      {ordered.map((pkg) => (
        <PackagePaymentsSection key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
}

function PackagePaymentsSection({ pkg }: { pkg: PatientPackage }) {
  const { data: payments, isLoading } = usePatientPackagePayments(pkg.id);
  const { can } = usePermissions();
  const [registerOpen, setRegisterOpen] = useState(false);
  const deletePayment = useDeletePayment(pkg.id);

  const canPay = can("payments.create") && pkg.saldoPendiente > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{pkg.packageNombre}</CardTitle>
            <CardDescription>
              Desde el {formatShortDate(pkg.fechaInicio)} · saldo pendiente {formatCOP(pkg.saldoPendiente)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <PackageStatusBadge estado={pkg.estado} />
            {canPay && (
              <Button size="sm" onClick={() => setRegisterOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Registrar pago
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <PaymentProgress pkg={pkg} />

        {isLoading && <Skeleton className="h-16 w-full" />}
        {payments && payments.length === 0 && <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>}
        {payments && payments.length > 0 && (
          <ResponsiveTable>
            <Table aria-label={`Pagos de ${pkg.packageNombre}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Comprobante</TableHead>
                  {can("payments.delete") && <TableHead className="w-12 text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((pay, i) => (
                  <MotionTableRow key={pay.id} {...staggerProps(i)}>
                    <TableCell className="font-medium">{formatShortDate(pay.fechaPago)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatCOP(pay.monto)}</TableCell>
                    <TableCell>{pay.metodoPago}</TableCell>
                    <TableCell>
                      {pay.referencia || <span className="text-muted-foreground">—</span>}
                      {pay.observacion && <p className="max-w-52 text-xs text-muted-foreground italic">{pay.observacion}</p>}
                    </TableCell>
                    <TableCell>{pay.registradoPor || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <ComprobanteCell packageId={pkg.id} payment={pay} canAttach={can("payments.create")} />
                    </TableCell>
                    {can("payments.delete") && (
                      <TableCell className="text-right">
                        <ConfirmDeleteButton
                          iconOnly
                          label={`Eliminar pago de ${formatCOP(pay.monto)}`}
                          title="¿Eliminar este pago?"
                          description={`El saldo pendiente de ${pkg.packageNombre} vuelve a incluir ${formatCOP(pay.monto)}${pay.comprobanteId ? " y su comprobante se elimina" : ""}.`}
                          pending={deletePayment.isPending}
                          onConfirm={async () => {
                            await deletePayment.mutateAsync(pay.id);
                            useToastStore.success("Pago eliminado");
                          }}
                        />
                      </TableCell>
                    )}
                  </MotionTableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        )}
      </CardContent>

      {registerOpen && (
        <RegisterPaymentDialog
          packageId={pkg.id}
          packageNombre={pkg.packageNombre}
          saldoPendiente={pkg.saldoPendiente}
          onClose={() => setRegisterOpen(false)}
        />
      )}
    </Card>
  );
}
