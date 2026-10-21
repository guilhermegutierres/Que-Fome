import { useEffect, useState, type ComponentProps } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReceitaCard from "../components/ReceitaCard";
import { useAuth } from "../contexts/auth-context";
import { excluirReceita, obterReceitasPorAutor } from "../services/receitas";
import "./Perfil.css";

type ReceitaPerfil = Awaited<ReturnType<typeof obterReceitasPorAutor>>[number];
type ReceitaParaExcluir = ComponentProps<typeof ReceitaCard>["receita"];

function Perfil() {
  const { usuario, carregando } = useAuth();
  const [receitas, setReceitas] = useState<ReceitaPerfil[]>([]);
  const [revisaoReceitas, setRevisaoReceitas] = useState(0);
  const [chaveReceitasCarregadas, setChaveReceitasCarregadas] = useState("");
  const [erro, setErro] = useState("");
  const usuarioId = usuario?.id;
  const chaveCarregamento = `${usuarioId || ""}:${revisaoReceitas}`;
  const carregandoReceitas =
    Boolean(usuarioId) && chaveReceitasCarregadas !== chaveCarregamento;

  useEffect(() => {
    if (!usuarioId) return undefined;

    let ativo = true;
    obterReceitasPorAutor()
      .then((dados) => {
        if (!ativo) return;
        setReceitas(dados);
        setErro("");
        setChaveReceitasCarregadas(chaveCarregamento);
      })
      .catch((falha) => {
        if (!ativo) return;
        setReceitas([]);
        setErro((falha as Error).message);
        setChaveReceitasCarregadas(chaveCarregamento);
      });

    return () => {
      ativo = false;
    };
  }, [usuarioId, chaveCarregamento]);

  async function excluir(receita: ReceitaParaExcluir) {
    if (receita.tipo !== "usuario" || receita.autorId !== usuarioId) {
      setErro("Somente suas próprias receitas podem ser excluídas.");
      return;
    }
    const confirmou = window.confirm(
      `Deseja realmente excluir a receita "${receita.titulo}"?`,
    );
    if (!confirmou) return;

    try {
      await excluirReceita(receita.id as string);
      setReceitas((atuais) => atuais.filter((item) => item.id !== receita.id));
      setErro("");
    } catch (falha) {
      setErro(
        (falha as Error).message || "Não foi possível excluir esta receita.",
      );
    }
  }

  if (carregando) {
    return (
      <>
        <Navbar />
        <main className="perfil-page">
          <section className="perfil-estado">
            <p>Carregando sessão...</p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="perfil-page">
        {!usuario ? (
          <section className="perfil-estado">
            <h1>Perfil do usuário</h1>
            <p>Entre na sua conta para acessar seu perfil e suas receitas.</p>
            <Link to="/login" className="perfil-botao">
              Entrar
            </Link>
          </section>
        ) : (
          <>
            <h1 className="perfil-titulo">Meu perfil</h1>
            <section className="perfil-dados">
              <span className="usuario-icone perfil-icone" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M4 21C4.8 16.9 7.4 15 12 15C16.6 15 19.2 16.9 20 21"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div>
                <p className="perfil-nome">{usuario.nome}</p>
                <p className="perfil-email">{usuario.email}</p>
              </div>
            </section>

            <section className="perfil-minhas-receitas">
              <div className="perfil-cabecalho-receitas">
                <div>
                  <h2>Minhas receitas</h2>
                  <p>Receitas publicadas por você.</p>
                </div>
                <Link
                  to="/adicionar-receita"
                  state={{ origem: "/perfil" }}
                  className="perfil-botao"
                >
                  Adicionar receita
                </Link>
              </div>

              {erro && (
                <p className="perfil-erro" role="alert">
                  {erro}
                </p>
              )}

              {carregandoReceitas ? (
                <section className="perfil-estado" role="status">
                  <p>Carregando suas receitas...</p>
                </section>
              ) : erro && receitas.length === 0 ? (
                <section className="perfil-estado">
                  <p>Não foi possível carregar suas receitas.</p>
                  <button
                    type="button"
                    className="perfil-botao"
                    onClick={() => {
                      setErro("");
                      setRevisaoReceitas((revisao) => revisao + 1);
                    }}
                  >
                    Tentar novamente
                  </button>
                </section>
              ) : receitas.length > 0 ? (
                <div className="perfil-receitas-grid">
                  {receitas.map((receita) => (
                    <ReceitaCard
                      key={receita.id}
                      receita={receita}
                      onEditar={`/perfil/receitas/${receita.id}/editar`}
                      onExcluir={excluir}
                    />
                  ))}
                </div>
              ) : (
                <section className="perfil-estado">
                  <h3>Você ainda não publicou receitas</h3>
                  <p>Suas receitas aparecerão aqui depois da publicação.</p>
                </section>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

export default Perfil;
