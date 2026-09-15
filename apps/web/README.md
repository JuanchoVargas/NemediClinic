# react-startup-base

Plantilla base de frontend para los proyectos del startup. Stack moderno con patrones
heredados de Vue/.NET (vista tonta, store, cache idempotente, errores globales).

## Stack

- React 19 + TypeScript + Vite
- TanStack Router (rutas type-safe)
- TanStack Query (server state con cache automático)
- Zustand (estado de cliente)
- Axios con interceptor JWT
- Tailwind v4 + shadcn/ui (preset radix-nova, base color neutral)
- React Hook Form + Zod
- Sonner para toasts globales

## Uso

### Clonar para un proyecto nuevo
```bash
# Manual (mientras no exista new-project.ps1):
cp -r react-startup-base C:\DatosD\Trabajo\StartUp\<nombre-proyecto>\frontend
cd C:\DatosD\Trabajo\StartUp\<nombre-proyecto>\frontend
pnpm install
cp .env.example .env
pnpm dev
```

### Personalización rápida (5 min por cliente)
1. Edita `src/styles/tokens.css` con la paleta del cliente (HSL).
2. Edita `.env` con `VITE_APP_NAME` y `VITE_API_URL`.
3. Reemplaza el logo/título en `src/components/layout/Header.tsx`.

## Estructura

```
src/
├── api/           ← TanStack Query hooks (server state)
├── components/
│   ├── ui/        ← shadcn/ui (NO editar manualmente)
│   ├── layout/    ← Header, Footer, RootLayout
│   └── shared/    ← componentes propios reusables
├── hooks/         ← hooks custom (lógica reusable)
├── lib/           ← axios + queryClient + utilities
├── pages/         ← páginas con ruta
├── router/        ← TanStack Router (code-based)
├── stores/        ← Zustand (cliente state)
├── styles/        ← globals.css + tokens.css
└── types/         ← tipos compartidos
```

## Páginas de ejemplo incluidas

- **HomePage** (`/`) — Landing pública con cards.
- **LoginPage** (`/login`) — Form con RHF + Zod, login mock (acepta cualquier credencial; password "fail" para probar error).
- **UsersPage** (`/users`) — Lista protegida consumiendo JSONPlaceholder.

## Cómo conectar al backend real

Ver sección "Reemplazar el login mock" en `CLAUDE.md`.

## Comandos

```bash
pnpm dev        # arranca en http://localhost:5173
pnpm build      # build de producción
pnpm preview    # preview del build
```
