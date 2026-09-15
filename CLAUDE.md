# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Multi-tenant ERP/CRM for aesthetic clinics ("estéticas"). Each tenant is one clinic. See `CONTEXTO_PROYECTO.md` for the module list, dev DB state and role matrix (SuperAdmin / Admin / Esteticista), and `docs/STATUS_2026-09.md` for the September 2026 audit (module coverage, tech debt, mobile and theming estimates). Domain identifiers and user-facing strings are in **Spanish** (`Nombre`, `Apellido`, `Cedula`, `Estado`, ...) — keep that style when adding entities or DTOs.

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

Demo data: `POST /api/v1/dev/seed-demo` (anonymous, **Development only**, 404 elsewhere, idempotent on patient cédula `1000000001`). It resets the SuperAdmin password to `Admin2026!`, creates two Esteticista users (`laura.perez@nemedi.demo`, `camila.ruiz@nemedi.demo`, password `Demo2026!`), procedures, packages, 8 patients, assigned packages with payments, 12 appointments around today and 6 products with inventory entries. Requires a tenant created earlier via `POST /api/v1/auth/seed`.

There are no tests yet.

### Frontend (`apps/web/`)

```bash
cd apps/web
pnpm install
pnpm dev          # http://localhost:5173, expects API at VITE_API_URL (apps/web/.env → http://localhost:5055)
pnpm build        # tsc -b && vite build
pnpm lint         # eslint . (currently fails: react-hooks/set-state-in-effect in paginated pages)
```

`pnpm` is not on the global PATH of this machine. If it is missing in your shell, use `corepack pnpm ...` or call the binaries in `apps/web/node_modules/.bin` directly (`tsc -b && vite build`).

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

Today there is no Service/Repository layer: controllers use `AppDbContext` directly and hold the business rules. The StartUp standard (thin controller → service → repository) is the target when refactoring; do not add more logic to controllers if a service can be introduced instead.

### Multi-tenancy (the most important pattern in this codebase)

Every domain entity inherits `BaseEntity` (`Id: Guid`, `TenantId: Guid`, `CreatedAt`, `UpdatedAt`, `IsDeleted`, `RowVersion`). Tenant isolation is enforced **automatically and globally** by three pieces working together — do not bypass any of them in normal request paths:

1. **JWT carries `tenant_id`.** `TenantMiddleware` returns 403 if an authenticated request lacks the claim.
2. **`HttpTenantProvider`** (scoped) reads `tenant_id` from the JWT claim; its `SetTenant(Guid)` override exists only for bootstrap flows where no JWT is present yet (`AuthController.Seed`, `DevController.SeedDemo`).
3. **`AppDbContext.OnModelCreating`** installs a global query filter on every `BaseEntity` subtype: `e.TenantId == _tenantProvider.TenantId && !e.IsDeleted`. `Tenant` itself is excluded from the tenant filter (it only gets the soft-delete filter).

`AppDbContext.SaveChangesAsync` stamps `TenantId`, `CreatedAt`, and `UpdatedAt` automatically — **never set `TenantId` from a request body**, and never accept it as a controller input.

Consequences when writing controllers and queries:

- Reads on tenant-scoped tables are pre-filtered. Just write `_db.Patients.Where(...)` — no manual tenant check needed.
- Use `IgnoreQueryFilters()` only for cross-tenant flows: login lookup by email, refresh-token lookup by user id, the bootstrap `seed` / `register` paths in `AuthController`, and similar admin checks.
- Soft delete: set `IsDeleted = true` and `SaveChanges`. The global filter hides it from subsequent reads.
- `RowVersion` is configured as an EF concurrency token on every `BaseEntity` — expect concurrency exceptions on contended writes.
- Known EF warning 10622: `Package` has the global filter but is the required end of `PackageProcedure`, which has no matching filter.

### Bootstrap / seeding

- `POST /api/v1/auth/seed` is allowed only when **no tenant exists**. It creates Tenant + "Sede Principal" Branch + SuperAdmin in a transaction, using `_tenantProvider.SetTenant(tenant.Id)` so that `SaveChangesAsync` stamps the right `TenantId` on all three.
- `POST /api/v1/auth/register` works in two modes:
  - If at least one SuperAdmin exists: requires an authenticated SuperAdmin JWT and uses its `tenant_id`. (The web UI lets Admins open "Nuevo usuario", but the backend responds 403 for them.)
  - Otherwise (a fresh DB with seeded tenant but no users yet): attaches the new user to the oldest tenant.
