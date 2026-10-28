FROM postgres:18.6-bookworm
COPY docker/postgres/10-import.sh /docker-entrypoint-initdb.d/10-import.sh
COPY backend/migrations/002_runtime_role.example.sql /opt/que-fome/runtime-role.sql
RUN chmod 755 /docker-entrypoint-initdb.d/10-import.sh
