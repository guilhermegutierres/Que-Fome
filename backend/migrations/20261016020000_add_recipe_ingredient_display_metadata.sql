ALTER TABLE public.receita_ingredientes
  ADD COLUMN texto_exibicao TEXT;

ALTER TABLE public.receita_ingredientes
  ADD COLUMN gramas_estimadas BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.receitas
  ADD COLUMN porcoes INTEGER;

ALTER TABLE public.receitas
  ADD CONSTRAINT receitas_porcoes_positivas
  CHECK (porcoes IS NULL OR porcoes > 0);

ALTER TABLE public.receita_ingredientes
  ADD CONSTRAINT receita_ingredientes_texto_exibicao_nao_vazio
  CHECK (
    texto_exibicao IS NULL
    OR pg_catalog.char_length(pg_catalog.btrim(texto_exibicao)) > 0
  );

ALTER TABLE public.receita_ingredientes
  ADD CONSTRAINT receita_ingredientes_estimativa_exige_gramas
  CHECK (NOT gramas_estimadas OR gramas IS NOT NULL);

COMMENT ON COLUMN public.receita_ingredientes.texto_exibicao IS
  'Texto original para apresentação do ingrediente, preservando expressões e ordem das palavras da fonte.';
COMMENT ON COLUMN public.receita_ingredientes.gramas_estimadas IS
  'Indica que o peso em gramas foi estimado a partir da quantidade culinária e não informado explicitamente na receita.';
COMMENT ON COLUMN public.receitas.porcoes IS
  'Rendimento da receita em porções; quando informado, deve ser um inteiro positivo.';
