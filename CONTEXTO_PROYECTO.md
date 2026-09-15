# NemediClinic — Contexto del Proyecto
Fecha: Mayo 2026
## Stack real
- Backend: ASP.NET Core 8 + EF Core + SQL Server
  Ruta: apps/api/src/NemediClinic.Api
  Puerto: http://localhost:5055
- Frontend: React 19 + Vite + TanStack + Zustand + shadcn/ui
  Ruta: apps/web
  Puerto: http://localhost:5173
- Mobile: Flutter (placeholder vacío)
## Comandos
# Levantar todo: Ctrl+Shift+B en VS Code
# Solo backend: dotnet run --urls http://localhost:5055
# Solo frontend: pnpm dev
# Migrations: dotnet ef database update
## Credenciales de desarrollo
Email: admin@nemediclinic.com
Password: Admin2026!
Swagger: http://localhost:5055/swagger
## Módulos completados
- Auth + JWT + Roles (SuperAdmin, Admin, Esteticista)
- Tenants + Branches
- Pacientes + Historia Clínica
- Procedimientos + Paquetes
- Calendario + Hoja del día
- Inventario
## Pendiente
- Páginas admin: /admin/users, /admin/branches, /super/tenants
- Dashboard KPIs reales
- WhatsApp Meta Cloud API
- App Flutter
