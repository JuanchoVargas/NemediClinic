# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Multi-tenant ERP/CRM for aesthetic clinics ("estéticas"). Each tenant is one clinic. Above the tenants there is a **platform level** (role PlatformAdmin, channels, leads, monthly settlement, white-label branding by domain — see "Platform level" below). See `CONTEXTO_PROYECTO.md` for the module list, dev DB state and role matrix (PlatformAdmin / SuperAdmin / Admin / Esteticista), and `docs/STATUS_2026-09.md` for the September 2026 audit (module coverage, tech debt, mobile and theming estimates). Domain identifiers and user-facing strings are in **Spanish** (`Nombre`, `Apellido`, `Cedula`, `Estado`, ...) — keep that style when adding entities or DTOs.

Repo root on this machine: `E:\Trabajo\StartUp\nemedi-clinic\`. The shared StartUp conventions live one level up in `E:\Trabajo\StartUp\CLAUDE.md` (auto-loaded).

Monorepo layout (Turborepo is the stated target but is not yet wired — there is no root `package.json` or `turbo.json`; each app builds independently):

```
apps/api/                     .NET 8 backend (E:\Trabajo\StartUp\nemedi-clinic\apps\api)
apps/web/                     React 19 + Vite 8 frontend (E:\Trabajo\StartUp\nemedi-clinic\apps\web)
apps/mobile/                  empty placeholder (Flutter vs Expo undecided; StartUp standard is Expo)
apps/_archive/web-nextjs-legacy/  previous Next.js frontend, reference only — do not build or extend
packages/shared/              stale stub C# code NOT referenced by the API solution; ignore it
packages/ui/                  empty
docs/hu/                      user stories (empty)
docs/openapi/                 hand-authored OpenAPI fragments (e.g. auth.yaml)
docs/STATUS_2026-09.md        audit report
```

## Common commands

### Backend (`apps/api/`)

```bash
# Build / run (the API listens on http://localhost:5055 in dev)
dotnet build apps/api/NemediClinic.sln
dotnet run --project apps/api/src/NemediClinic.Api --urls http://localhost:5055

# EF Core migrations — Infrastructure is the project, Api is the startup project
dotnet ef migrations add <Name> \
  --project apps/api/src/NemediClinic.Infrastructure \
  --startup-project apps/api/src/NemediClinic.Api
dotnet ef database update \
  --project apps/api/src/NemediClinic.Infrastructure \
  --startup-project apps/api/src/NemediClinic.Api
dotnet ef migrations list \
  --project apps/api/src/NemediClinic.Infrastructure \
  --startup-project apps/api/src/NemediClinic.Api
