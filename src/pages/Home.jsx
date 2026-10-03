import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReceitaCard from "../components/ReceitaCard";
import Select from "../components/Select";
import imagemSalada from "../assets/home/salada-hero.jpg";
import imagemChurrasco from "../assets/home/churrasco-hero.jpg";
import imagemFrutosDoMar from "../assets/home/frutos-do-mar-hero.jpg";
import { obterReceitas } from "../services/receitas";
import "./Home.css";

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function converterTempoParaMinutos(tempo) {
  const valor = String(tempo || "").trim().toLowerCase();
  const minutos = valor.match(/^(\d+)\s*min$/);
  if (minutos) return Number(minutos[1]);

  const horas = valor.match(/^(\d+)\s*h$/);
  if (horas) return Number(horas[1]) * 60;

  return null;
}

function obterIndiceAleatorio(tamanho) {
  return Math.floor(Math.random() * tamanho);
}

function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const busca = searchParams.get("busca") || "";
  const categoriaSelecionada = searchParams.get("categoria") || "";
  const tempoSelecionado = searchParams.get("tempo") || "";
  const custoSelecionado = searchParams.get("custo") || "";
  const dificuldadeSelecionada = searchParams.get("dificuldade") || "";
  const chaveFiltros = JSON.stringify([
    busca,
    categoriaSelecionada,
    tempoSelecionado,
    custoSelecionado,
    dificuldadeSelecionada,
  ]);
  const [sorteio, setSorteio] = useState(null);
  const [slideAtual, setSlideAtual] = useState(0);
  const imagensHero = [
    {
      src: imagemSalada,
      alt: "Salada colorida servida em um prato branco",
    },
    {
      src: imagemChurrasco,
      alt: "Carnes grelhadas fatiadas sobre uma tábua com alecrim",
    },
    {
      src: imagemFrutosDoMar,
      alt: "Frutos do mar grelhados servidos sobre uma tábua",
    },
  ];

  function navegarSlide(direcao) {
    setSlideAtual(
      (atual) => (atual + direcao + imagensHero.length) % imagensHero.length,
    );
  }

  function atualizarParametro(nome, valor) {
    setSearchParams(
      (atuais) => {
        const proximos = new URLSearchParams(atuais);
        if (valor) proximos.set(nome, valor);
        else proximos.delete(nome);
        return proximos;
      },
      { replace: true },
    );
  }

  const receitas = obterReceitas();

  const termo = normalizarTexto(busca.trim());

  const receitasFiltradas = receitas.filter((receita) => {
    const correspondeCategoria =
      !categoriaSelecionada ||
      normalizarTexto(receita.categoria) ===
        normalizarTexto(categoriaSelecionada);

    const titulo = normalizarTexto(receita.titulo);

    const descricao = normalizarTexto(receita.descricao || "");

    const ingredientes = normalizarTexto(receita.ingredientes.join(" "));

    const correspondeBusca =
      !termo ||
      titulo.includes(termo) ||
      descricao.includes(termo) ||
      ingredientes.includes(termo);

    const tempoEmMinutos = converterTempoParaMinutos(receita.tempo);
    const correspondeTempo =
      !tempoSelecionado ||
      (tempoEmMinutos !== null &&
        (tempoSelecionado === "mais-60"
          ? tempoEmMinutos > 60
          : tempoEmMinutos <= Number(tempoSelecionado)));
    const correspondeCusto =
      !custoSelecionado || receita.custo === custoSelecionado;
    const correspondeDificuldade =
      !dificuldadeSelecionada ||
      receita.dificuldade === dificuldadeSelecionada;

    return (
      correspondeCategoria &&
      correspondeBusca &&
      correspondeTempo &&
      correspondeCusto &&
      correspondeDificuldade
    );
  });

  const receitaSorteadaId =
    sorteio?.chaveFiltros === chaveFiltros ? sorteio.id : null;
  const receitaSorteada = receitasFiltradas.find(
    (receita) => receita.id === receitaSorteadaId,
  );

  function sortearReceita() {
    if (receitasFiltradas.length === 0) return;

    const opcoesSorteio =
      receitasFiltradas.length > 1 && receitaSorteada
        ? receitasFiltradas.filter(
            (receita) => receita.id !== receitaSorteada.id,
          )
        : receitasFiltradas;
    const indiceSorteado = obterIndiceAleatorio(opcoesSorteio.length);

    setSorteio({ id: opcoesSorteio[indiceSorteado].id, chaveFiltros });
  }

  const possuiFiltro =
    termo !== "" ||
    categoriaSelecionada !== "" ||
    tempoSelecionado !== "" ||
    custoSelecionado !== "" ||
    dificuldadeSelecionada !== "";

  const filtrosAtivos = [];
  if (busca.trim()) {
    filtrosAtivos.push({ parametro: "busca", rotulo: `Busca: ${busca.trim()}` });
  }
  if (categoriaSelecionada) {
    filtrosAtivos.push({
      parametro: "categoria",
      rotulo: categoriaSelecionada,
    });
  }
  if (tempoSelecionado) {
    const opcoesTempo = {
      10: "Até 10 min",
      20: "Até 20 min",
      30: "Até 30 min",
      60: "Até 60 min",
      "mais-60": "Mais de 60 min",
    };
    filtrosAtivos.push({
      parametro: "tempo",
      rotulo: opcoesTempo[tempoSelecionado] || `Tempo: ${tempoSelecionado}`,
    });
  }
  if (custoSelecionado) {
    filtrosAtivos.push({ parametro: "custo", rotulo: custoSelecionado });
  }
  if (dificuldadeSelecionada) {
    filtrosAtivos.push({
      parametro: "dificuldade",
      rotulo: dificuldadeSelecionada,
    });
  }

  function limparFiltros() {
    setSearchParams(
      (atuais) => {
        const proximos = new URLSearchParams(atuais);
        proximos.delete("busca");
        proximos.delete("categoria");
        proximos.delete("tempo");
        proximos.delete("custo");
        proximos.delete("dificuldade");
        return proximos;
      },
      { replace: true },
    );
  }

  return (
    <>
      <Navbar
        busca={busca}
        onBuscaChange={(termo) => atualizarParametro("busca", termo)}
        onCategoriaChange={(categoria) =>
          atualizarParametro("categoria", categoria)
        }
      />

      <div
        className="home-carrossel"
        role="region"
        aria-label="Fotografias de gastronomia"
      >
        <img
          key={imagensHero[slideAtual].src}
          className="home-carrossel-imagem"
          src={imagensHero[slideAtual].src}
          alt={imagensHero[slideAtual].alt}
        />
        <button
          className="home-carrossel-seta home-carrossel-anterior"
          type="button"
          aria-label="Mostrar imagem anterior"
          onClick={() => navegarSlide(-1)}
        >
          ‹
        </button>
        <button
          className="home-carrossel-seta home-carrossel-proximo"
          type="button"
          aria-label="Mostrar próxima imagem"
          onClick={() => navegarSlide(1)}
        >
          ›
        </button>
        <div className="home-carrossel-indicadores" aria-label="Selecionar imagem">
          {imagensHero.map((imagem, indice) => (
            <button
              key={imagem.src}
              className={`home-carrossel-indicador${
                indice === slideAtual ? " ativo" : ""
              }`}
              type="button"
              aria-label={`Mostrar imagem ${indice + 1}`}
              aria-current={indice === slideAtual ? "true" : undefined}
              onClick={() => setSlideAtual(indice)}
            />
          ))}
        </div>
      </div>

      <main className="home">
        <section
          className="home-abertura"
          aria-label="Encontre sua próxima receita"
        >
          <section className="home-header">
            <h1>Encontre sua próxima receita</h1>
            <p>Explore receitas simples, deliciosas e para todos os momentos.</p>
            <button
              className="sortear-receita-botao"
              type="button"
              onClick={sortearReceita}
              disabled={receitasFiltradas.length === 0}
            >
              Sortear uma receita
            </button>

            {receitaSorteada && (
              <div className="sugestao-banner" aria-live="polite">
                <button
                  className="sugestao-banner-fechar"
                  type="button"
                  aria-label="Fechar sugestão de receita"
                  onClick={() => setSorteio(null)}
                >
                  ×
                </button>
                <span className="sugestao-banner-etiqueta">
                  Sortear para você
                </span>
                <h4>{receitaSorteada.titulo}</h4>
                <p>
                  {receitaSorteada.categoria} • {receitaSorteada.tempo} •{" "}
                  {receitaSorteada.dificuldade}
                  {receitaSorteada.custo && ` • ${receitaSorteada.custo}`}
                </p>
                <Link
                  className="receita-sorteada-link"
                  to={`/receita/${receitaSorteada.id}`}
                >
                  Ver receita
                </Link>
              </div>
            )}
          </section>
        </section>

        <section className="receitas-section">
          <div className="receitas-section-titulo">
            <h2>
              {possuiFiltro ? "Resultados da busca" : "Receitas em destaque"}
            </h2>
          </div>

          <div className="receitas-section-topo">
            <div>
              {filtrosAtivos.length > 0 && (
                <div className="filtros-ativos" aria-label="Filtros ativos">
                  <span className="filtros-ativos-titulo">Filtros ativos:</span>
                  <div className="filtros-ativos-lista">
                    {filtrosAtivos.map(({ parametro, rotulo }) => (
                      <button
                        className="filtro-ativo-chip"
                        key={parametro}
                        type="button"
                        aria-label={`Remover filtro ${rotulo}`}
                        onClick={() => atualizarParametro(parametro, "")}
                      >
                        <span>{rotulo}</span>
                        <span className="filtro-ativo-remover" aria-hidden="true">
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="receitas-filtros">
                <span className="receitas-filtros-titulo">Filtrar por:</span>
                <div className="receitas-filtros-controles">
                  <div className="receitas-filtro-item">
                    <label htmlFor="filtro-tempo">Tempo de preparo</label>
                    <Select
                      id="filtro-tempo"
                      value={tempoSelecionado}
                      placeholder="Todos"
                      onChange={(valor) => atualizarParametro("tempo", valor)}
                      options={[
                        { value: "10", label: "Até 10 min" },
                        { value: "20", label: "Até 20 min" },
                        { value: "30", label: "Até 30 min" },
                        { value: "60", label: "Até 60 min" },
                        { value: "mais-60", label: "Mais de 60 min" },
                      ]}
                    />
                  </div>
                  <div className="receitas-filtro-item">
                    <label htmlFor="filtro-custo">Custo</label>
                    <Select
                      id="filtro-custo"
                      value={custoSelecionado}
                      placeholder="Todos"
                      onChange={(valor) => atualizarParametro("custo", valor)}
                      options={[
                        { value: "Baixo", label: "Baixo" },
                        { value: "Médio", label: "Médio" },
                        { value: "Alto", label: "Alto" },
                      ]}
                    />
                  </div>
                  <div className="receitas-filtro-item">
                    <label htmlFor="filtro-dificuldade">Dificuldade</label>
                    <Select
                      id="filtro-dificuldade"
                      value={dificuldadeSelecionada}
                      placeholder="Todos"
                      onChange={(valor) =>
                        atualizarParametro("dificuldade", valor)
                      }
                      options={[
                        { value: "Muito fácil", label: "Muito fácil" },
                        { value: "Fácil", label: "Fácil" },
                        { value: "Médio", label: "Médio" },
                        { value: "Difícil", label: "Difícil" },
                      ]}
                    />
                  </div>
                  <button
                    className="limpar-filtros-home"
                    type="button"
                    onClick={limparFiltros}
                    disabled={!possuiFiltro}
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>
            </div>

            <span>
              {receitasFiltradas.length}{" "}
              {receitasFiltradas.length === 1 ? "receita" : "receitas"}
            </span>
          </div>

          {receitasFiltradas.length > 0 ? (
            <div className="receitas-grid">
              {receitasFiltradas.map((receita) => (
                <ReceitaCard key={receita.id} receita={receita} />
              ))}
            </div>
          ) : (
            <div className="sem-resultados">
              <h2>Nenhuma receita encontrada</h2>

              <p>
                Tente ajustar a busca, a categoria, o tempo, o custo ou a
                dificuldade.
              </p>

              <button type="button" onClick={limparFiltros}>
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
