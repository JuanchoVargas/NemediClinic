# Plan de migración del frontend — Nemedi Clinic

> Backend .NET 8 conservado tal cual. Frontend migrado de Next.js a React + Vite con la plantilla react-startup-base.

## Estado actual

- ✅ apps/api/ — backend .NET 8 funcional (NO migrar)
- ✅ apps/web/ — frontend nuevo clonado de react-startup-base
- 📦 apps/_archive/web-nextjs-legacy/ — frontend Next.js anterior (referencia)

## Información detectada del backend (Tarea 3 del empalme)

- **Puerto HTTP (dotnet run):** `5055`
- **Puerto HTTPS (dotnet run):** `7162` (`http` también escucha en 5055 dentro del perfil https)
- **Puerto IIS Express:** `51285` HTTP / `44376` HTTPS (no se usa con `dotnet run`)
- **CORS permitidos:** solo `http://localhost:3000` (heredado del frontend Next.js). **Vite usa `5173`** — hay que agregarlo al `Program.cs`. NO se hizo en este empalme; lo dejo como pendiente bloqueante.
- **Shape de LoginResponse** (verificado en `LoginResponse.cs`, ASP.NET serializa en camelCase):
  ```json
  {
    "token": "string",
    "refreshToken": "string",
    "expiration": "2026-05-14T17:00:00Z",
    "userInfo": {
      "id": "Guid",
      "nombre": "string",
      "apellido": "string",
      "email": "string",
      "rol": "SuperAdmin|Admin|Esteticista",
      "tenantId": "Guid",
      "branchId": "Guid | null"
    }
  }
  ```
  **Diferencias con lo asumido en el empalme** (importante porque ajusté el código antes de pegarlo):
  - `accessToken` → real: `token`
  - `expiresAt` → real: `expiration`
  - `user` → real: `userInfo`
  - `user.fullName` → NO existe; real: `userInfo.nombre` + `userInfo.apellido` (los concateno en el frontend con un space)
  - `user.role` → real: `userInfo.rol`
- **Shape de errores:** `{ "error": "mensaje" }`. Confirmado en todos los `return Unauthorized/BadRequest/Conflict` de `AuthController.cs`.

## Adaptaciones realizadas a la plantilla

1. **Interceptor de Axios** (`src/lib/axios.ts`): adaptado al formato legacy de Nemedi (`{ error: "..." }` en errores). Comentario de cabecera actualizado para reflejar la adaptación.
2. **Login real** (`src/api/auth.api.ts`): apunta a `POST /api/v1/auth/login` del backend .NET con el shape real (`token` + `userInfo` con `nombre`/`apellido`/`rol`). Concateno `nombre + apellido` para llenar `User.name`.
3. **Tipo `User` extendido** (`src/types/auth.ts`): incluye `tenantId?`. `JwtPayload` ahora incluye `tenant_id?`.
4. **UsersPage eliminada** (era demo contra JSONPlaceholder). `users.api.ts` también eliminado.
5. **Stubs de rutas protegidas** en `src/router/index.tsx`: `/dashboard` y `/patients` (placeholders).
6. **HomePage** ajustada para Nemedi (título, descripción, cards "Dashboard" y "Pacientes").
7. **Header** cambia link `/users` → `/dashboard`.
8. **LoginPage** redirige a `/dashboard` post-login y se actualizó la copy ("Login mock" → "Ingresa con tus credenciales del backend Nemedi").
9. **`.env`** creado con `VITE_API_URL=http://localhost:5055` y `VITE_APP_NAME=Nemedi Clinic`.
10. **`package.json`** renombrado a `nemedi-clinic-web`.

## Endpoints disponibles del backend

Base path: `/api/v1/`. Auth: JWT Bearer.

| Controller | Policy | Acciones |
|---|---|---|
| Auth | Anonymous | seed, login, register, refresh |
| Tenants | SuperAdmin | CRUD (paginado) |
| Branches | Admin (POST: SuperAdmin) | CRUD |
| Users | Admin | List/Get/Update/Delete (paginado) |
| Procedures | Admin | CRUD (paginado) |
| Packages | Admin | CRUD + procedures |
| Patients | Esteticista | CRUD — auto-crea ClinicalRecord |
| ClinicalRecords | Esteticista | GET/PUT record + GET/POST notes |
| PatientPackages | Admin | Assign, status, payments, sessions |
| Health | — | Health check |

