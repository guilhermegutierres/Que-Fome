import recipeTags from "../../data/tags-receitas.json" with { type: "json" };

export const RECIPE_TAGS = recipeTags.tags;
export const RECIPE_TAG_IDS = RECIPE_TAGS.map((tag) => tag.id);

export function normalizarTagReceita(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return recipeTags.aliases[slug as keyof typeof recipeTags.aliases] ?? slug;
}

export function normalizarTagsReceita(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((tag) =>
    typeof tag === "string" ? normalizarTagReceita(tag) : tag,
  );
}
