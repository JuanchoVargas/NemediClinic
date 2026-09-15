#!/usr/bin/env bash
# Backup diario de la base NemediClinic dentro del contenedor mssql.
#   - Escribe /backups/NemediClinic_YYYY-MM-DD.bak (carpeta deploy/backups en el host)
#   - Borra los .bak con más de 14 días
# Cron sugerido (como el usuario que corre Docker), 03:15 todos los días:
#   15 3 * * * /opt/nemedi-clinic/deploy/backup.sh >> /var/log/nemedi-backup.log 2>&1
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"
BACKUP_DIR="$DEPLOY_DIR/backups"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_NAME="${DB_NAME:-NemediClinic}"

[[ -f "$ENV_FILE" ]] || { echo "No existe $ENV_FILE"; exit 1; }
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
[[ -n "${MSSQL_SA_PASSWORD:-}" ]] || { echo "MSSQL_SA_PASSWORD vacío en $ENV_FILE"; exit 1; }

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F)"
FILE="/backups/${DB_NAME}_${STAMP}.bak"

echo "[$(date '+%F %T')] BACKUP DATABASE [$DB_NAME] → $FILE"
docker compose -f "$DEPLOY_DIR/docker-compose.yml" --env-file "$ENV_FILE" exec -T mssql \
  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b \
  -Q "BACKUP DATABASE [$DB_NAME] TO DISK = N'$FILE' WITH INIT, COMPRESSION, CHECKSUM, STATS = 25"

# Retención
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.bak" -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
echo "[$(date '+%F %T')] Listo. Backups borrados por retención (> $RETENTION_DAYS días): $DELETED"
ls -lh "$BACKUP_DIR" | tail -n +2