## Páginas a construir (orden recomendado)

### Sprint 1: Fundamentos
1. **DashboardPage** (`/dashboard`) — KPIs básicos (placeholder hasta tener endpoint).
2. **PatientsPage** (`/patients`) — Lista paginada con filtros.
3. **PatientDetailPage** (`/patients/:id`) — Tabs: datos, historia clínica, paquetes, pagos.
4. **PatientFormPage** (`/patients/new`, `/patients/:id/edit`).

### Sprint 2: Comercial
5. **PackagesPage** (`/packages`).
6. **AssignPackagePage** — Asignar paquete a paciente.
7. **PaymentsPage**.

### Sprint 3: Admin
8. **UsersPage** (`/admin/users`).
9. **BranchesPage** (`/admin/branches`).
10. **TenantsPage** (`/super/tenants`) — solo SuperAdmin.

### Futuro
- Calendario / Citas (backend pendiente)
- Inventario (backend pendiente)
- WhatsApp

## Patrón a seguir para cada página

1. Crear `src/api/<dominio>.api.ts` con `useQuery`/`useMutation` contra endpoints reales.
2. Crear `src/types/<dominio>.ts` con DTOs (mirar backend para shape exacto).
3. Crear `src/pages/<Name>Page.tsx`.
4. Registrar ruta en `src/router/index.tsx` como hija de `protectedRoute`.
5. Si requiere rol específico, agregar guard adicional en `beforeLoad` verificando `user.role`.

## Multi-tenancy en el frontend

**Usuarios Admin/Esteticista:** transparente. El JWT trae `tenant_id` y el backend lo lee.

**Usuarios SuperAdmin:** pueden operar en cualquier tenant. Probablemente requiera:
- Selector de tenant en el header (`GET /api/v1/tenants`).
- Endpoint para regenerar JWT con otro `tenant_id`.
- *Pendiente confirmar si el backend ya soporta esto.*

## Roles y guards

Backend tiene 3 policies:
- `SuperAdmin`
- `Admin` (incluye SuperAdmin)
- `Esteticista` (incluye los tres roles)

Frontend: replicar con guards en `beforeLoad`:

```typescript
beforeLoad: () => {
  const user = useAuthStore.getState().user;
  if (user?.role !== "SuperAdmin" && user?.role !== "Admin") {
    throw redirect({ to: "/dashboard" });
  }
}
```

## Cómo arrancar el desarrollo

### Backend
```bash
cd apps\api
dotnet run --project src/NemediClinic.Api
```

### Frontend
```bash
cd apps\web
pnpm install   # solo la primera vez
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5055

⚠️ **Pendiente bloqueante:** agregar `http://localhost:5173` a `WebAppCorsPolicy` en `apps/api/src/NemediClinic.Api/Program.cs`. Sin eso, el login real fallará por CORS desde el navegador.

## Credenciales para desarrollo

Si la BD está vacía, usar `POST /api/v1/auth/seed` (endpoint anónimo) para crear el primer SuperAdmin. Ver `CLAUDE.md` del repo para el body exacto.

## Próximos pasos sugeridos

1. Ajustar CORS del backend para aceptar `http://localhost:5173`.
2. Verificar que el frontend arranca y se conecta al backend (login real).
3. Implementar **DashboardPage** y **PatientsPage** primero (mayor valor inmediato).
4. Patrón: una página, un API hook, un commit. No mezclar.

## Notas

- Frontend Next.js legacy archivado en `apps/_archive/web-nextjs-legacy/`.
- Plantilla maestra en `C:\DatosD\Trabajo\templates\react-startup-base\`. Si mejoras genéricas surgen en Nemedi, portarlas a la plantilla manualmente.
- Estado detallado y modelo de dominio: ver `CLAUDE.md` heredado del repo.
