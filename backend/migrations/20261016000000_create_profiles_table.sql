CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nome TEXT NOT NULL CHECK (char_length(pg_catalog.btrim(nome)) BETWEEN 1 AND 100),
  avatar_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

REVOKE ALL ON TABLE public.profiles FROM PUBLIC;

CREATE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  display_name TEXT;
BEGIN
  display_name := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'nome'), '');
  IF display_name IS NULL THEN
    display_name := 'Usuário';
  END IF;

  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, pg_catalog.left(display_name, 100))
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_profile_for_new_user()
  FROM PUBLIC;

CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();

CREATE FUNCTION public.set_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_profile_updated_at()
  FROM PUBLIC;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_updated_at();

INSERT INTO public.profiles (id, nome)
SELECT
  users.id,
  pg_catalog.left(
    COALESCE(
      NULLIF(pg_catalog.btrim(users.raw_user_meta_data ->> 'nome'), ''),
      'Usuário'
    ),
    100
  )
FROM auth.users AS users
ON CONFLICT (id) DO NOTHING;
