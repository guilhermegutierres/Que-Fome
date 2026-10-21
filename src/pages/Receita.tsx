import { useEffect, useState, type ComponentProps } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import InformacaoNutricional from "../components/InformacaoNutricional";
import Navbar from "../components/Navbar";
import TagBadges from "../components/TagBadges";
import { useAuth } from "../contexts/auth-context";
import {
  alternarFavorito,
  estaFavorito,
  EVENTO_FAVORITOS_ATUALIZADOS,
} from "../services/favoritos";
import { obterReceita } from "../services/receitas";
import "./Receita.css";

const IMAGEM_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#eeeeee"/><path d="M250 590l120-130 95 100 75-75 110 105H250z" fill="#c7c7c7"/><circle cx="520" cy="350" r="55" fill="#c7c7c7"/><text x="400" y="700" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" fill="#666666">Imagem indisponível</text></svg>',
  );

type IngredienteNutricional = ComponentProps<
  typeof InformacaoNutricional
>["ingredientes"][number];

type ReceitaDetalhe = Omit<
  Awaited<ReturnType<typeof obterReceita>>,
  "ingredientes" | "modoPreparo" | "ingredientesDetalhados"
> & {
  id: string;
  titulo: string;
  categoria?: string | null;
  tags?: unknown;
  descricaoCompleta?: string | null;
  descricao?: string | null;
  tempo?: string | number | null;
  dificuldade?: string | null;
  custo?: string | null;
  autorNome?: unknown;
  imagem?: unknown;
  ingredientes?: string[];
  modoPreparo?: string[];
  ingredientesDetalhados?: IngredienteNutricional[];
};
function Receita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, carregando } = useAuth();

  const [receita, setReceita] = useState<ReceitaDetalhe | null>(null);
  const [receitaCarregadaId, setReceitaCarregadaId] = useState<
    string | null | undefined
  >(null);
  const [erroReceita, setErroReceita] = useState("");
  const [imagemComErro, setImagemComErro] = useState("");
  const [, atualizarFavoritos] = useState(0);
  const carregandoReceita = receitaCarregadaId !== id;

  useEffect(() => {
    let ativo = true;

    obterReceita(id as string)
      .then((dados) => {
        if (!ativo) return;
        setReceita(dados as unknown as ReceitaDetalhe);
        setErroReceita("");
        setImagemComErro("");
        setReceitaCarregadaId(id);
      })
      .catch((erro) => {
        if (!ativo) return;
        setReceita(null);
        setErroReceita((erro as Error).message);
        setReceitaCarregadaId(id);
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  useEffect(() => {
    function atualizar() {
      atualizarFavoritos((versao) => versao + 1);
    }

    window.addEventListener(EVENTO_FAVORITOS_ATUALIZADOS, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_FAVORITOS_ATUALIZADOS, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  const favoritado = receita ? estaFavorito(receita.id, usuario?.email) : false;

  if (carregandoReceita || erroReceita || !receita) {
    return (
      <>
        <Navbar />

        <main className="receita-page">
          <section className="receita-nao-encontrada">
            <h1>
              {carregandoReceita
                ? "Carregando receita..."
                : erroReceita
                  ? "Não foi possível carregar a receita"
                  : "Receita não encontrada"}
            </h1>
            {erroReceita && <p role="alert">{erroReceita}</p>}

            <Link to="/" className="receita-voltar">
              ← Voltar para a página inicial
            </Link>
          </section>
        </main>
      </>
    );
  }

  const imagemOriginal =
    typeof receita.imagem === "string" ? receita.imagem : "";
  const imagemIndisponivel =
    !imagemOriginal || imagemComErro === imagemOriginal;
  const autorNome =
    typeof receita.autorNome === "string" ? receita.autorNome.trim() : "";
  const ingredientes = Array.isArray(receita.ingredientes)
    ? receita.ingredientes
    : [];
  const modoPreparo = Array.isArray(receita.modoPreparo)
    ? receita.modoPreparo
    : [];
  const ingredientesNutricao = Array.isArray(receita.ingredientesDetalhados)
    ? receita.ingredientesDetalhados
    : ingredientes.map((ingrediente) => ({
        nome: ingrediente,
        quantidade: "",
      }));

  function handleFavorito() {
    if (carregando) return;
    if (!usuario) {
      navigate("/login");
      return;
    }

    alternarFavorito(receita!.id, usuario.email);
  }

  return (
    <>
      <Navbar />

      <main className="receita-page">
        <Link to="/" className="receita-voltar">
          ← Voltar
        </Link>

        <article className="receita-container">
          <div className="receita-coluna-imagem">
            <div className="receita-imagem-container">
              <img
                src={imagemIndisponivel ? IMAGEM_FALLBACK : imagemOriginal}
                alt={
                  imagemIndisponivel
                    ? `Imagem indisponível para ${receita.titulo}`
                    : receita.titulo
                }
                onError={() => setImagemComErro(imagemOriginal)}
              />
            </div>

            <InformacaoNutricional ingredientes={ingredientesNutricao} />
          </div>

          <div className="receita-conteudo">
            <span className="receita-categoria">{receita.categoria}</span>
            <TagBadges tags={receita.tags} context="detalhe" />

            <div className="receita-titulo-linha">
              <h1>{receita.titulo}</h1>
              <button
                type="button"
                className={`receita-favorito-botao${favoritado ? " favoritado" : ""}`}
                onClick={handleFavorito}
                disabled={carregando}
                aria-label={
                  favoritado
                    ? `Remover ${receita.titulo} dos favoritos`
                    : `Adicionar ${receita.titulo} aos favoritos`
                }
                aria-pressed={favoritado}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={favoritado ? "currentColor" : "none"}
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M20.8 8.8C20.8 13.7 12 20 12 20C12 20 3.2 13.7 3.2 8.8C3.2 5.9 5.3 4 7.8 4C9.6 4 11.1 5 12 6.4C12.9 5 14.4 4 16.2 4C18.7 4 20.8 5.9 20.8 8.8Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {autorNome && <p className="receita-autor">Por {autorNome}</p>}

            <p className="receita-descricao">
              {receita.descricaoCompleta || receita.descricao}
            </p>

            <div className="receita-info">
              <div>
                <span>Tempo</span>
                <strong>{receita.tempo}</strong>
              </div>

              <div>
                <span>Dificuldade</span>
                <strong>{receita.dificuldade}</strong>
              </div>

              <div>
                <span>Custo</span>
                <strong>{receita.custo || "Não informado"}</strong>
              </div>
            </div>

            <section className="receita-secao">
              <h2>Ingredientes</h2>

              {ingredientes.length > 0 ? (
                <ul className="ingredientes-lista">
                  {ingredientes.map((ingrediente, index) => (
                    <li key={index}>{ingrediente}</li>
                  ))}
                </ul>
              ) : (
                <p className="receita-lista-vazia">
                  Nenhum ingrediente informado.
                </p>
              )}
            </section>

            <section className="receita-secao">
              <h2>Modo de preparo</h2>

              {modoPreparo.length > 0 ? (
                <ol className="preparo-lista">
                  {modoPreparo.map((passo, index) => (
                    <li key={index}>
                      <div>
                        <strong>Passo {index + 1}</strong>
                        <p>{passo}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="receita-lista-vazia">
                  Modo de preparo não informado.
                </p>
              )}
            </section>
          </div>
        </article>
      </main>
    </>
  );
}

export default Receita;
