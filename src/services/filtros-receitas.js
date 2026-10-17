import { GRUPOS_CATEGORIAS } from "../data/categoriasReceitas.js";

function normalizarTexto(texto) {
  return String(texto ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function obterTextoPesquisavel(receita) {
  const textos = [
    receita?.titulo,
    receita?.categoria,
    receita?.descricao,
    receita?.descricaoCompleta,
    ...(Array.isArray(receita?.ingredientes) ? receita.ingredientes : []),
    ...(Array.isArray(receita?.ingredientesDetalhados)
      ? receita.ingredientesDetalhados.flatMap((ingrediente) =>
          typeof ingrediente === "string"
            ? [ingrediente]
            : [
                ingrediente?.nome,
                ingrediente?.quantidade,
                ingrediente?.textoExibicao,
                ingrediente?.tacoDescricao,
              ],
        )
      : []),
    ...(Array.isArray(receita?.modoPreparo) ? receita.modoPreparo : []),
    ...(Array.isArray(receita?.tags) ? receita.tags : []),
  ];

  return normalizarTexto(textos.filter(Boolean).join(" "));
}

function receitaCorrespondeBusca(receita, termo) {
  const buscaNormalizada = normalizarTexto(termo).trim();
  return (
    !buscaNormalizada ||
    obterTextoPesquisavel(receita).includes(buscaNormalizada)
  );
}

function receitaCorrespondeCategoria(receita, categoria) {
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
