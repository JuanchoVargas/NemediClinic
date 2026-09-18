# NemediClinic — Contexto del Proyecto
Fecha: Septiembre 2026 (actualizado en auditoría 2026-09-15; ver `docs/STATUS_2026-09.md`)

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
- Backend: ASP.NET Core 8 + EF Core 8 + SQL Server. Clean Architecture en 4 proyectos (Api / Application / Domain / Infrastructure). Hoy la lógica vive en los controllers (no hay services ni repositories).
  Puerto: http://localhost:5055 (perfil `dotnet run`). Swagger: http://localhost:5055/swagger
  DB dev: `localhost\SQL2022`, base `NemediClinic_Dev`, autenticación Windows (`appsettings.Development.json`).
- Frontend: React 19 + TypeScript + Vite 8 + TanStack Router + TanStack Query + Zustand + Axios + React Hook Form + Zod + Tailwind v4 + shadcn/ui (preset `radix-nova`, base `neutral`) + FullCalendar + sonner.
  Puerto: http://localhost:5173. `VITE_API_URL=http://localhost:5055` en `apps/web/.env`.
  Package manager: pnpm (`pnpm-lock.yaml`). Nota: pnpm no está en el PATH global de la máquina; usar corepack o `node_modules/.bin`.
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
pnpm lint       # hoy falla: 14 errores

# VS Code: Ctrl+Shift+B → tarea "NemediClinic: Levantar todo" (API + Web)
```

## Estado de la DB de desarrollo (2026-09-15)
- 6 migraciones aplicadas (la última, AddAttachments: adjuntos de imagen, ImagenId en paciente/producto/procedimiento, colores del canal Nemedi → #1F4E79/#D9A441). Las 5 anteriores: InitialClinicalEntities, AddClinicalEntities, AddAppointments, AddInventoryEntities, AddPlatformLevel (canales Nemedi e Infotex sembrados; el tenant existente quedó en el canal Nemedi, plan Básico, estado Activo).
- 1 tenant y 1 sede ("Sede Principal"). Datos demo cargados con `POST /api/v1/dev/seed-demo` (solo Development, idempotente; ver `DevController.cs`).

## Credenciales de desarrollo (tras el seed demo)
- PlatformAdmin: `platform@nemedi.dev` / `Platform2026!` (de `appsettings.Development.json`; se siembra al arrancar si la tabla está vacía). Entra a `/platform`.
- SuperAdmin: `juandiegov2002@gmail.com` / `Admin2026!` (el seed resetea esta contraseña en cada ejecución).
- Esteticistas: `laura.perez@nemedi.demo` y `camila.ruiz@nemedi.demo` / `Demo2026!`.
- Datos: 6 procedimientos, 3 paquetes, 8 pacientes (cédulas 1000000001..08, historia clínica con antecedentes en 3), 5 paquetes asignados (2 pagados, 2 parciales, 1 sin pagos), 12 citas entre ayer y +4 días, 6 productos (2 verde, 2 amarillo, 2 rojo) con entradas.
- Regla de fechas: todo en hora local de Bogotá, sin UTC, en ambas capas (`src/lib/dates.ts` en el frontend, `LocalDateTimeJsonConverter` en la API). Corregido el 2026-09-15.
- JWT en Development dura 480 min (`Jwt:ExpirationMinutes` en `appsettings.Development.json`) porque el frontend descarta el refresh token.
- Tras ejecutar `docs/FLUJOS.md` quedan tres diferencias con el seed: Sara tiene "Rostro Radiante" pagado (0/5), la cita de Mariana de hoy 10:00 está Completada (2/4) y Santiago tiene una cita Completada el 17/09 18:00.

## Fixes del 2026-09-15 (ver `docs/FLUJOS.md`)
- `dc64e2b` citas en hora local sin conversión UTC.
- `bc4ead6` filtro global de tenant evaluado por request (antes quedaba fijado al tenant de la primera request del proceso: fuga de datos entre tenants).
- `be5a5d1` la API acepta enums por nombre (antes 400 al cambiar estado de cita, registrar pago, crear producto y registrar entrada desde la UI).

## Git
- Repo local en `main`, primer commit `8fcf8cb chore: snapshot septiembre 2026`. Sin remote.
- `.gitignore` ignora `bin/`, `obj/`, `node_modules/`, `dist/`, `.env*` (salvo `.env.example`) y `.claude/settings.local.json`.

## Antes de una demo
`curl -X POST "http://localhost:5055/api/v1/dev/seed-demo?reanchor=true"` → re-ancla la agenda demo a hoy (la cita más antigua queda en ayer) y siembra las imágenes de muestra si faltan. Sin esto el Dashboard y la Hoja del día salen vacíos, porque el seed fija las fechas al día en que se ejecutó por primera vez.

## Módulos con backend + frontend
- Auth + JWT + roles (frontend no usa el refresh token)
- Plataforma (`/platform`, solo PlatformAdmin): tenants con canal/plan/IPS/estado + creación del primer SuperAdmin con clave temporal, canales, oportunidades, liquidación con CSV
- Mi clínica (el SuperAdmin ve y edita solo su tenant), Sedes, Usuarios (Admin no puede crear usuarios: `register` exige SuperAdmin)
- Pacientes (foto de perfil; la ficha muestra paquete activo y próxima cita; en el listado `ProximaCita` sigue sin calcularse)
- Historia clínica (crear notas con fotos Antes/Después; pestaña Evolución con comparador y lightbox; falta editar antecedentes desde la UI)
- Adjuntos de imagen (paciente, nota clínica, producto, procedimiento; URLs firmadas de 10 min; ver `CLAUDE.md` → "Image attachments")
- Procedimientos, Paquetes, Paquetes de paciente (falta cambiar estado y completar sesión desde UI)
- Citas + Calendario + Hoja del día (no descuenta inventario; no elimina citas desde UI)
- Inventario (productos, entradas, alertas; no hay salidas ni consumo)

## Pendiente
- Lista de precios oficial: `Platform:Precios` en `appsettings.json` tiene valores provisionales (Básico 150.000, Pro 290.000, sede adicional 60.000, recargo IPS 0)
- El SuperAdmin creado por bootstrap-admin no puede cambiar su contraseña temporal (no hay endpoint ni pantalla de cambio de clave); tampoco el PlatformAdmin
- Los canales no tienen usuarios propios: oportunidades y liquidación las opera el PlatformAdmin
- Borrar un paquete del catálogo deja inaccesibles sus asignaciones; completar la última sesión desde una cita no cierra el paquete
- `GET /inventory/movements/product/{id}` responde 500
- `GET /api/v1/dashboard` no existe: el Dashboard arma sus KPIs con endpoints existentes (sin ingresos del mes ni paquetes por vencer)
- Descuento de inventario al completar cita
- Job de vencimiento de paquetes (`Vencido`)
- Storage S3/R2 para los adjuntos (hoy disco local detrás de `IFileStorage`); el logo del tenant se puede subir pero aún no se usa en el branding
- Revisión responsive de las tablas en teléfono (el layout ya colapsa el sidebar a un panel lateral)
- Tests unitarios (hoy 0; sí hay e2e: gate de aislamiento multi-tenant y recorrido UI por rol)
- WhatsApp Meta Cloud API
- App móvil
- Detalle y prioridades: `docs/STATUS_2026-09.md`
