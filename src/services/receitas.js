import receitasIniciais from "../data/Receitas";

function obterReceitas() {
  const receitasSalvas =
    JSON.parse(localStorage.getItem("receitas")) || [];

  return [...receitasIniciais, ...receitasSalvas];
}

function salvarReceita(receita) {
  const receitasSalvas =
    JSON.parse(localStorage.getItem("receitas")) || [];

  receitasSalvas.push(receita);

  localStorage.setItem(
    "receitas",
    JSON.stringify(receitasSalvas)
  );
}

export {
  obterReceitas,
  salvarReceita,
};