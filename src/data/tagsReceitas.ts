import recipeTags from "../../backend/data/tags-receitas.json" with { type: "json" };

interface TagReceita {
  id: string;
  label: string;
}

interface AtalhoTag {
  id: string;
  label: string;
  tags: string[];
}

interface ConfiguracaoTags {
  tags: TagReceita[];
  atalhos: AtalhoTag[];
  aliases: Record<string, string>;
}

const configuracaoTags: ConfiguracaoTags = recipeTags;
const TAGS_RECEITAS: TagReceita[] = configuracaoTags.tags;
const TAGS_POR_ID = new Map<string, TagReceita>(
  TAGS_RECEITAS.map((tag) => [tag.id, tag]),
);
const ATALHOS_TAGS = new Map<string, AtalhoTag>(
  configuracaoTags.atalhos.map((atalho) => [atalho.id, atalho]),
);

function criarSlugTag(tagId: unknown): string {
  return String(tagId ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizarTagId(tagId: unknown): string {
  const slug = criarSlugTag(tagId);
  return configuracaoTags.aliases[slug] || slug;
}

function obterNomeTag(tagId: string): string {
  return TAGS_POR_ID.get(tagId)?.label || tagId;
}

function obterTagShortcut(tagId: unknown): AtalhoTag | null {
  const slug = criarSlugTag(tagId);
  return (
    ATALHOS_TAGS.get(slug) || ATALHOS_TAGS.get(normalizarTagId(slug)) || null
  );
}

function receitaCorrespondeTags(
  receita: { tags?: unknown } | null | undefined,
  tagFiltro: unknown,
): boolean {
  if (!tagFiltro) return true;
  const shortcut = obterTagShortcut(tagFiltro);
  const tagsFiltro = shortcut?.tags || [normalizarTagId(tagFiltro)];
  const tagsReceita: unknown[] = Array.isArray(receita?.tags)
    ? receita.tags
    : [];
  return tagsReceita.some((tag) =>
    tagsFiltro.includes(normalizarTagId(tag)),
  );
}

function obterRotuloFiltroTag(tagFiltro: unknown): string {
  const shortcut = obterTagShortcut(tagFiltro);
  return shortcut?.label || obterNomeTag(normalizarTagId(tagFiltro));
}

function atualizarParametrosTag(
  parametros: URLSearchParams,
  tag: unknown,
): URLSearchParams {
  const proximos = new URLSearchParams(parametros);
  const valor = criarSlugTag(tag);
  if (valor) {
    proximos.set("tag", valor);
  } else {
    proximos.delete("tag");
  }
  return proximos;
}

export {
  ATALHOS_TAGS,
  TAGS_RECEITAS,
  normalizarTagId,
  obterNomeTag,
  obterRotuloFiltroTag,
  obterTagShortcut,
  atualizarParametrosTag,
  receitaCorrespondeTags,
};
