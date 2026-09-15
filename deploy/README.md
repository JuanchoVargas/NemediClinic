# Despliegue de NemediClinic con Docker Compose

Un solo VPS corre cuatro contenedores: **caddy** (HTTPS automático y reverse proxy), **web** (frontend Vite servido por nginx), **api** (ASP.NET Core 8, aplica migraciones al arrancar) y **mssql** (SQL Server 2022 Express con volumen persistente).

```
Internet ──443──▶ caddy ──/api/*──▶ api:8080 ──▶ mssql:1433
                        └──/*─────▶ web:80
```

## Requisitos

- VPS Linux (Ubuntu 22.04 o 24.04) con **2 vCPU y 4 GB de RAM mínimo** (SQL Server exige 2 GB para sí solo). 20 GB de disco.
- Un dominio apuntando a la IP del VPS (registro A). Puertos 80 y 443 abiertos.

## 1. Crear el VPS e instalar Docker

```bash
ssh root@IP_DEL_VPS
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

## 2. Clonar el repositorio

```bash
mkdir -p /opt && cd /opt
git clone git@github.com:JuanchoVargas/NemediClinic.git nemedi-clinic
cd nemedi-clinic/deploy
```

## 3. Configurar `.env`

```bash
cp .env.example .env
openssl rand -base64 48        # pega el resultado en Jwt__Secret
nano .env
```

Completa `DOMAIN`, `PUBLIC_URL`, `CORS_ORIGINS` (los tres con tu dominio), `MSSQL_SA_PASSWORD` y **la misma contraseña** dentro de `ConnectionStrings__DefaultConnection`, y `Jwt__Secret`. El API no arranca en Production si `Jwt__Secret` está vacío, es la clave de desarrollo o tiene menos de 32 caracteres.

La carpeta de backups la escribe el usuario `mssql` del contenedor (uid 10001):

```bash
mkdir -p backups && chown 10001:0 backups
```

## 4. Levantar

```bash
docker compose --env-file .env up -d --build
docker compose --env-file .env ps          # los cuatro servicios en "healthy" / "running"
docker compose --env-file .env logs -f api # "Migraciones aplicadas" y "Now listening on"
```

El API espera hasta 60 s a que SQL Server responda, crea la base `NemediClinic` y aplica las migraciones pendientes. Si la base no responde en ese tiempo, el contenedor termina con el mensaje `No se pudo conectar a la base de datos en 60 s` y Compose lo reinicia.

Comprueba desde afuera:

```bash
curl -s https://TU_DOMINIO/api/health          # {"status":"healthy",...}
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://TU_DOMINIO/api/v1/dev/seed-demo   # 404: el seed demo no existe en Production
```

## 5. Crear el primer tenant (una sola vez)

`POST /api/v1/auth/seed` solo funciona mientras no exista ningún tenant. Crea la clínica, la "Sede Principal" y el SuperAdmin, y devuelve el JWT.

```bash
curl -s -X POST https://TU_DOMINIO/api/v1/auth/seed \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantNombre": "Clínica Estética Aurora",
    "tenantNit": "900123456-7",
    "tenantEmail": "contacto@aurora.com",
    "adminNombre": "Juan Diego",
    "adminApellido": "Vargas",
    "adminEmail": "admin@aurora.com",
    "adminPassword": "UnaClaveSegura2026!"
  }'
```

Después entra a `https://TU_DOMINIO` con ese correo y contraseña. Desde **Administración → Usuarios** creas al resto del equipo.

## Operación

| Tarea | Comando (desde `deploy/`) |
|---|---|
| Ver estado | `docker compose --env-file .env ps` |
| Logs del API | `docker compose --env-file .env logs -f api` |
| Actualizar a la última versión | `git pull && docker compose --env-file .env up -d --build` |
| Reiniciar un servicio | `docker compose --env-file .env restart api` |
| Backup manual | `./backup.sh` |
| Restaurar un backup | ver abajo |
| Apagar todo (los datos quedan en el volumen) | `docker compose --env-file .env down` |

### Backups automáticos

`backup.sh` hace `BACKUP DATABASE` dentro del contenedor a `deploy/backups/NemediClinic_AAAA-MM-DD.bak` y borra los de más de 14 días. Prográmalo en cron:

```bash
chmod +x /opt/nemedi-clinic/deploy/backup.sh
(crontab -l 2>/dev/null; echo "15 3 * * * /opt/nemedi-clinic/deploy/backup.sh >> /var/log/nemedi-backup.log 2>&1") | crontab -
```

Copia periódicamente esa carpeta fuera del VPS (rclone, scp, el snapshot del proveedor): un backup en el mismo disco no protege contra la pérdida del servidor.

### Restaurar

```bash
docker compose --env-file .env stop api
docker compose --env-file .env exec -T mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q \
  "ALTER DATABASE [NemediClinic] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [NemediClinic] FROM DISK = N'/backups/NemediClinic_2026-09-15.bak' WITH REPLACE; ALTER DATABASE [NemediClinic] SET MULTI_USER;"
docker compose --env-file .env start api
```

## Probar en local (sin dominio ni certificados)

En `.env` usa `DOMAIN=http://localhost`, `PUBLIC_URL=http://localhost` y `CORS_ORIGINS=http://localhost`. Caddy sirve solo HTTP en el puerto 80. Luego `docker compose --env-file .env up -d --build`, abre `http://localhost`, crea el tenant con el `seed` del paso 5 e ingresa.

## Qué NO hay todavía

- No hay job de vencimiento de paquetes ni descuento de inventario: son pendientes del producto, no del despliegue.
- Swagger no se expone en Production.
- `POST /api/v1/dev/seed-demo` responde 404 fuera de Development.
