#!/usr/bin/env bash
# ==============================================================================
# Enterprise SaaS POS - Database Restore Utility
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

BACKUP_FILE="$1"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    echo "Contoh: $0 storage/backups/pos_backup_pos_saas_20261101_120000.sql.gz"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[!] ERROR: Backup file '${BACKUP_FILE}' tidak ditemukan!"
    exit 1
fi

echo "===================================================="
echo "  Enterprise SaaS POS - Database Restore Utility    "
echo "===================================================="
echo "PERINGATAN: Memulihkan database akan menimpa data yang ada!"
echo "Target Host     : ${DB_HOST}:${DB_PORT}"
echo "Database        : ${DB_DATABASE}"
echo "File Restore    : ${BACKUP_FILE}"
echo "----------------------------------------------------"

export PGPASSWORD="${DB_PASSWORD}"

echo "[*] Memeriksa konektivitas PostgreSQL..."
pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_DATABASE}"

echo "[*] Memulai pemulihan database dari ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_DATABASE}"

echo "[✓] Pemulihan database selesai dengan sukses!"
echo "===================================================="
exit 0

