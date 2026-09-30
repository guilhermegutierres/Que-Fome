import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReceitaCard from "../components/ReceitaCard";
import { estaLogado, getUsuario } from "../services/auth";
import {
  excluirReceita as excluirReceitaSalva,
  obterReceitasPorAutor,
} from "../services/receitas";
import { removerReceitaDosFavoritos } from "../services/favoritos";
import "./Perfil.css";

function Perfil() {
  const usuario = getUsuario();
  const [receitas, setReceitas] = useState(() =>
    obterReceitasPorAutor(usuario?.id),
  );
  const [erro, setErro] = useState("");

  function excluir(receita) {
    const confirmou = window.confirm(
      `Deseja realmente excluir a receita "${receita.titulo}"?`,
    );
    if (!confirmou) return;

    const removida = excluirReceitaSalva(receita.id, usuario?.id);
    if (!removida) {
      setErro(
        "Não foi possível excluir esta receita. Atualize a página e tente novamente.",
      );
      return;
    }

    removerReceitaDosFavoritos(receita.id);
    setReceitas((atuais) => atuais.filter((item) => item.id !== receita.id));
    setErro("");
  }

  return (
    <>
      <Navbar />
      <main className="perfil-page">
        {!estaLogado() || !usuario ? (
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

              {receitas.length > 0 ? (
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
