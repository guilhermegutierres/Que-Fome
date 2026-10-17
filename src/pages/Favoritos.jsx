import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReceitaCard from "../components/ReceitaCard";
import { useAuth } from "../contexts/auth-context";
import {
  EVENTO_FAVORITOS_ATUALIZADOS,
  obterFavoritos,
} from "../services/favoritos";
import { obterReceitas } from "../services/receitas";
import "./Favoritos.css";

function Favoritos() {
  const { usuario, carregando } = useAuth();
  const [favoritos, setFavoritos] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [chaveReceitasCarregadas, setChaveReceitasCarregadas] = useState("");
  const [erroReceitas, setErroReceitas] = useState("");
  const [tentativaCarregamento, setTentativaCarregamento] = useState(0);
  const chaveCarregamento = `${usuario?.id || ""}:${tentativaCarregamento}`;
  const carregandoReceitas =
    Boolean(usuario?.id) && chaveReceitasCarregadas !== chaveCarregamento;

  useEffect(() => {
    function atualizarFavoritos() {
      setFavoritos(obterFavoritos(usuario?.email));
    }

    atualizarFavoritos();
    window.addEventListener(EVENTO_FAVORITOS_ATUALIZADOS, atualizarFavoritos);
    window.addEventListener("storage", atualizarFavoritos);

    return () => {
      window.removeEventListener(
        EVENTO_FAVORITOS_ATUALIZADOS,
        atualizarFavoritos,
      );
      window.removeEventListener("storage", atualizarFavoritos);
    };
  }, [usuario?.email]);

  useEffect(() => {
    if (!usuario?.id) return undefined;

    let ativo = true;
    obterReceitas()
      .then((dados) => {
        if (!ativo) return;
        setReceitas(dados);
        setErroReceitas("");
        setChaveReceitasCarregadas(chaveCarregamento);
      })
      .catch((erro) => {
        if (!ativo) return;
        setReceitas([]);
        setErroReceitas(erro.message);
        setChaveReceitasCarregadas(chaveCarregamento);
      });

    return () => {
      ativo = false;
    };
  }, [usuario?.id, chaveCarregamento]);

  if (carregando) {
    return (
      <>
        <Navbar />
        <main className="favoritos-page">
          <section className="favoritos-vazio">
            <p>Carregando sessão...</p>
          </section>
        </main>
      </>
    );
  }

  if (!usuario) {
    return (
      <>
        <Navbar />

        <main className="favoritos-page">
          <section className="favoritos-vazio">
            <h1>Seus favoritos</h1>

            <p>Faça login para salvar e acessar suas receitas favoritas.</p>

            <Link to="/login" className="favoritos-botao">
              Entrar
            </Link>
          </section>
        </main>
      </>
    );
  }

  const receitasFavoritas = receitas.filter((receita) =>
    favoritos.includes(receita.id),
  );

  return (
    <>
      <Navbar />

      <main className="favoritos-page">
        <div className="favoritos-header">
          <div>
            <h1>Seus favoritos</h1>

            <p>Receitas que você salvou para encontrar depois.</p>
          </div>

          <span>
            {receitasFavoritas.length}{" "}
            {receitasFavoritas.length === 1 ? "receita" : "receitas"}
          </span>
        </div>

        {carregandoReceitas ? (
          <section className="favoritos-vazio" role="status">
            <p>Carregando receitas favoritas...</p>
          </section>
        ) : erroReceitas ? (
          <section className="favoritos-vazio" role="alert">
            <h2>Não foi possível carregar os favoritos</h2>
            <p>{erroReceitas}</p>
            <button
              type="button"
              className="favoritos-botao"
              onClick={() => {
                setErroReceitas("");
                setTentativaCarregamento((valor) => valor + 1);
              }}
            >
              Tentar novamente
            </button>
          </section>
        ) : receitasFavoritas.length > 0 ? (
          <div className="favoritos-grid">
            {receitasFavoritas.map((receita) => (
              <ReceitaCard key={receita.id} receita={receita} />
            ))}
          </div>
        ) : (
          <section className="favoritos-vazio">
            <h2>Nenhum favorito ainda</h2>

            <p>
              Explore as receitas e toque no coração para salvar suas favoritas.
            </p>

            <Link to="/" className="favoritos-botao">
              Explorar receitas
            </Link>
          </section>
        )}
      </main>
    </>
  );
}

export default Favoritos;
