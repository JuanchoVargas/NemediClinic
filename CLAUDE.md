# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Multi-tenant ERP/CRM for aesthetic clinics ("estéticas"). Each tenant is one clinic. See `CONTEXTO_PROYECTO.md` for the high-level module roadmap and role matrix (SuperAdmin / Admin / Esteticista). Domain identifiers and user-facing strings are in **Spanish** (`Nombre`, `Apellido`, `Cedula`, `Estado`, ...) — keep that style when adding entities or DTOs.

Monorepo layout (Turborepo is the stated target but is not yet wired — there is no root `package.json` or `turbo.json` yet; each app builds independently):

```
apps/api/      .NET 8 backend (the only app with substantial code today)
apps/web/      Next.js 16 + React 19 frontend
apps/mobile/   Flutter — empty placeholder
packages/shared/  contains stale stub C# code (NOT referenced by the API solution); ignore it
packages/ui/   empty
docs/hu/       user stories (empty)
docs/openapi/  hand-authored OpenAPI fragments (e.g. auth.yaml)
```

## Common commands

### Backend (`apps/api/`)

```bash
# Build / run (the API listens on http://localhost:5055 in dev)
dotnet build apps/api/NemediClinic.sln
dotnet run --project apps/api/src/NemediClinic.Api

# EF Core migrations — run with Infrastructure as the project and Api as the startup project
dotnet ef migrations add <Name> \
  --project apps/api/src/NemediClinic.Infrastructure \
  --startup-project apps/api/src/NemediClinic.Api
dotnet ef database update \
  --project apps/api/src/NemediClinic.Infrastructure \
  --startup-project apps/api/src/NemediClinic.Api
```

Dev DB connection (in `appsettings.Development.json`) points to `localhost\SQLEXPRESS01` / `NemediClinic_Dev` with Windows auth. Swagger UI is mounted at `/swagger` in Development.

There are no tests yet.

### Frontend (`apps/web/`)

```bash
cd apps/web
npm install
npm run dev       # http://localhost:3000, expects API at NEXT_PUBLIC_API_URL (default .env.local: http://localhost:5055)
npm run build
npm run lint
```

## API architecture

The solution has four projects following Clean Architecture layering:

```
NemediClinic.Api            — controllers, middleware, DI composition (Program.cs)
NemediClinic.Application    — DTOs and interfaces (IJwtService, ITenantProvider). No EF dependency.
NemediClinic.Domain         — entities + enums. No external dependencies.
NemediClinic.Infrastructure — AppDbContext, migrations, JwtService, BCrypt. References Domain + Application.
```

Dependency direction: `Api → Application/Infrastructure → Domain`. Application must not reference EF Core or Infrastructure.

### Multi-tenancy (the most important pattern in this codebase)

Every domain entity inherits `BaseEntity` (`Id: Guid`, `TenantId: Guid`, `CreatedAt`, `UpdatedAt`, `IsDeleted`, `RowVersion`). Tenant isolation is enforced **automatically and globally** by three pieces working together — do not bypass any of them in normal request paths:

1. **JWT carries `tenant_id`.** `TenantMiddleware` returns 403 if an authenticated request lacks the claim.
2. **`HttpTenantProvider`** (scoped) reads `tenant_id` from the JWT claim; its `SetTenant(Guid)` override exists only for bootstrap flows where no JWT is present yet.
3. **`AppDbContext.OnModelCreating`** installs a global query filter on every `BaseEntity` subtype: `e.TenantId == _tenantProvider.TenantId && !e.IsDeleted`. `Tenant` itself is excluded from the tenant filter (it only gets the soft-delete filter).

`AppDbContext.SaveChangesAsync` stamps `TenantId`, `CreatedAt`, and `UpdatedAt` automatically — **never set `TenantId` from a request body**, and never accept it as a controller input.

Consequences when writing controllers and queries:

- Reads on tenant-scoped tables are pre-filtered. Just write `_db.Patients.Where(...)` — no manual tenant check needed.
- Use `IgnoreQueryFilters()` only for cross-tenant flows: login lookup by email, refresh-token lookup by user id, the bootstrap `seed` / `register` paths in `AuthController`, and similar admin checks.
- Soft delete: set `IsDeleted = true` and `SaveChanges`. The global filter hides it from subsequent reads.
- `RowVersion` is configured as an EF concurrency token on every `BaseEntity` — expect concurrency exceptions on contended writes.

### Bootstrap / seeding

- `POST /api/v1/auth/seed` is allowed only when **no tenant exists**. It creates Tenant + "Sede Principal" Branch + SuperAdmin in a transaction, using `_tenantProvider.SetTenant(tenant.Id)` so that `SaveChangesAsync` stamps the right `TenantId` on all three.
- `POST /api/v1/auth/register` works in two modes:
  - If at least one SuperAdmin exists: requires an authenticated SuperAdmin JWT and uses its `tenant_id`.
  - Otherwise (a fresh DB with seeded tenant but no users yet): attaches the new user to the oldest tenant.
- `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` issue JWT + refresh token (refresh tokens stored on `User`, 7-day expiry).

### Routing & authorization conventions

- All controllers use `[Route("api/v1/[controller]")]` — every endpoint lives under `/api/v1/`.
- Authorization policies in `Program.cs`: `SuperAdmin`, `Admin` (= SuperAdmin + Admin), `Esteticista` (= all three roles). Apply with `[Authorize(Policy = "...")]`.
- Response shape used by `AuthController` for errors is `{ error: "..." }`. The convention noted in `CONTEXTO_PROYECTO.md` (`{ success, data, message, errors }`) is aspirational — current controllers do not wrap responses, they return DTOs directly.

### Config gotcha

`Program.cs` reads JWT settings from the `Jwt` section, which is defined in `appsettings.json`. `appsettings.Development.json` has a `JwtSettings` section instead, which is **not read** — the dev environment falls back to the `Jwt` block in the base settings file. If you need per-env JWT overrides, add them under `Jwt`, not `JwtSettings`.

## Web architecture (`apps/web/`)

- Next.js 16 App Router, React 19, Tailwind v4 (via `@tailwindcss/postcss`), TypeScript.
- Route groups: `app/(auth)/login` is public; `app/(app)/*` is the authenticated shell.
- `lib/api.ts` is the only place that calls `fetch`. It reads `NEXT_PUBLIC_API_URL`, attaches `Bearer ${token}`, and on 401 wipes the token and redirects to `/login`. New API calls should go through `get/post/put/del` from this module.
- Auth token (`nc_token`) is stored in **both** `localStorage` (used by `lib/api.ts` for the bearer header) and a non-HTTPOnly cookie (used by `middleware.ts` to gate routes). `setToken` / `removeToken` in `lib/auth.ts` keep them in sync — do not write the token directly to one without the other.
- `middleware.ts` only protects the paths in its `matcher` array (`/dashboard`, `/patients`, `/packages`, `/calendar`, `/inventory`). Add new authenticated routes there.

## Conventions to follow

- All API endpoints under `/api/v1/`.
- `TenantId` always derived from the JWT claim — never from the request body.
- Soft delete (`IsDeleted = true`) instead of hard delete on `BaseEntity` subtypes.
- `Guid` for all entity IDs.
- Spanish for domain identifiers and user-visible strings; English for framework/infrastructure code.
