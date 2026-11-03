#!/bin/sh
# Postgres roles (D23): one schema per service, owned by its migration role (DDL); an application role
# with data reads and writes only. Idempotent: run by the image on the first start
# (docker-entrypoint-initdb.d, sourced: hence the subshell) and by scripts/deploy.sh on every
# deployment, so passwords and grants always follow the secrets.
# Passwords come from the Docker secrets and reach psql through its environment, not its command line.
(
  set -eu

  for ctx in content contact identity; do
    PORTFOLIO_MIGRATOR_PASSWORD=$(cat "/run/secrets/${ctx}_migrator_password") \
    PORTFOLIO_APP_PASSWORD=$(cat "/run/secrets/${ctx}_app_password") \
      psql -v ON_ERROR_STOP=1 --no-psqlrc --quiet \
        --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
        -v db="$POSTGRES_DB" -v ctx="$ctx" -v migrator="${ctx}_migrator" -v app="${ctx}_app" <<'SQL'
SET client_min_messages TO warning;
\getenv migrator_password PORTFOLIO_MIGRATOR_PASSWORD
\getenv app_password PORTFOLIO_APP_PASSWORD
SELECT format('CREATE ROLE %I', :'migrator')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'migrator') \gexec
SELECT format('CREATE ROLE %I', :'app')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app') \gexec
ALTER ROLE :"migrator" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 5 PASSWORD :'migrator_password';
ALTER ROLE :"app" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  CONNECTION LIMIT 10 PASSWORD :'app_password';
CREATE SCHEMA IF NOT EXISTS :"ctx" AUTHORIZATION :"migrator";
ALTER SCHEMA :"ctx" OWNER TO :"migrator";
GRANT CONNECT ON DATABASE :"db" TO :"migrator", :"app";
-- The Drizzle migrator runs "CREATE SCHEMA IF NOT EXISTS", which requires this privilege even if the schema exists.
GRANT CREATE ON DATABASE :"db" TO :"migrator";
GRANT USAGE ON SCHEMA :"ctx" TO :"app";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator" IN SCHEMA :"ctx"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator" IN SCHEMA :"ctx"
  GRANT USAGE, SELECT ON SEQUENCES TO :"app";
-- Existing objects too (tables created before these grants).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA :"ctx" TO :"app";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA :"ctx" TO :"app";
-- The migration history belongs to the migrations only.
SELECT format('REVOKE ALL ON TABLE %I.__migrations FROM %I', :'ctx', :'app')
  WHERE to_regclass(format('%I.__migrations', :'ctx')) IS NOT NULL \gexec
SQL
  done

  # Nobody else connects, and no service uses the public schema.
  psql -v ON_ERROR_STOP=1 --no-psqlrc --quiet --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -v db="$POSTGRES_DB" <<'SQL'
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SQL
)
