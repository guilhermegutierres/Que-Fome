import { GRUPOS_CATEGORIAS } from "../data/categoriasReceitas.ts";

interface IngredienteDetalhadoPesquisavel {
  nome?: unknown;
  quantidade?: unknown;
  textoExibicao?: unknown;
  tacoDescricao?: unknown;
}

interface ReceitaPesquisavel {
  titulo?: unknown;
  categoria?: unknown;
  descricao?: unknown;
  descricaoCompleta?: unknown;
  ingredientes?: unknown;
  ingredientesDetalhados?: unknown;
  modoPreparo?: unknown;
  tags?: unknown;
}

function normalizarTexto(texto: unknown): string {
  return String(texto ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function obterTextoPesquisavel(
  receita: ReceitaPesquisavel | null | undefined,
): string {
  const textos: unknown[] = [
    receita?.titulo,
    receita?.categoria,
    receita?.descricao,
    receita?.descricaoCompleta,
    ...(Array.isArray(receita?.ingredientes)
      ? (receita?.ingredientes as unknown[])
      : []),
    ...(Array.isArray(receita?.ingredientesDetalhados)
      ? (receita?.ingredientesDetalhados as unknown[]).flatMap(
          (ingrediente: unknown) =>
          typeof ingrediente === "string"
            ? [ingrediente]
            : [
                (
                  ingrediente as
                    | IngredienteDetalhadoPesquisavel
                    | null
                    | undefined
                )?.nome,
                (
                  ingrediente as
                    | IngredienteDetalhadoPesquisavel
                    | null
                    | undefined
                )?.quantidade,
                (
                  ingrediente as
                    | IngredienteDetalhadoPesquisavel
                    | null
                    | undefined
                )?.textoExibicao,
                (
                  ingrediente as
                    | IngredienteDetalhadoPesquisavel
                    | null
                    | undefined
                )?.tacoDescricao,
              ],
        )
      : []),
    ...(Array.isArray(receita?.modoPreparo)
      ? (receita?.modoPreparo as unknown[])
      : []),
    ...(Array.isArray(receita?.tags) ? (receita?.tags as unknown[]) : []),
  ];

  return normalizarTexto(textos.filter(Boolean).join(" "));
}

function receitaCorrespondeBusca(
  receita: ReceitaPesquisavel | null | undefined,
  termo: unknown,
): boolean {
  const buscaNormalizada = normalizarTexto(termo).trim();
  return (
    !buscaNormalizada ||
    obterTextoPesquisavel(receita).includes(buscaNormalizada)
  );
}

function receitaCorrespondeCategoria(
  receita: ReceitaPesquisavel | null | undefined,
  categoria: unknown,
): boolean {
  const categoriaNormalizada = normalizarTexto(categoria).trim();
  if (!categoriaNormalizada) return true;

  const categoriaReceita = normalizarTexto(receita?.categoria).trim();
  const grupo = GRUPOS_CATEGORIAS[categoriaNormalizada];
  const categoriasCorrespondentes = grupo || [categoria];

  return categoriasCorrespondentes.some(
    (item) => normalizarTexto(item).trim() === categoriaReceita,
  );
}

export {
  normalizarTexto,
  obterTextoPesquisavel,
  receitaCorrespondeBusca,
  receitaCorrespondeCategoria,
};
