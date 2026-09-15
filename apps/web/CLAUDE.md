# react-startup-base · Reglas del template

> Este archivo guía a Claude Code cuando trabaje en un proyecto clonado de este template.
> Para reglas globales del startup, ver `..\..\..\StartUp\CLAUDE.md`.
> Para mapeo Vue↔React, ver `..\..\..\StartUp\PATTERNS.md`.

## Stack instalado
- React 19 + TypeScript + Vite
- TanStack Router (code-based, en `src/router/index.tsx`)
- TanStack Query (cliente en `src/lib/query-client.ts`)
- Zustand (stores en `src/stores/`)
- Axios (cliente en `src/lib/axios.ts`)
- Tailwind v4 + shadcn/ui (preset radix-nova)
- React Hook Form + Zod
- Sonner (toasts)
- jose (JWT decode/sign)

## Reglas operativas

### Cuándo crear qué
- **Datos del servidor** → hook en `src/api/<dominio>.api.ts` con `useQuery`/`useMutation`.
- **Estado global de cliente** → store Zustand en `src/stores/<dominio>.store.ts`.
- **Estado de UI puntual** → `useState` local en el componente.
- **Lógica reusable** → hook en `src/hooks/use-<x>.ts`.
- **Componente visual reusable** → `src/components/shared/<Name>.tsx`.
- **Página con ruta** → `src/pages/<Name>Page.tsx` + registrar en `src/router/index.tsx`.
- **Tipo compartido** → `src/types/<dominio>.ts`.

### Patrones obligatorios
- Vistas NO llaman axios directo. Siempre vía hook `api/` o store.
- Errores de query/mutation se manejan automáticamente vía `queryClient` global.
- Token JWT lo inyecta el interceptor de `src/lib/axios.ts`. NO lo pongas manualmente.
- Contrato de respuesta backend: `{ codigoRespuesta, mensajeRespuesta, data }`.
- Persistir SOLO la sesión. Datos de negocio se recargan.
- Si una ruta debe ser autenticada, ponla como hija de `protectedRoute` en el router.

### Convenciones
- Páginas: PascalCase con sufijo `Page` (`HomePage`, `LoginPage`, `UsersPage`).
- Componentes: PascalCase sin sufijo.
- Hooks: kebab-case con prefijo `use-` (`use-debounce.ts`).
- Stores: kebab-case con sufijo `.store.ts` (`auth.store.ts`).
- API hooks: kebab-case con sufijo `.api.ts` (`users.api.ts`).
- Importar siempre con alias `@/`.

### Personalización por proyecto/cliente
- Colores de marca → `src/styles/tokens.css` (sobrescribir variables HSL).
- Nombre de app → variable `VITE_APP_NAME` en `.env`.
- URL del backend → variable `VITE_API_URL` en `.env`.
- Logo → reemplazar en `Header.tsx`.

### Reemplazar el login mock por backend real
Cuando exista backend, en `src/api/auth.api.ts`:
1. Elimina la función `mockLogin`.
2. Cambia `mutationFn` por:
```typescript
   mutationFn: async (request: LoginRequest) => {
     const { data } = await api.post<ApiResponse<LoginResponse>>("/auth/login", request);
     if (data.codigoRespuesta !== 200) throw new ApiError(data.codigoRespuesta, data.mensajeRespuesta);
     return data.data!;
   }
```
3. Importar `api` de `@/lib/axios` y `ApiResponse`/`ApiError` de `@/types/api`.

### Cosas a NO hacer
- ❌ Llamar axios desde un componente.
- ❌ Poner datos del servidor en Zustand.
- ❌ Try/catch en cada componente (el queryClient lo maneja).
- ❌ Hardcodear colores (`bg-orange-500`). Usar semánticos (`bg-primary`).
- ❌ Tipos `any`. Usar `unknown` con narrowing si dudas.
- ❌ Cambiar nada en `src/components/ui/` (son archivos de shadcn).
