#!/bin/bash
set -e

# Wait for Postgres to become available.
# until psql -h db -U "postgres" -c '\q' 2>/dev/null; do
#   >&2 echo "Postgres is unavailable - sleeping"
#   sleep 1
# done

# echo "\nPostgres is available: continuing with database setup..."

# psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
#     CREATE DATABASE ${EBNIS_DATABASE_NAME};
# EOSQL

exec "$@"