- `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` issue JWT + refresh token (refresh tokens stored on `User`, 7-day expiry). The web frontend currently ignores the refresh token.
- `POST /api/v1/dev/seed-demo` (see Common commands) fills the existing tenant with demo data in Development only.

### Routing & authorization conventions

- All controllers use `[Route("api/v1/[controller]")]` (or an explicit `api/v1/...` route) — every endpoint lives under `/api/v1/`, except `GET /api/health`.
- Authorization policies in `Program.cs`: `SuperAdmin`, `Admin` (= SuperAdmin + Admin), `Esteticista` (= all three roles). Apply with `[Authorize(Policy = "...")]`.
- Error responses are `{ error: "..." }` and success responses return DTOs directly. The universal StartUp contract (`codigoRespuesta` / `mensajeRespuesta` / `data`) is **not** used here; the Axios interceptor in the web app is adapted to `{ error }`.
- Dates: the API has no timezone handling. `DateTime` values are stored and returned as-is (no `Z` suffix). The web app sends `toISOString()` (UTC) on create and parses responses as local time, so appointments created from the UI shift by the machine's UTC offset. The demo seed stores local wall-clock times to display correctly. Fix pending.

### Config gotcha

`Program.cs` and `JwtService` read JWT settings from the `Jwt` section (`Issuer`, `Audience`, `Key`, `ExpirationMinutes`, `RefreshTokenExpirationDays`). `appsettings.Development.json` overrides `Jwt:ExpirationMinutes` to 480 for demos; its `JwtSettings` block is legacy and **not read**. Put per-env JWT overrides under `Jwt`, not `JwtSettings`.

## Web architecture (`apps/web/`)

- React 19 + TypeScript + Vite 8, cloned from the StartUp `react-startup-base` template. Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui (preset `radix-nova`, base color `neutral`), TanStack Router, TanStack Query, Zustand, Axios, React Hook Form + Zod, FullCalendar, sonner, lucide-react. Package manager: pnpm.
- Folder map: `src/api/*.api.ts` (one file per backend controller: TanStack Query hooks + axios calls), `src/pages/*.tsx` (dumb views; `admin/` and `super/` subfolders), `src/components/ui` (shadcn), `src/components/layout` (`Header`, `Footer`, `RootLayout`), `src/components/shared` (`PageContainer`, `PatientCombobox`), `src/stores` (`auth.store.ts`, `toast.store.ts`), `src/lib` (`axios.ts`, `query-client.ts`, `utils.ts`), `src/types` (DTO mirrors), `src/styles` (`globals.css`, `tokens.css`).
- Routing lives in `src/router/index.tsx` (code-based TanStack Router tree, no file routing). Public: `/`, `/login`. Everything else hangs from the `_protected` layout route whose `beforeLoad` redirects to `/login` when `useAuthStore.isAuthenticated()` is false. Role-gated routes (`/admin/users`, `/admin/branches`, `/super/tenants`) call `requireRoles([...])` in their own `beforeLoad`. Declare `/x/new` before `/x/$id`.
- `src/lib/axios.ts` is the only place that creates the HTTP client. It reads `VITE_API_URL`, attaches `Bearer ${token}` from `useAuthStore`, maps `{ error }` responses to `ApiError`, and clears the session on 401 (no redirect; the router guard handles it on next navigation). Pages never import axios directly — always go through hooks in `src/api/`.
- Session: `useAuthStore` (Zustand + `persist`, key `auth-storage` in `localStorage`) holds `token` and `user`; `isAuthenticated()` only checks the JWT `exp`. The refresh token from login is discarded.
- Global errors: `query-client.ts` reports every query/mutation error through `useToastStore`; do not add local try/catch in pages.
- Theming: all tokens are in `src/styles/globals.css` (`@theme inline` + oklch variables for `:root` / `.dark`); brand overrides go in `src/styles/tokens.css`, imported last. Tailwind v4 has no `tailwind.config.ts`.
- Responsive: the `Header` has no breakpoints and overflows at phone widths (see the audit). Add a mobile nav before demoing on a phone.

## Conventions to follow

- All API endpoints under `/api/v1/`.
- `TenantId` always derived from the JWT claim — never from the request body.
- Soft delete (`IsDeleted = true`) instead of hard delete on `BaseEntity` subtypes.
- `Guid` for all entity IDs.
- Spanish for domain identifiers and user-visible strings; English for framework/infrastructure code.
- Frontend: new backend calls go in `src/api/<domain>.api.ts` as `use<Action>` hooks; new pages register in `src/router/index.tsx` under `protectedRoute`.
