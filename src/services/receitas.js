import receitasIniciais from "../data/Receitas";

function obterReceitasSalvas() {
  return JSON.parse(localStorage.getItem("receitas")) || [];
}

function obterReceitas() {
  const receitasSalvas = obterReceitasSalvas();
  return [...receitasIniciais, ...receitasSalvas];
}

function salvarReceita(receita) {
  const receitasSalvas = obterReceitasSalvas();
  receitasSalvas.push(receita);
  localStorage.setItem("receitas", JSON.stringify(receitasSalvas));
}

function obterReceitasPorAutor(autorId) {
  if (autorId == null) return [];

  return obterReceitasSalvas().filter((receita) => receita.autorId === autorId);
}

function obterReceitaDoAutor(id, autorId) {
  if (autorId == null) return null;

  return (
    obterReceitasSalvas().find(
      (receita) => receita.id === id && receita.autorId === autorId,
    ) || null
  );
}

function atualizarReceita(id, autorId, dadosAtualizados) {
  const receitasSalvas = obterReceitasSalvas();
  const indice = receitasSalvas.findIndex(
    (receita) => receita.id === id && receita.autorId === autorId,
  );

  if (indice === -1) return false;

  const receitaAtual = receitasSalvas[indice];
  receitasSalvas[indice] = {
    ...receitaAtual,
    ...dadosAtualizados,
    id: receitaAtual.id,
    autorId: receitaAtual.autorId,
    autorNome: receitaAtual.autorNome,
  };

  localStorage.setItem("receitas", JSON.stringify(receitasSalvas));
  return true;
}

function excluirReceita(id, autorId) {
  const receitasSalvas = obterReceitasSalvas();
  const indice = receitasSalvas.findIndex(
    (receita) => receita.id === id && receita.autorId === autorId,
  );

  if (indice === -1) return false;

  receitasSalvas.splice(indice, 1);
  localStorage.setItem("receitas", JSON.stringify(receitasSalvas));
  return true;
}

export {
  obterReceitas,
  salvarReceita,
  obterReceitasPorAutor,
  obterReceitaDoAutor,
  atualizarReceita,
  excluirReceita,
};
