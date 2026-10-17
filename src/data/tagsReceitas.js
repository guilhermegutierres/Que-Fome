import recipeTags from "../../backend/data/tags-receitas.json" with { type: "json" };

const TAGS_RECEITAS = recipeTags.tags;
const TAGS_POR_ID = new Map(TAGS_RECEITAS.map((tag) => [tag.id, tag]));
const ATALHOS_TAGS = new Map(
  recipeTags.atalhos.map((atalho) => [atalho.id, atalho]),
);

function criarSlugTag(tagId) {
  return String(tagId ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizarTagId(tagId) {
  const slug = criarSlugTag(tagId);
  return recipeTags.aliases[slug] || slug;
}

function obterNomeTag(tagId) {
  return TAGS_POR_ID.get(tagId)?.label || tagId;
}

function obterTagShortcut(tagId) {
  const slug = criarSlugTag(tagId);
  return (
    ATALHOS_TAGS.get(slug) || ATALHOS_TAGS.get(normalizarTagId(slug)) || null
  );
}

function receitaCorrespondeTags(receita, tagFiltro) {
  if (!tagFiltro) return true;
  const shortcut = obterTagShortcut(tagFiltro);
  const tagsFiltro = shortcut?.tags || [normalizarTagId(tagFiltro)];
  const tagsReceita = Array.isArray(receita?.tags) ? receita.tags : [];
  return tagsReceita.some((tag) => tagsFiltro.includes(normalizarTagId(tag)));
}

function obterRotuloFiltroTag(tagFiltro) {
  const shortcut = obterTagShortcut(tagFiltro);
  return shortcut?.label || obterNomeTag(normalizarTagId(tagFiltro));
}

function atualizarParametrosTag(parametros, tag) {
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
