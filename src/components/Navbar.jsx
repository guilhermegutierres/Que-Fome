import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getUsuario,
  logout,
  estaLogado,
} from "../services/auth";
import "./Navbar.css";

function TemaBotao({ modoEscuro, alternarModoEscuro }) {
  return (
    <button
      type="button"
      className="acao-botao"
      onClick={alternarModoEscuro}
      aria-label={
        modoEscuro
          ? "Ativar modo claro"
          : "Ativar modo escuro"
      }
      title={
        modoEscuro
          ? "Ativar modo claro"
          : "Ativar modo escuro"
      }
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {modoEscuro ? (
          <>
            <circle
              cx="12"
              cy="12"
              r="4"
              stroke="currentColor"
              strokeWidth="1.7"
            />

            <path
              d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </>
        ) : (
          <path
            d="M20 15.5C18.9 16.1 17.6 16.5 16.2 16.5C11.9 16.5 8.5 13.1 8.5 8.8C8.5 7.4 8.9 6.1 9.5 5C5.9 6.2 3.5 9.6 3.5 13.5C3.5 18.5 7.5 22.5 12.5 22.5C16.4 22.5 19.8 20.1 20.9 16.5C20.6 16.1 20.3 15.8 20 15.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}

function Navbar({
  busca = "",
  onBuscaChange = () => {},
  onCategoriaChange = () => {},
  compact = false,
}) {
  const navigate = useNavigate();

  const [usuarioLogado, setUsuarioLogado] = useState(
    estaLogado()
  );

  const [modoEscuro, setModoEscuro] = useState(() => {
    return localStorage.getItem("modoEscuro") === "true";
  });

  const usuario = getUsuario();

  useEffect(() => {
    document.body.classList.toggle(
      "modo-escuro",
      modoEscuro
    );

    localStorage.setItem(
      "modoEscuro",
      modoEscuro
    );
  }, [modoEscuro]);

  function selecionarCategoria(categoria) {
    onCategoriaChange(categoria);
  }

  function handleLogout() {
    logout();
    setUsuarioLogado(false);
    navigate("/");
  }

  function alternarModoEscuro() {
    setModoEscuro((estadoAtual) => !estadoAtual);
  }

  if (compact) {
    return (
      <header className="navbar navbar-compact">
        <Link to="/" className="logo">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M5 3V10M8 3V10M11 3V10M8 10V21M17 3V21M17 3C19.2 3 21 4.8 21 7V10C21 12.2 19.2 14 17 14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span>Que Fome!</span>
        </Link>

        <div className="navbar-compact-acoes">
          <Link
            to="/"
            className="voltar-inicio"
          >
            ← Voltar para início
          </Link>

          <TemaBotao
            modoEscuro={modoEscuro}
            alternarModoEscuro={alternarModoEscuro}
          />
        </div>
      </header>
    );
  }

  return (
    <header className="navbar">
      <Link to="/" className="logo">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M5 3V10M8 3V10M11 3V10M8 10V21M17 3V21M17 3C19.2 3 21 4.8 21 7V10C21 12.2 19.2 14 17 14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span>Que Fome!</span>
      </Link>

      <nav className="menu">
        <button
          type="button"
          className="menu-link"
          onClick={() => selecionarCategoria("")}
        >
          Início
        </button>

        <div className="dropdown">
          <button
            type="button"
            className="menu-link"
          >
            Entradas
            <span className="chevron" />
          </button>

          <div className="dropdown-menu">
            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Saladas")
              }
            >
              Saladas
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Sopas")
              }
            >
              Sopas
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Petiscos")
              }
            >
              Petiscos
            </button>
          </div>
        </div>

        <div className="dropdown">
          <button
            type="button"
            className="menu-link"
          >
            Principais
            <span className="chevron" />
          </button>

          <div className="dropdown-menu">
            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Massas")
              }
            >
              Massas
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Peixes")
              }
            >
              Peixes
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Carnes")
              }
            >
              Carnes
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Aves")
              }
            >
              Aves
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Vegetarianos")
              }
            >
              Vegetarianos
            </button>
          </div>
        </div>

        <div className="dropdown">
          <button
            type="button"
            className="menu-link"
          >
            Acompanhamentos
            <span className="chevron" />
          </button>

          <div className="dropdown-menu">
            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Arroz")
              }
            >
              Arroz
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Legumes")
              }
            >
              Legumes
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Batatas")
              }
            >
              Batatas
            </button>
          </div>
        </div>

        <div className="dropdown">
          <button
            type="button"
            className="menu-link"
          >
            Sobremesas
            <span className="chevron" />
          </button>

          <div className="dropdown-menu">
            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Bolos")
              }
            >
              Bolos
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Doces")
              }
            >
              Doces
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Tortas")
              }
            >
              Tortas
            </button>
          </div>
        </div>

        <div className="dropdown">
          <button
            type="button"
            className="menu-link"
          >
            Bebidas
            <span className="chevron" />
          </button>

          <div className="dropdown-menu">
            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Sucos")
              }
            >
              Sucos
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Drinks")
              }
            >
              Drinks
            </button>

            <button
              type="button"
              onClick={() =>
                selecionarCategoria("Cafés")
              }
            >
              Cafés
            </button>
          </div>
        </div>
      </nav>

      <div className="acoes">
        <div className="campo-busca">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />

            <path
              d="M16 16L21 21"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          <input
            type="text"
            placeholder="O que quer cozinhar?"
            value={busca}
            onChange={(event) =>
              onBuscaChange(event.target.value)
            }
          />

          {busca && (
            <button
              type="button"
              className="limpar-busca"
              onClick={() => onBuscaChange("")}
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        <TemaBotao
          modoEscuro={modoEscuro}
          alternarModoEscuro={alternarModoEscuro}
        />

        {usuarioLogado && (
          <Link
            to="/adicionar-receita"
            className="adicionar-link"
          >
            Adicionar receita
          </Link>
        )}

        {usuarioLogado ? (
          <div className="usuario-area">
            <div className="usuario-info">
              <span className="usuario-icone">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
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

              <span className="usuario-nome">
                {usuario?.nome || "Usuário"}
              </span>
            </div>

            <button
              type="button"
              className="sair-botao"
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        ) : (
          <div className="auth-acoes">
            <Link
              to="/login"
              className="entrar-link"
            >
              Entrar
            </Link>

            <Link
              to="/cadastro"
              className="cadastro-link"
            >
              Criar conta
            </Link>
          </div>
        )}

        <Link
          to="/favoritos"
          className="acao-botao"
          aria-label="Favoritos"
          title="Favoritos"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
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
        </Link>
      </div>
    </header>
  );
}

export default Navbar;