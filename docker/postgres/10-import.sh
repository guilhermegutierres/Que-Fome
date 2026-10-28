#!/usr/bin/env bash
set -Eeuo pipefail

test -s /restore/que-fome.dump || {
  echo 'Backup ausente. Execute node docker/prepare.mjs na máquina de origem antes de iniciar.' >&2
  exit 1
}

# Executado somente na primeira inicialização de um volume PostgreSQL vazio.
# Sem --clean e sem --create: restaura somente no banco novo criado pelo container.
pg_restore --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --no-owner --no-privileges --exit-on-error --single-transaction /restore/que-fome.dump

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set ON_ERROR_STOP=1 --file /opt/que-fome/runtime-role.sql

export QUE_FOME_APP_PASSWORD="$(cat /run/secrets/db_app_password)"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv app_password QUE_FOME_APP_PASSWORD
SELECT format('CREATE ROLE que_fome_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'app_password') \gexec
GRANT que_fome_runtime TO que_fome_app;
SQL
unset QUE_FOME_APP_PASSWORD
echo 'Banco restaurado e usuário limitado configurado.'
