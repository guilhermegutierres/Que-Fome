import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { obterReceitas } from "../services/receitas";
import "./Receita.css";

function Receita() {
  const { id } = useParams();

  const receitas = obterReceitas();

  const receita = receitas.find(
    (item) => item.id === Number(id)
  );

  if (!receita) {
    return (
      <>
        <Navbar />

        <main className="receita-page">
          <section className="receita-nao-encontrada">
            <h1>Receita não encontrada</h1>

            <Link
              to="/"
              className="receita-voltar"
            >
              ← Voltar para a página inicial
            </Link>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="receita-page">
        <Link
          to="/"
          className="receita-voltar"
        >
          ← Voltar
        </Link>

        <article className="receita-container">
          <div className="receita-imagem-container">
            <img
              src={receita.imagem}
              alt={receita.titulo}
            />
          </div>

          <div className="receita-conteudo">
            <span className="receita-categoria">
              {receita.categoria}
            </span>

            <h1>{receita.titulo}</h1>

            <p className="receita-descricao">
              {receita.descricaoCompleta ||
                receita.descricao}
            </p>

            <div className="receita-info">
              <div>
                <span>Tempo</span>
                <strong>
                  {receita.tempo}
                </strong>
              </div>

              <div>
                <span>Dificuldade</span>
                <strong>
                  {receita.dificuldade}
                </strong>
              </div>

              <div>
                <span>Custo</span>
                <strong>
                  {receita.custo || "Não informado"}
                </strong>
              </div>
            </div>

            <section className="receita-secao">
              <h2>Ingredientes</h2>

              <ul className="ingredientes-lista">
                {receita.ingredientes.map(
                  (ingrediente, index) => (
                    <li key={index}>
                      {ingrediente}
                    </li>
                  )
                )}
              </ul>
            </section>

            <section className="receita-secao">
              <h2>Modo de preparo</h2>

              <ol className="preparo-lista">
                {receita.modoPreparo.map(
                  (passo, index) => (
                    <li key={index}>
                      <div>
                        <strong>
                          Passo {index + 1}
                        </strong>

                        <p>{passo}</p>
                      </div>
                    </li>
                  )
                )}
              </ol>
            </section>
          </div>
        </article>
      </main>
    </>
  );
}

export default Receita;