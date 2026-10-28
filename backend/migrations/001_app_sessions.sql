-- Execute UMA VEZ em que_fome_db no pgAdmin, antes de iniciar o novo backend.
-- Nao modifica auth.users, profiles ou receitas.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'que_fome_db' THEN
    RAISE EXCEPTION 'Banco incorreto: execute em que_fome_db';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.app_sessions (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON public.app_sessions (user_id);
CREATE INDEX IF NOT EXISTS app_sessions_expiration_idx ON public.app_sessions (expires_at);
COMMIT;