```

Dev DB connection (in `appsettings.Development.json`) points to **`localhost\SQL2022`** / `NemediClinic_Dev` with Windows auth (SQL Server 2022). Swagger UI is mounted at `/swagger` in Development.

Platform admin in dev: `platform@nemedi.dev` / `Platform2026!` (`Platform:AdminEmail` / `Platform:AdminPassword` in `appsettings.Development.json`; seeded at startup only when the `PlatformAdmins` table is empty and there are no pending migrations).

Demo data: `POST /api/v1/dev/seed-demo` (anonymous, **Development only**, 404 elsewhere, idempotent on patient cédula `1000000001`). With `?reanchor=true` it shifts every appointment so the oldest one falls on yesterday — run it before a demo, because the seed pins dates to the day it first ran (the UI walkthrough setup always passes it). It also seeds sample images through `DemoImageSeeder` (idempotent on the `demo-` file-name prefix): generated **SVG** gradients with a label, never photos of real people — 2 sessions with Antes/Después for patients `1000000001..03`, plus one image per product and procedure. It resets the SuperAdmin password to `Admin2026!`, creates two Esteticista users (`laura.perez@nemedi.demo`, `camila.ruiz@nemedi.demo`, password `Demo2026!`), procedures, packages, 8 patients, assigned packages with payments, 12 appointments around today and 6 products with inventory entries. Requires a tenant created earlier via `POST /api/v1/auth/seed`.

### Tests e2e (repo root) — push gate

```bash
pnpm install     # once; also runs "prepare" → git config core.hooksPath .githooks
pnpm test        # push gate: project "api" only (tenant isolation, no browser)
pnpm test:ui     # UI walkthrough by role with screenshots → docs/manual (needs `pnpm exec playwright install chromium`)
pnpm test:all    # everything
```

`tests/e2e/ui/` is the per-role UI walkthrough (`superadmin` → `esteticista` → `admin`, ordered with project `dependencies`; `global.setup.ts` seeds the demo, creates `recepcion@nemedi.demo` if missing and cleans previous screenshots). Each chapter is one spec built on `helpers/guide.ts`: `startChapter(page, rol, cap)`, then `step(page, name, locator?, { before, after, click })` — `before` prepares (fills, opens menus), the locator is highlighted (red border + numbered badge injected with `evaluate`) and captured at 1440×900 to `docs/manual/img/<rol>/capN-NN-<slug>.png`, then clicked (unless `click: false`), then `after` verifies. Failures are recorded as ❌ with the error and the chapter continues; `endChapter()` writes `tests/e2e/ui/.results/<rol>-capN.json` (gitignored). Everything the walkthrough creates is deleted in `afterAll` (appointments in any state are reset to Agendada first, since only Agendada/Confirmada can be deleted). `docs/manual/MANUAL_USUARIO.md` is the end-user guide written from those results (steps in imperative, one marked screenshot each, "Funciones en desarrollo" for the ❌); `pnpm guide:pdf` renders it to `docs/manual/Guia_de_uso_NemediClinic.pdf` with pandoc (self-contained HTML, `guia.css`) printed by Chrome headless, since no LaTeX engine is installed.

`tests/e2e/tenant-isolation.spec.ts` is the F03 multi-tenant isolation test: it creates two tenants the real way (PlatformAdmin → `POST /platform/tenants` → `POST /{id}/bootstrap-admin` → login with the temporary password), fills them with data, logs in as each and asserts zero cross-tenant rows plus 404 on foreign ids, that a SuperAdmin only sees/edits its own tenant and gets 403 on `/platform/*`, and that the PlatformAdmin gets 403 on clinic endpoints. SQL (`tests/e2e/sql.ts`, `sqlcmd` with Windows auth, `-I` for `QUOTED_IDENTIFIER`) is used only to verify row existence and for cleanup. `playwright.config.ts` starts the API with `dotnet run` if nothing listens on 5055. It needs the dev DB with the PlatformAdmin (env `E2E_PLATFORM_EMAIL` / `E2E_PLATFORM_PASSWORD`, defaults to the dev one) and the demo SuperAdmin (env `E2E_SUPERADMIN_EMAIL` / `E2E_SUPERADMIN_PASSWORD`), and cleans up its own tenants with a hard delete. `.githooks/pre-push` runs it and blocks the push on failure (`git push --no-verify` to bypass in an emergency). There are no unit tests in the apps yet.

### Frontend (`apps/web/`)

```bash
cd apps/web
pnpm install
pnpm dev          # http://localhost:5173, expects API at VITE_API_URL (apps/web/.env → http://localhost:5055)
pnpm build        # tsc -b && vite build
pnpm lint         # eslint . (passes with 0 problems; keep it that way)
```

`pnpm` is on the PATH of this machine through `corepack enable` (pnpm 11). If a fresh shell does not find it, run `corepack enable` once, or fall back to `corepack pnpm ...`.

VS Code: `Ctrl+Shift+B` runs the task "NemediClinic: Levantar todo" (API + Web).

## API architecture

The solution has four projects following Clean Architecture layering:

```
NemediClinic.Api            — controllers, middleware, DI composition (Program.cs)
NemediClinic.Application    — DTOs and interfaces (IJwtService, ITenantProvider). No EF dependency.
NemediClinic.Domain         — entities + enums. No external dependencies.
NemediClinic.Infrastructure — AppDbContext, migrations, JwtService, BCrypt. References Domain + Application.
```

Dependency direction: `Api → Application/Infrastructure → Domain`. Application must not reference EF Core or Infrastructure.

The clinic controllers still use `AppDbContext` directly and hold the business rules. The platform level is the first slice written to the StartUp standard: thin controllers in `Controllers/Platform/` call services in `NemediClinic.Api/Services/` (`PlatformTenantService`, `ChannelService`, `LeadService`, `LiquidacionService`), which throw `ApiException(status, message)`; the global `ApiExceptionFilter` turns it into `{ error }`. Follow that shape for new work; do not add more logic to controllers if a service can be introduced instead. (There is still no repository layer: services use `AppDbContext`.)

### Multi-tenancy (the most important pattern in this codebase)

Every domain entity inherits `BaseEntity` (`Id: Guid`, `TenantId: Guid`, `CreatedAt`, `UpdatedAt`, `IsDeleted`, `RowVersion`). Tenant isolation is enforced **automatically and globally** by three pieces working together — do not bypass any of them in normal request paths:

1. **JWT carries `tenant_id`.** `TenantMiddleware` returns 403 if an authenticated request lacks the claim. The only exception is the PlatformAdmin role, whose JWT has no `tenant_id`; the same middleware confines it to `/api/v1/platform`, `/api/v1/auth`, `/api/v1/branding` and `/api/health` (some clinic controllers only have `[Authorize]` without a role policy, so this is the single place that keeps the platform admin out of clinic data).
2. **`HttpTenantProvider`** (scoped) reads `tenant_id` from the JWT claim; its `SetTenant(Guid)` override exists only for bootstrap flows where no JWT is present yet (`AuthController.Seed`, `DevController.SeedDemo`).
3. **`AppDbContext.OnModelCreating`** installs a global query filter on every `BaseEntity` subtype: `e.TenantId == _tenantProvider.TenantId && !e.IsDeleted`. `Tenant` itself is excluded from the tenant filter (it only gets the soft-delete filter).

`AppDbContext.SaveChangesAsync` stamps `TenantId`, `CreatedAt`, and `UpdatedAt` automatically — **never set `TenantId` from a request body**, and never accept it as a controller input.

Consequences when writing controllers and queries:

- Reads on tenant-scoped tables are pre-filtered. Just write `_db.Patients.Where(...)` — no manual tenant check needed.
- Use `IgnoreQueryFilters()` only for cross-tenant flows: login lookup by email, refresh-token lookup by user id, the bootstrap `seed` / `register` paths in `AuthController`, the platform services, and similar admin checks.
- Soft delete: set `IsDeleted = true` and `SaveChanges`. The global filter hides it from subsequent reads.
- `RowVersion` is configured as an EF concurrency token on every `BaseEntity` — expect concurrency exceptions on contended writes.
- Known EF warning 10622: `Package` has the global filter but is the required end of `PackageProcedure`, which has no matching filter.

### Bootstrap / seeding

- `POST /api/v1/auth/seed` is **Development only** (404 elsewhere: outside dev, tenants are created only by the PlatformAdmin) and allowed only when **no tenant exists**. It creates Tenant + "Sede Principal" Branch + SuperAdmin in a transaction, using `_tenantProvider.SetTenant(tenant.Id)` so that `SaveChangesAsync` stamps the right `TenantId` on all three.
- `POST /api/v1/auth/register` works in two modes:
  - If at least one SuperAdmin exists: requires an authenticated SuperAdmin JWT and uses its `tenant_id`. (The web UI lets Admins open "Nuevo usuario", but the backend responds 403 for them.)
  - Otherwise (a fresh DB with seeded tenant but no users yet): attaches the new user to the oldest tenant.
- `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` issue JWT + refresh token (refresh tokens stored on `User`, 7-day expiry). The web frontend currently ignores the refresh token.
- `POST /api/v1/dev/seed-demo` (see Common commands) fills the existing tenant with demo data in Development only.

### Routing & authorization conventions

- All controllers use `[Route("api/v1/[controller]")]` (or an explicit `api/v1/...` route) — every endpoint lives under `/api/v1/`, except `GET /api/health`.
- Authorization policies in `Program.cs`: `SuperAdmin`, `Admin` (= SuperAdmin + Admin), `Esteticista` (= all three clinic roles) and `PlatformAdmin` (only that role; it is **not** included in the clinic policies). Apply with `[Authorize(Policy = "...")]`.
- Error responses are `{ error: "..." }` and success responses return DTOs directly. The universal StartUp contract (`codigoRespuesta` / `mensajeRespuesta` / `data`) is **not** used here; the Axios interceptor in the web app is adapted to `{ error }`.
- Dates: the whole system works in **local Bogotá time with no UTC conversion**. `LocalDateTimeJsonConverter` (registered in `Program.cs`) reads incoming `DateTime` as `Unspecified` (a `Z`/offset is converted to local and dropped) and always writes `yyyy-MM-ddTHH:mm:ss` without `Z`. Business timestamps use `DateTime.Now`; `CreatedAt`/`UpdatedAt` still use `UtcNow` but serialize as local. The web app must never call `toISOString()` for business dates: use `toLocalIso` / `toLocalDate` from `src/lib/dates.ts`.
- Enums: `JsonStringEnumConverter` is registered, so request bodies accept either the name (`"Confirmada"`, `"Efectivo"`) or the integer. Response DTOs expose enums as strings via `ToString()`.

### Platform level (above the tenants)

- **PlatformAdmin** is a separate entity/table (`PlatformAdmins`, not a `BaseEntity`, no `TenantId`). `AuthController.Login` / `Refresh` fall back to it when no tenant user matches; `IJwtService.GeneratePlatformToken` issues a JWT with role `PlatformAdmin` and no `tenant_id`; `UserInfo.TenantId` is `Guid.Empty`. There is no endpoint to create one: `PlatformAdminSeeder` creates the first from `Platform:AdminEmail` / `Platform:AdminPassword` (env `Platform__AdminEmail` / `Platform__AdminPassword`).
- **Channel** (plain entity): `Nombre`, `Slug`, flat branding columns (`NombreComercial`, `LogoUrl`, `ColorPrimario`, `ColorSecundario`, `Dominio`), `PorcentajeCanal` (decimal 0–1), `Activo`. Migration `AddPlatformLevel` seeds **Nemedi** (`AppDbContext.NemediChannelId` = `1111…`, 0 %, `app.nemediclinic.com`) and **Infotex** (`InfotexChannelId` = `2222…`, 50 %, `app.infotex.co`); tenants that existed before it were assigned to Nemedi with `FechaActivacion = CreatedAt`.
- **Tenant** gained `ChannelId`, `Plan` (`Basico`/`Pro`), `SedesAdicionales`, `EsIps`, `Estado` (`Activo`/`Suspendido`/`Exento`), `FechaActivacion`, `PorcentajeCanalOverride` (nullable; replaces the channel percentage for that tenant, e.g. the 60/40 of Anexo A). Any code that creates a `Tenant` must set `ChannelId` (FK).
- **Lead** (plain entity): `Nombre`, `NIT`, `Ciudad`, `Contacto`, `ChannelId`, `FechaRegistro`, `FechaLiberacion` (= registro + 90 days), `Estado` (`Registrado`/`Activado`/`Liberado`), nullable `TenantId`. Registering a NIT that another channel holds and has not released → 409 naming the channel and the release date. Expired leads are released lazily on every read/write of `LeadService`.
- **Endpoints** `/api/v1/platform/*`, policy `PlatformAdmin`: `tenants` (CRUD + `POST /{id}/bootstrap-admin` → creates "Sede Principal" if missing + the first SuperAdmin and returns a temporary password **once**; 409 if the tenant already has a SuperAdmin or the email is used anywhere, because login looks users up by email across tenants), `channels` (CRUD; Nemedi cannot be deleted, channels with tenants/leads neither), `leads` (CRUD + `POST /{id}/activate` → creates the tenant from the lead in one `SaveChanges`), `GET liquidacion?mes=YYYY-MM`.
- **Liquidación**: per channel, tenants with `FechaActivacion` before the end of the month. Only `Estado == Activo` adds up; `Exento` and `Suspendido` are listed with 0. Price = plan + `SedesAdicionales` × sede + IPS surcharge, from `Platform:Precios` in `appsettings.json` (`PlatformPricing`; **provisional values** until the official price list exists). `montoCanal = precio × (PorcentajeCanalOverride ?? Channel.PorcentajeCanal)`.
- **`TenantsController`** (`/api/v1/tenants`) is now scoped to the caller's tenant: a SuperAdmin lists/reads/updates only its own; create and delete moved to the platform. `GET /api/v1/tenants/current` (any clinic role) returns `{ id, nombre, plan, estado }`.
- **Suspended tenants**: `TenantStatusMiddleware` (after auth) answers **423** `{ error: "Cuenta suspendida por mora" }` to every non-GET/HEAD/OPTIONS request of a tenant in `Suspendido`; reads pass. `TenantStatusCache` keeps the state 60 s in `IMemoryCache` and the platform service invalidates it on update (single instance; with several API instances the suspension takes up to 60 s to propagate).
- **Branding by domain**: `BrandingMiddleware` resolves the channel by `Request.Host` for `GET /api/v1/branding` (public; falls back to Nemedi). Behind Caddy the original host arrives intact and `X-Forwarded-Host` is honoured. In Development only, `?host=` or header `X-Branding-Host` overrides the host for testing. `BrandingResolver` caches active channels 5 min and is invalidated by `ChannelService`.

### Dashboard, package lifecycle and jobs

- **`GET /api/v1/dashboard?branchId=&desde=&hasta=`** (`DashboardService`, any clinic role): today's appointments by state + today's agenda, active patients and new patients per day, month income (`PatientPayment`) with a daily series, total outstanding balance, packages expiring within 30 days, stock alerts, appointments per day for the last 14 days and top 5 procedures of the period. `desde`/`hasta` default to the 1st of the month → today. `branchId` filters **appointments only** (payments, packages, patients and stock have no branch). An Esteticista gets her own agenda and `null` in every financial field. The web dashboard uses only this endpoint (`src/api/dashboard.api.ts`, Recharts in `components/dashboard/DashboardCharts.tsx`; the branch filter is shown to SuperAdmin).
- **`PatientPackageService`** owns the package rules: `CompleteSessionAsync` (used by both `PatientPackagesController.CompleteSession` and `AppointmentsController.UpdateStatus`) adds the session and sets the package to `Completado` on the last one; `DELETE /patient-packages/{id}` (assignment + its sessions and payments; linked appointments lose the session link) and `DELETE /patient-packages/{id}/payments/{paymentId}` are soft deletes, policy Admin. `PatientPackageDto` carries `FechaVencimiento` (= `FechaInicio + Package.VigenciaDias`), `DiasParaVencer` and `PorVencer` (Activo and within `Package.DiasAlertaVencimiento`), shown in the patient file and the dashboard alerts.
- **Hangfire** (`Hangfire.AspNetCore` + `Hangfire.SqlServer`, same database, schema `HangFire`, no web dashboard exposed, one worker). Recurring job `paquetes-vencimiento`, daily at 02:00 local time → `PatientPackageService.ExpireOverdueAsync` (all tenants, `IgnoreQueryFilters`): Activo/Pausado packages past their validity become `Vencido`. In Development `POST /api/v1/dev/run-package-expiration` runs it on demand. Jobs have no HTTP context: never rely on the tenant filter inside one.
- Creating a clinical note with `AppointmentId` links the package session of that appointment to the note (`PatientPackageSession.ClinicalNoteId`). The web offers "Crear nota clínica de esta cita" on a Completada appointment with procedure and esteticista preloaded, and the clinical summary (antecedentes, alergias, medicamentos, observaciones) is editable from the patient file.
- **Tenant logo**: `Tenant.LogoId` (Attachment `Kind=Logo`, uploaded from "Mi clínica"). `GET /tenants/current` returns it and the sidebar shows the clinic's logo and name first, with the channel brand as subtitle/fallback.
- `seed-demo?reanchor=true` also fills the previous two weeks with completed appointments once (`Notas = "[demo] historial"`, ignored when anchoring) so the dashboard charts have history.

### Image attachments

- **`Attachment : BaseEntity`** (tenant-scoped, soft delete): `EntityType` (`Patient`/`ClinicalNote`/`Product`/`Procedure`/`Tenant`), nullable `EntityId`, `Kind` (`Perfil`/`Antes`/`Despues`/`Producto`/`Procedimiento`/`Logo`), `FileName`, `ContentType`, `Size`, `StoragePath`, `ThumbnailPath`, `CreatedBy`, `PurgedAt`. The relation is polymorphic on purpose (no FK). `Patient`, `Product` and `Procedure` have a nullable `ImagenId`; `ClinicalNote.FotoEvolucionUrl` was dropped in favour of N attachments (migration `AddAttachments`). `Patient.FotoUrl` is legacy and unused by the web.
- **Storage**: `IFileStorage` (Application) with `LocalFileStorage` (Infrastructure) writing `{Storage:UploadsPath}/{tenantId}/{yyyy}/{guid}.ext` — `/data/uploads` by default (a Compose volume), `App_Data/uploads` in Development (gitignored). The interface only speaks opaque keys, so an S3/R2 implementation is a one-line swap in `Program.cs`.
- **`POST /api/v1/files`** (multipart `file`, `entityType`, `kind`, optional `entityId`; policy Esteticista, and `AttachmentService` additionally requires Admin for Product/Procedure and SuperAdmin for Tenant): max 10 MB (413), real type decided by **magic bytes** — jpeg/png/webp only (415) — then `SixLabors.ImageSharp` applies the EXIF orientation, **strips EXIF/IPTC/XMP and PNG text chunks**, caps the original at 2400 px, re-encodes it and writes a 400 px WebP thumbnail.
- **Pending attachments**: a form uploads first (no `entityId`) and sends only ids; the entity claims them on save — `ImagenId` in the patient/product/procedure requests (`AttachmentService.AssignImageAsync`, which also soft-deletes the replaced image) and `AdjuntoIds` in `CreateClinicalNoteRequest` (`ClaimForNoteAsync`). In the PUTs a null `ImagenId` means "no change"; removing an image is `DELETE /api/v1/files/{id}`, which also clears the owner's `ImagenId`.
- **Serving**: `GET /api/v1/files/{id}/url` (authenticated, tenant-filtered) returns `{ url, thumbUrl, expiresInSeconds }`. `GET /api/v1/files/{id}?t={token}[&size=thumb]` is `[AllowAnonymous]` because an `<img>` cannot send the JWT: `FileTokenService` signs `attachmentId|tenantId|exp` with HMAC-SHA256 (key derived from `Jwt:Secret`, or `Files:SigningKey`), 10-minute lifetime, and the file is served only if the token is valid, unexpired and its tenant equals the attachment's. Every failure answers 404. Responses carry `nosniff` and a sandbox CSP (the demo SVGs are the only non-raster files).
- **Deletion**: `DELETE /api/v1/files/{id}` is a soft delete; `AttachmentCleanupService` (hosted, hourly) physically deletes files soft-deleted more than 24 h ago and pending attachments nobody claimed in 24 h, stamping `PurgedAt`.
- **`GET /api/v1/patients/{id}/evolution`** → the patient's clinical notes in chronological order with their photos (`Antes` first) as ids; `ClinicalNoteDto.Fotos` carries the same list. `PatientDto` now also returns `ImagenId` and `ProximaCita` (next Agendada/Confirmada appointment).
- The isolation gate uploads a file per tenant and asserts 404 on the other tenant's `/url` and `DELETE`, and that a token for one file cannot download another.

### Config gotcha

`Program.cs` and `JwtService` read JWT settings from the `Jwt` section (`Issuer`, `Audience`, `Secret`, `ExpirationMinutes`, `RefreshTokenExpirationDays`). `appsettings.Development.json` overrides `Jwt:ExpirationMinutes` to 480 for demos; its `JwtSettings` block is legacy and **not read**. Put per-env JWT overrides under `Jwt`, not `JwtSettings`. In **Production** the API refuses to start unless `Jwt__Secret` (env var) is set, is at least 32 chars and differs from the dev value in `appsettings.json`.

### Production behaviour (`ASPNETCORE_ENVIRONMENT=Production`)

- On startup the API retries `Database.Migrate()` for up to 60 s (creates the DB, applies pending migrations) and exits with code 1 and a clear log line if SQL Server never answers.
- CORS origins come from `CORS_ORIGINS` (comma-separated); in Development they default to `localhost:3000` / `localhost:5173`.
- Uploaded images live in `Storage__UploadsPath` (`/data/uploads`, volume `uploads_data` in Compose; back it up together with the database).
- The first PlatformAdmin comes from `Platform__AdminEmail` / `Platform__AdminPassword` (≥ 10 chars); `POST /api/v1/auth/seed` returns 404, so the first tenant is created from `/platform`.
- No Swagger, no HTTPS redirection (TLS is terminated by Caddy; `UseForwardedHeaders` is on), `DevController` returns 404.

## Deployment (`deploy/`)

`deploy/docker-compose.yml` runs **mssql** (SQL Server 2022, persistent volume, healthcheck, `./backups` mounted), **api** (`apps/api/Dockerfile`, multi-stage sdk→aspnet, non-root `app` user, port 8080), **web** (`apps/web/Dockerfile`, Vite build with `VITE_API_URL=/` — same origin — → `nginx:alpine` with SPA fallback) and **caddy** (`deploy/Caddyfile`: `{$DOMAIN}` accepts several comma-separated domains, one per channel; `/api/*` → `api:8080`, rest → `web:80`, automatic HTTPS per domain). Variables live in `deploy/.env` (never committed; template in `deploy/.env.example`): `DOMAIN`, `APP_NAME`, `MSSQL_SA_PASSWORD`, `ConnectionStrings__DefaultConnection`, `Jwt__Secret`, `Jwt__ExpirationMinutes`, `CORS_ORIGINS`, `Platform__AdminEmail`, `Platform__AdminPassword`. `deploy/backup.sh` is the daily `BACKUP DATABASE` with 14-day retention; `deploy/README.md` has the VPS runbook (install Docker, clone, `.env`, `up -d --build`, first tenant from `/platform` as PlatformAdmin, how to publish a channel on its own domain). Docker is not installed on the dev machine: the compose stack was validated by running the published Release build with the Production env vars against local SQL Server, not with `docker compose up`.

## Web architecture (`apps/web/`)

- React 19 + TypeScript + Vite 8, cloned from the StartUp `react-startup-base` template. Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui (preset `radix-nova`, base color `neutral`), TanStack Router, TanStack Query, Zustand, Axios, React Hook Form + Zod, FullCalendar, sonner, lucide-react. Package manager: pnpm.
- Also installed: `motion` (animations), `react-compare-slider`, `yet-another-react-lightbox`, `next-themes` (dark mode).
- Folder map: `src/api/*.api.ts` (one file per backend controller: TanStack Query hooks + axios calls), `src/pages/*.tsx` (dumb views; `admin/`, `super/` and `platform/` subfolders), `src/components/ui` (shadcn; do not edit — restyle through `tokens.css` selectors on `data-slot`), `src/components/layout` (`RootLayout`, `AppSidebar`, `AppHeader`, `CommandPalette`, `Footer`), `src/components/patient` (`PatientHeader`, `EvolutionTab`, `ClinicalNoteDialog`), `src/components/shared` (`PageContainer`, `PatientCombobox`, `FormDialog`, `SuspendedBanner`, `SecureImage`, `ImageUpload`, `PhotoListUpload`, `PatientAvatar`, `EmptyState`, `motion` + `motion-elements`), `src/stores` (`auth.store.ts`, `toast.store.ts`), `src/lib` (`axios.ts`, `query-client.ts`, `utils.ts`), `src/types` (DTO mirrors), `src/styles` (`globals.css`, `tokens.css`).
- Routing lives in `src/router/index.tsx` (code-based TanStack Router tree, no file routing). Public: `/`, `/login`. Everything else hangs from the `_protected` layout route whose `beforeLoad` redirects to `/login` when `useAuthStore.isAuthenticated()` is false. Role-gated routes (`/admin/users`, `/admin/branches`, `/super/tenants` = "Mi clínica", `/platform`) call `requireRoles([...])` in their own `beforeLoad`. A PlatformAdmin is redirected to `/platform` from any other protected route (and from login), since clinic screens would only give it 403. Declare `/x/new` before `/x/$id`.
- `src/lib/axios.ts` is the only place that creates the HTTP client. It reads `VITE_API_URL` (`"/"` means same origin, used in production so every channel domain calls its own `/api`), attaches `Bearer ${token}` from `useAuthStore` and turns every HTTP error into an `ApiError` with a readable Spanish message (backend `{ error }` for 400/404/409/423, fixed texts for 403 and 5xx). On 401 it clears the session once, shows "Tu sesión expiró, ingresa de nuevo" and hard-navigates to `/login?redirect=…`. Pages never import axios directly — always go through hooks in `src/api/`.
- Session: `useAuthStore` (Zustand + `persist`, key `auth-storage` in `localStorage`) holds `token` and `user`; `isAuthenticated()` only checks the JWT `exp`. The refresh token from login is discarded.
- Global errors: `query-client.ts` reports every query/mutation error through `useToastStore`; do not add local try/catch in pages. Toasts raised before the `<Toaster />` exists (the route guard on a direct URL load) must use `useToastStore.deferError`; `RootLayout` flushes them on every route change.
- Platform UI: `src/pages/platform/PlatformPage.tsx` with tabs `TenantsTab` (create/edit + "Crear admin" showing the temporary password once), `ChannelsTab`, `LeadsTab` (NIT validation, protection-days counter, activate) and `LiquidacionTab` (month picker, table per channel, CSV export through `src/lib/export-csv.ts`); hooks in `src/api/platform.api.ts`, types in `src/types/platform.ts`. Dialog forms are mounted only while open (`{state.open && <Dialog key=… />}`) so `defaultValues` come from props without reset effects.
- Branding: `useBranding` (`src/api/branding.api.ts`, `staleTime: Infinity`) + `useApplyBranding` (mounted once in `RootLayout`) write `--primary`, `--primary-foreground` (contrast computed in `src/lib/contrast-color.ts`), `--ring`, `--brand-primary` and `--brand-secondary` on `<html>` and set `document.title`; `Header`, `Footer` and `LoginPage` show the channel's commercial name and logo. To preview another brand locally set `VITE_BRANDING_HOST=app.infotex.co` in `apps/web/.env.local`.
- Suspended account: `SuspendedBanner` (in `RootLayout`) reads `useCurrentTenant` and warns when `estado === "Suspendido"`; writes then fail with the backend's 423 message in the global toast. Queries marked `meta: { silent: true }` (branding, current tenant) skip the global error toast.
- Layout: `RootLayout` has two faces. Authenticated → shadcn `Sidebar` collapsible to icons (`AppSidebar`; items per role from `hooks/use-nav-items.ts`, which reads the permission matrix; "Calendario" and "Administración" are expandable groups) + `AppHeader` (sidebar trigger, breadcrumb derived from the path via `ROUTE_LABELS`, global search, user menu with the dark-mode toggle and logout). Public (`/`, `/login`) → minimal brand header + footer. On phones the sidebar becomes an off-canvas sheet (shadcn `useIsMobile`).
- Global search: `CommandPalette` (Ctrl+K / ⌘K, shadcn `command` with `shouldFilter={false}`) searches patients and products on the server with the same paged hooks as the tables and filters today's appointments client-side. Hidden for the PlatformAdmin.
- Visual system: everything is in `src/styles/tokens.css` (imported last, wins over shadcn). Bone background `#F7F6F3`, white surfaces, primary deep blue `#1F4E79`, sand accent `#D9A441` **only** for states and secondary CTAs (tokens `--sand`, `--sand-soft`, `--success`, `--success-soft`; shadcn's `--accent` stays a neutral hover surface), text `#1A1F26`, borders `#E6E2DA`, radius 12 px, two shadow levels (`shadow-soft`, `shadow-lift`). Fonts: Manrope (headings, `font-heading`) + Inter (text) from Google Fonts in `index.html` with system fallbacks; type scale 12/14/16/20/24/32 (`text-3xl` is 32 px). Dark mode = same roles inverted under `.dark` (`next-themes`, `attribute="class"`). `--primary` is **derived** from `--brand-primary` (lightened with `color-mix` in dark mode), so the channel branding overrides the primary without breaking the theme. No hex colors or Tailwind palette classes (`bg-green-100`…) in pages: use the tokens. Appointment states are CSS classes (`APPOINTMENT_CLASS` → `.fc .appt-*` in `tokens.css`).
- Motion (`motion` package): `PageTransition` (fade + slide 200 ms, keyed by pathname), `staggerProps(i)` with `MotionTableRow` / `MotionDiv` / `MotionLi` (30 ms stagger), `CountUp` for KPIs, `.card-lift` hover elevation, dialog scale 0.96→1 and skeleton shimmer in CSS. `<MotionConfig reducedMotion="user">` plus a `prefers-reduced-motion` block in `tokens.css` turn all of it off.
- Images: never fetch an image with axios. `SecureImage id=…` asks `useSignedImage(id)` for the signed URL (`staleTime` = `refetchInterval` = 8 min, so it is renewed before the 10-minute expiry and shared across components). `ImageUpload` (one image: drag or click, local preview, progress bar, inline error) and `PhotoListUpload` (several, labelled Antes/Después) share `useImageUploader`: validate → `compressImage` to max 1600 px in a canvas → `POST /files`. Forms keep only the attachment id (`imagenId`, `adjuntoIds`). `PatientAvatar` falls back to initials rendered locally (the old avatar sent patient names to dicebear.com).
- Patient file: `PatientHeader` (gradient, photo, badges for active package and next appointment, quick actions Agendar → `/calendar?patientId=…`, Registrar pago → Pagos tab, Nueva nota → `ClinicalNoteDialog`), tab **Evolución** (`EvolutionTab`: timeline per session, compare slider, lightbox).
- Empty states use `EmptyState` (inline SVG illustration drawn with the tokens + an action button).

## Conventions to follow

- All API endpoints under `/api/v1/`.
- `TenantId` always derived from the JWT claim — never from the request body. Platform endpoints are the only ones that take a tenant id, in the route, and only for the PlatformAdmin.
- Soft delete (`IsDeleted = true`) instead of hard delete on `BaseEntity` subtypes.
- `Guid` for all entity IDs.
- Spanish for domain identifiers and user-visible strings; English for framework/infrastructure code.
- Frontend: new backend calls go in `src/api/<domain>.api.ts` as `use<Action>` hooks; new pages register in `src/router/index.tsx` under `protectedRoute`.
