ALTER TABLE public.receitas
  ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.receitas.tags IS
  'Tags canônicas para busca e organização; validadas pelo backend NestJS.';
