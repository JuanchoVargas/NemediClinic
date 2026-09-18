// ============================================================
// PlatformPage.tsx — Nivel de plataforma (/platform)
//
// Única pantalla del PlatformAdmin: tenants, canales, oportunidades y
// liquidación. Cada pestaña es un componente tonto que consume
// hooks de src/api/platform.api.ts. Guard de rol en el router.
// ============================================================

import { Building2, FileSpreadsheet, Handshake, Store } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/shared/PageContainer";
import { TenantsTab } from "@/pages/platform/TenantsTab";
import { ChannelsTab } from "@/pages/platform/ChannelsTab";
import { LeadsTab } from "@/pages/platform/LeadsTab";
import { LiquidacionTab } from "@/pages/platform/LiquidacionTab";

export function PlatformPage() {
  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Plataforma</h1>
        <p className="text-muted-foreground">
          Clínicas, canales comerciales, oportunidades y liquidación mensual.
        </p>
      </div>

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">
            <Building2 className="h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="channels">
            <Store className="h-4 w-4" />
            Canales
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Handshake className="h-4 w-4" />
            Oportunidades
          </TabsTrigger>
          <TabsTrigger value="liquidacion">
            <FileSpreadsheet className="h-4 w-4" />
            Liquidación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="pt-4">
          <TenantsTab />
        </TabsContent>
        <TabsContent value="channels" className="pt-4">
          <ChannelsTab />
        </TabsContent>
        <TabsContent value="leads" className="pt-4">
          <LeadsTab />
        </TabsContent>
        <TabsContent value="liquidacion" className="pt-4">
          <LiquidacionTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
