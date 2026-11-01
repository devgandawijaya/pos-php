#!/usr/bin/env bash
# ==============================================================================
# Enterprise SaaS POS - Automated PostgreSQL Backup Script
# ==============================================================================
set -e

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5433}"
DB_DATABASE="${DB_DATABASE:-pos_saas}"
DB_USER="${DB_USERNAME:-pos_user}"
DB_PASSWORD="${DB_PASSWORD:-pos_secret}"
BACKUP_DIR="${BACKUP_DIR:-storage/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pos_backup_${DB_DATABASE}_${TIMESTAMP}.sql.gz"

echo "===================================================="
echo "  Enterprise SaaS POS - Database Backup Utility     "
echo "===================================================="
echo "Target Host     : ${DB_HOST}:${DB_PORT}"
echo "Database        : ${DB_DATABASE}"
echo "User            : ${DB_USER}"
echo "Backup Output   : ${BACKUP_FILE}"
echo "----------------------------------------------------"

mkdir -p "${BACKUP_DIR}"

# Execute PostgreSQL Dump with gzip compression
export PGPASSWORD="${DB_PASSWORD}"

echo "[*] Creating database dump..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_DATABASE}" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists | gzip -9 > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[✓] Backup completed successfully: ${BACKUP_FILE} (${FILESIZE})"

# Auto cleanup old backups older than RETENTION_DAYS
echo "[*] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "pos_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \; || true

echo "[✓] Backup and rotation finished successfully."
echo "===================================================="
exit 0

