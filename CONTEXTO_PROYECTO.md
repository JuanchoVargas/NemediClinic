# NemediClinic — Contexto del Proyecto
Fecha: Septiembre 2026 (actualizado en auditoría 2026-09-15; ver `docs/STATUS_2026-09.md`)

## Qué es
ERP/CRM multi-tenant para clínicas estéticas. Un tenant = una clínica. Roles: SuperAdmin / Admin / Esteticista.
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
- 4 migraciones aplicadas: InitialClinicalEntities, AddClinicalEntities, AddAppointments, AddInventoryEntities.
- Datos: 1 tenant, 1 sede, 1 usuario SuperAdmin (`juandiegov2002@gmail.com`). Cero pacientes, procedimientos, paquetes, productos o citas.
- Las credenciales `admin@nemediclinic.com / Admin2026!` del contexto anterior NO existen en esta DB. Si se necesita un usuario de prueba, crearlo con `POST /api/v1/auth/register` autenticado como SuperAdmin.

## Git
- Repo local en `main`, primer commit `8fcf8cb chore: snapshot septiembre 2026`. Sin remote.
- `.gitignore` ignora `bin/`, `obj/`, `node_modules/`, `dist/`, `.env*` (salvo `.env.example`) y `.claude/settings.local.json`.

## Módulos con backend + frontend
- Auth + JWT + roles (frontend no usa el refresh token)
- Tenants, Sedes, Usuarios (Admin no puede crear usuarios: `register` exige SuperAdmin)
- Pacientes (`ProximaCita` nunca se calcula)
- Historia clínica (UI solo lectura; falta editar antecedentes y crear notas)
- Procedimientos, Paquetes, Paquetes de paciente (falta cambiar estado y completar sesión desde UI)
- Citas + Calendario + Hoja del día (no descuenta inventario; no elimina citas desde UI)
- Inventario (productos, entradas, alertas; no hay salidas ni consumo)

## Pendiente
- Dashboard con KPIs reales (`GET /api/v1/dashboard` no existe)
- Descuento de inventario al completar cita
- Job de vencimiento de paquetes (`Vencido`)
- Header responsive (bloqueante para móvil)
- Tests (hoy 0)
- WhatsApp Meta Cloud API
- App móvil
- Detalle y prioridades: `docs/STATUS_2026-09.md`
