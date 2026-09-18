# NemediClinic — Contexto del Proyecto
Fecha: Septiembre 2026 (última actualización 2026-09-18; estado por módulo en `docs/STATUS_2026-09.md` §0, flujos en `docs/FLUJOS.md`)

## Qué es
ERP/CRM multi-tenant para clínicas estéticas. Un tenant = una clínica. Roles de clínica: SuperAdmin / Admin / Esteticista.
Sobre los tenants hay un **nivel de plataforma** (2026-09-18): rol PlatformAdmin fuera de todo tenant, canales comerciales con marca blanca por dominio (Nemedi 0 %, Infotex 50 %), oportunidades con protección de NIT por 90 días, liquidación mensual por canal y suspensión por mora (423 en escrituras). Detalle en `CLAUDE.md` → "Platform level".
Identificadores de dominio y textos de UI en español; código de infraestructura en inglés.

## Rutas reales
- Raíz del repo: `E:\Trabajo\StartUp\nemedi-clinic\`
- Backend: `E:\Trabajo\StartUp\nemedi-clinic\apps\api\` (solución `NemediClinic.sln`, proyecto arrancable `src\NemediClinic.Api`)
- Frontend: `E:\Trabajo\StartUp\nemedi-clinic\apps\web\`
- Frontend Next.js anterior (solo referencia, no se usa): `apps\_archive\web-nextjs-legacy\`
- Mobile: `apps\mobile\` (placeholder vacío)
- `packages\shared\` contiene C# stale que la solución NO referencia. Ignorar.

## Stack real
- Backend: ASP.NET Core 8 + EF Core 8 + SQL Server. Clean Architecture en 4 proyectos (Api / Application / Domain / Infrastructure). La lógica de los módulos de clínica más antiguos vive en los controllers; lo nuevo (plataforma, archivos, dashboard, paquetes de paciente, contraseñas, valoraciones, consentimientos) usa controller delgado → service en `NemediClinic.Api/Services/`. No hay capa repository. Hangfire (SQL Server) corre el job diario de vencimiento de paquetes; ImageSharp procesa imágenes; QuestPDF genera los consentimientos.
  Puerto: http://localhost:5055 (perfil `dotnet run`). Swagger: http://localhost:5055/swagger
  DB dev: `localhost\SQL2022`, base `NemediClinic_Dev`, autenticación Windows (`appsettings.Development.json`).
- Frontend: React 19 + TypeScript + Vite 8 + TanStack Router + TanStack Query + Zustand + Axios + React Hook Form + Zod + Tailwind v4 + shadcn/ui (preset `radix-nova`, base `neutral`) + FullCalendar + sonner + Recharts + motion + signature_pad + vite-plugin-pwa.
  Puerto: http://localhost:5173. `VITE_API_URL=http://localhost:5055` en `apps/web/.env`.
  Package manager: pnpm (`pnpm-lock.yaml`), disponible vía `corepack enable`.
- Mobile: sin código. Decisión pendiente Flutter vs Expo (StartUp estandariza Expo; ver `docs/STATUS_2026-09.md` §5b).
- Monorepo: Turborepo es el objetivo pero no está configurado (sin `package.json` raíz ni `turbo.json`). Cada app se construye sola.

## Comandos
```bash
# Backend
dotnet build apps/api/NemediClinic.sln
dotnet run --project apps/api/src/NemediClinic.Api --urls http://localhost:5055
dotnet ef migrations list --project apps/api/src/NemediClinic.Infrastructure --startup-project apps/api/src/NemediClinic.Api
dotnet ef database update  --project apps/api/src/NemediClinic.Infrastructure --startup-project apps/api/src/NemediClinic.Api

# Frontend (desde apps/web)
pnpm install
pnpm dev        # 5173
pnpm build      # tsc -b && vite build
pnpm lint       # 0 problemas; mantenerlo así

# Tests e2e (desde la raíz)
pnpm test         # gate de push: aislamiento multi-tenant
pnpm test:ui      # recorrido por rol + capturas de docs/manual
pnpm test:mobile  # responsive a 390×844 + capturas de docs/manual/img/mobile
pnpm guide:pdf    # docs/manual/Guia_de_uso_NemediClinic.pdf

# VS Code: Ctrl+Shift+B → tarea "NemediClinic: Levantar todo" (API + Web)
```

