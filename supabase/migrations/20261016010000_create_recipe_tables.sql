CREATE TABLE public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'usuario'
    CHECK (tipo IN ('oficial', 'usuario')),
  autor_id UUID REFERENCES public.profiles (id) ON DELETE CASCADE,
  titulo TEXT NOT NULL
    CHECK (char_length(pg_catalog.btrim(titulo)) BETWEEN 1 AND 150),
  categoria TEXT NOT NULL
    CHECK (char_length(pg_catalog.btrim(categoria)) > 0),
  descricao TEXT NOT NULL DEFAULT '',
  descricao_completa TEXT NOT NULL DEFAULT '',
  tempo_minutos INTEGER NOT NULL CHECK (tempo_minutos > 0),
  dificuldade TEXT NOT NULL
    CHECK (dificuldade IN ('Muito fácil', 'Fácil', 'Médio', 'Difícil')),
  custo TEXT
    CHECK (custo IS NULL OR custo IN ('Baixo', 'Médio', 'Alto')),
  imagem_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT receitas_tipo_autor_consistente CHECK (
    (tipo = 'oficial' AND autor_id IS NULL)
    OR (tipo = 'usuario' AND autor_id IS NOT NULL)
  )
);

CREATE TABLE public.receita_ingredientes (
  receita_id UUID NOT NULL
    REFERENCES public.receitas (id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL CHECK (ordem > 0),
  nome TEXT NOT NULL
    CHECK (char_length(pg_catalog.btrim(nome)) > 0),
  quantidade TEXT NOT NULL
    CHECK (char_length(pg_catalog.btrim(quantidade)) > 0),
  taco_id INTEGER
    REFERENCES public.alimentos (taco_id) ON DELETE SET NULL,
  gramas NUMERIC(12, 3)
    CHECK (
      gramas IS NULL
      OR (
        gramas > 0
        AND gramas <> 'NaN'::NUMERIC
        AND gramas <> 'Infinity'::NUMERIC
        AND gramas <> '-Infinity'::NUMERIC
      )
    ),
  CONSTRAINT receita_ingredientes_taco_exige_gramas
    CHECK (taco_id IS NULL OR gramas IS NOT NULL),
  PRIMARY KEY (receita_id, ordem)
);

CREATE TABLE public.receita_etapas (
  receita_id UUID NOT NULL
    REFERENCES public.receitas (id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL CHECK (ordem > 0),
  instrucao TEXT NOT NULL
    CHECK (char_length(pg_catalog.btrim(instrucao)) > 0),
  PRIMARY KEY (receita_id, ordem)
);

CREATE INDEX idx_receitas_autor_created_at
  ON public.receitas (autor_id, created_at DESC);

CREATE INDEX idx_receitas_categoria
  ON public.receitas (categoria);

CREATE INDEX idx_receitas_tempo_minutos
  ON public.receitas (tempo_minutos);

CREATE INDEX idx_receita_ingredientes_taco_id
  ON public.receita_ingredientes (taco_id)
  WHERE taco_id IS NOT NULL;

CREATE FUNCTION public.set_receitas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_receitas_updated_at()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER receitas_set_updated_at
  BEFORE UPDATE ON public.receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_receitas_updated_at();

ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_etapas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.receitas
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.receita_ingredientes
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.receita_etapas
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.receitas IS
  'Receitas oficiais e de usuários; acesso realizado exclusivamente pela API NestJS.';
COMMENT ON COLUMN public.receitas.tipo IS
  'Classifica a receita como oficial do Que-Fome ou criada por usuário.';
COMMENT ON COLUMN public.receitas.autor_id IS
  'UUID do perfil autenticado para receitas de usuário; nulo para receitas oficiais.';
COMMENT ON COLUMN public.receitas.updated_at IS
  'Atualizado automaticamente pelo trigger receitas_set_updated_at.';
COMMENT ON COLUMN public.receitas.imagem_path IS
  'Caminho futuro do objeto no Supabase Storage; não armazena Data URL ou Base64.';
COMMENT ON TABLE public.receita_ingredientes IS
  'Ingredientes ordenados da receita; o vínculo TACO é opcional.';
COMMENT ON COLUMN public.receita_ingredientes.taco_id IS
  'Identificador taco_id de public.alimentos; nunca recebe IDs de APIs externas.';
COMMENT ON COLUMN public.receita_ingredientes.gramas IS
  'Peso positivo e finito usado no cálculo nutricional quando o ingrediente estiver vinculado à TACO.';
COMMENT ON TABLE public.receita_etapas IS
  'Etapas ordenadas do modo de preparo da receita.';
