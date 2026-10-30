-- Proposta opcional: não necessária para corrigir login/cadastro.
-- Aplicar como administrador em que_fome_db, após revisar os privilégios.
-- Não altera linhas, senhas, proprietários ou a conexão atual da aplicação.
-- O trigger create_profile_for_new_user deve continuar SECURITY DEFINER.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'que_fome_db' THEN
    RAISE EXCEPTION 'Banco incorreto: execute em que_fome_db';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'que_fome_runtime') THEN
    CREATE ROLE que_fome_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;
GRANT CONNECT ON DATABASE que_fome_db TO que_fome_runtime;
GRANT USAGE ON SCHEMA public, auth, extensions TO que_fome_runtime;
GRANT SELECT (id, email, encrypted_password, deleted_at, banned_until)
  ON auth.users TO que_fome_runtime;
GRANT INSERT (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_sso_user, is_anonymous, created_at, updated_at)
  ON auth.users TO que_fome_runtime;
GRANT INSERT (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  ON auth.identities TO que_fome_runtime;
GRANT SELECT ON public.profiles, public.alimentos TO que_fome_runtime;
GRANT UPDATE (nome) ON public.profiles TO que_fome_runtime;
GRANT SELECT, INSERT, DELETE ON public.app_sessions TO que_fome_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.receitas, public.receita_ingredientes, public.receita_etapas
  TO que_fome_runtime;
GRANT EXECUTE ON FUNCTION extensions.crypt(text, text), extensions.gen_salt(text, integer)
  TO que_fome_runtime;
COMMIT;
-- Depois, criar um LOGIN separado no pgAdmin, sem privilégios administrativos,
-- definir sua senha pela interface e executar:
-- GRANT que_fome_runtime TO que_fome_app;
-- Atualizar DATABASE_URL manualmente e reiniciar o backend.
-- O papel de execução não precisa escrever em alimentos nem usar sua sequência.