## Estado de la DB de desarrollo (2026-09-18)
- 12 migraciones aplicadas: InitialClinicalEntities, AddClinicalEntities, AddAppointments, AddInventoryEntities, AddPlatformLevel (canales Nemedi e Infotex; el tenant existente quedó en Nemedi, plan Básico, Activo), AddAttachments (adjuntos, `ImagenId`, colores de Nemedi → #1F4E79/#D9A441), AddTenantLogo, AddMustChangePassword (las filas existentes quedan en `false`), AddValuationsAndConsents, AddPaymentTraceability (comprobante, referencia y quién registró el pago) y AddCabinConsumption (consumo de cabina, `PackageProcedure` con `TenantId` y copia del catálogo en la asignación; la migración rellena los datos existentes) y AddClinicalNoteDetails (zona tratada, parámetros, indicaciones, próxima sesión y evaluación de la paciente, todo opcional). Además Hangfire crea su propio esquema `HangFire` al arrancar.
- 1 tenant y 1 sede ("Sede Principal"). Datos demo cargados con `POST /api/v1/dev/seed-demo` (solo Development, idempotente; ver `DevController.cs`).

## Credenciales de desarrollo (tras el seed demo)
- PlatformAdmin: `platform@nemedi.dev` / `Platform2026!` (de `appsettings.Development.json`; se siembra al arrancar si la tabla está vacía). Entra a `/platform`.
- SuperAdmin: `juandiegov2002@gmail.com` / `Admin2026!` (el seed resetea esta contraseña en cada ejecución).
- Esteticistas: `laura.perez@nemedi.demo` y `camila.ruiz@nemedi.demo` / `Demo2026!`.
- Recepción (Admin): `recepcion@nemedi.demo` / `Demo2026!` (la crea el setup de `pnpm test:ui`).
- Todo usuario creado desde la UI o por la plataforma nace con clave temporal y debe cambiarla en el primer ingreso; los usuarios demo no.
- Datos: 6 procedimientos, 3 paquetes, 8 pacientes (cédulas 1000000001..08, historia clínica con antecedentes en 3), 5 paquetes asignados (2 pagados, 2 parciales, 1 sin pagos), 12 citas entre ayer y +4 días, 6 productos (2 verde, 2 amarillo, 2 rojo) con entradas.
- Regla de fechas: todo en hora local de Bogotá, sin UTC, en ambas capas (`src/lib/dates.ts` en el frontend, `LocalDateTimeJsonConverter` en la API). Corregido el 2026-09-15.
- JWT en Development dura 480 min (`Jwt:ExpirationMinutes` en `appsettings.Development.json`) porque el frontend descarta el refresh token.
- Tras ejecutar `docs/FLUJOS.md` quedan tres diferencias con el seed: Sara tiene "Rostro Radiante" pagado (0/5), la cita de Mariana de hoy 10:00 está Completada (2/4) y Santiago tiene una cita Completada el 17/09 18:00.

## Fixes del 2026-09-15 (ver `docs/FLUJOS.md`)
- `dc64e2b` citas en hora local sin conversión UTC.
- `bc4ead6` filtro global de tenant evaluado por request (antes quedaba fijado al tenant de la primera request del proceso: fuga de datos entre tenants).
- `be5a5d1` la API acepta enums por nombre (antes 400 al cambiar estado de cita, registrar pago, crear producto y registrar entrada desde la UI).

## Git
- Rama `main`, remote `origin` (GitHub, `JuanchoVargas/NemediClinic`). `.githooks/pre-push` corre `pnpm test` y bloquea el push si falla.
- `.gitignore` ignora `bin/`, `obj/`, `node_modules/`, `dist/`, `.env*` (salvo `.env.example`) y `.claude/settings.local.json`.

## Antes de una demo
En PowerShell (`curl` ahí es alias de `Invoke-WebRequest` y NO acepta `-X`):

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5055/api/v1/dev/seed-demo?reanchor=true"
# o, si prefieres curl de verdad: curl.exe -X POST "http://..."
```

Re-ancla la agenda demo a hoy (la cita más antigua queda en ayer) y siembra las imágenes de muestra si faltan. Sin esto el Dashboard y la Hoja del día salen vacíos, porque el seed fija las fechas al día en que se ejecutó por primera vez.

## Módulos con backend + frontend
- Auth + JWT + roles; contraseñas (cambio obligatorio en el primer ingreso, `/change-password`, restablecimiento con clave temporal por SuperAdmin/Admin y por la plataforma). El frontend no usa el refresh token.
- Plataforma (`/platform`, solo PlatformAdmin): tenants con canal/plan/IPS/estado + primer SuperAdmin con clave temporal, canales, oportunidades, liquidación con CSV, marca blanca por dominio, suspensión por mora (423).
- Mi clínica (el SuperAdmin edita solo su tenant; su logo alimenta el branding), Sedes, Usuarios (el dueño crea cualquier rol; recepción solo esteticistas).
- Dashboard real (`GET /api/v1/dashboard`): citas de hoy por estado, pacientes activos, ingresos del mes, saldo pendiente, paquetes por vencer, stock en alerta, citas por día (14 d), top 5 procedimientos y top 5 productos; dos alternadores (citas/dinero y procedimientos/productos) que recuerdan la última opción; filtro de sede para el dueño.
- Pacientes (foto de perfil, próxima cita, ficha con 6 pestañas: Información, Historia clínica, Evolución, Consentimientos, Paquetes, Pagos).
- Historia clínica editable; notas con fotos Antes/Después y detalle de la sesión (zona, parámetros, indicaciones, evaluación, próxima sesión); nota desde la cita Completada; pestaña Evolución **agrupada por paquete**, con comparador, lightbox y botón Agendar que precarga el calendario.
- Adjuntos (imágenes y PDF; URLs firmadas de 10 min; ver `CLAUDE.md` → "Image attachments").
- Valoraciones (`/valoraciones`): prospecto sin cédula o paciente, fotos, cotización, Aceptó/Rechazó con motivo, "Convertir" a paquete, embudo y tasa de conversión. El seed trae 8 del mes en curso para que el embudo muestre algo real.
- Consentimiento informado: plantilla por procedimiento, firma en pantalla, PDF firmado; bloquea "Iniciar" la cita si el procedimiento lo exige y no hay uno vigente (365 días).
- Procedimientos (tarjetas con imagen), Paquetes (quitar un procedimiento mientras no se haya vendido), Paquetes de paciente (cierre automático al completar la última sesión, vencimiento por job diario, alerta "por vencer", eliminar asignación y pagos; la venta guarda su copia del catálogo, así que borrar el paquete no la afecta).
- Pagos con trazabilidad: referencia, quién lo registró y comprobante (imagen o PDF); un pago nunca supera el saldo; barra de progreso con el porcentaje pagado.
- Citas + Calendario + Hoja del día.
- Inventario (productos con imagen, entradas, alertas, movimientos) con **consumo de cabina**: la nota clínica declara qué insumos se gastaron y, al guardarla sobre una cita completada, salen del stock con su movimiento de Salida ligado a la cita y al paciente.
- Responsive + PWA: usable a 390 px en todas las rutas y roles; instalable con el nombre y color del canal; hoja del día, citas y fichas legibles sin conexión por 24 h.

## Pendiente
- Lista de precios oficial: `Platform:Precios` en `appsettings.json` tiene valores provisionales (Básico 150.000, Pro 290.000, sede adicional 60.000, recargo IPS 0)
- Los canales no tienen usuarios propios: oportunidades y liquidación las opera el PlatformAdmin
- Refresh token sin usar en el frontend (el JWT de Development dura 480 min)
- Code-splitting: bundle único de 1.79 MB (520 kB gzip) que el service worker precachea entero
- Storage S3/R2 para los adjuntos (hoy disco local detrás de `IFileStorage`)
- Correo de contraseñas sin probar contra un SMTP real (`Smtp:*`)
- PWA: sin banner de instalación en iOS, sin persistencia de TanStack Query ni cola de escritura offline
- Corregir un consumo de cabina mal registrado exige una entrada de ajuste: el movimiento es un libro y no se revierte solo
- Un tenant suspendido ya no puede iniciar sesión (antes entraba en solo lectura); revisar si es la política comercial que se quiere
- Tests unitarios (hoy 0; sí hay e2e: aislamiento multi-tenant, reglas de negocio, recorrido UI por rol y responsive)
- WhatsApp Meta Cloud API
- App móvil nativa (Expo)
- Detalle y prioridades: `docs/STATUS_2026-09.md`
