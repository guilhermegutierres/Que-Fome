import { useState } from "react";
import Navbar from "../components/Navbar";
import ReceitaCard from "../components/ReceitaCard";
import { obterReceitas } from "../services/receitas";
import "./Home.css";

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function Home() {
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("");

  const receitas = obterReceitas();

  const termo = normalizarTexto(busca);

  const receitasFiltradas = receitas.filter((receita) => {
    const correspondeCategoria =
      !categoriaSelecionada ||
      normalizarTexto(receita.categoria) ===
        normalizarTexto(categoriaSelecionada);

    const titulo = normalizarTexto(receita.titulo);

    const descricao = normalizarTexto(
      receita.descricao || ""
    );

    const ingredientes = normalizarTexto(
      receita.ingredientes.join(" ")
    );

    const correspondeBusca =
      !termo ||
      titulo.includes(termo) ||
      descricao.includes(termo) ||
      ingredientes.includes(termo);

    return (
      correspondeCategoria &&
      correspondeBusca
    );
  });

  const possuiFiltro =
    busca.trim() !== "" ||
    categoriaSelecionada !== "";

  function limparFiltros() {
    setBusca("");
    setCategoriaSelecionada("");
  }

  return (
    <>
      <Navbar
        busca={busca}
        onBuscaChange={setBusca}
        onCategoriaChange={
          setCategoriaSelecionada
        }
      />

      <main className="home">
        <section className="home-header">
          <h1>Encontre sua próxima receita</h1>

          <p>
            Explore receitas simples, deliciosas e para todos os momentos.
          </p>
        </section>

        <section className="receitas-section">
          <div className="receitas-section-topo">
            <div>
              <h2>
                {possuiFiltro
                  ? "Resultados da busca"
                  : "Receitas em destaque"}
              </h2>

              {categoriaSelecionada && (
                <span className="filtro-atual">
                  Categoria: {categoriaSelecionada}
                </span>
              )}
            </div>

            <span>
              {receitasFiltradas.length}{" "}
              {receitasFiltradas.length === 1
                ? "receita"
                : "receitas"}
            </span>
          </div>

          {receitasFiltradas.length > 0 ? (
            <div className="receitas-grid">
              {receitasFiltradas.map((receita) => (
                <ReceitaCard
                  key={receita.id}
                  receita={receita}
                />
              ))}
            </div>
          ) : (
            <div className="sem-resultados">
              <h2>Nenhuma receita encontrada</h2>

              <p>
                Tente buscar por outro nome, ingrediente ou categoria.
              </p>

              <button
                type="button"
                onClick={limparFiltros}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default Home;