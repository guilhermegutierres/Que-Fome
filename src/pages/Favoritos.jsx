import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReceitaCard from "../components/ReceitaCard";
import { estaLogado } from "../services/auth";
import {
  EVENTO_FAVORITOS_ATUALIZADOS,
  obterFavoritos,
} from "../services/favoritos";
import { obterReceitas } from "../services/receitas";
import "./Favoritos.css";

function Favoritos() {
  const [favoritos, setFavoritos] = useState(() => obterFavoritos());

  useEffect(() => {
    function atualizarFavoritos() {
      setFavoritos(obterFavoritos());
    }

    window.addEventListener(EVENTO_FAVORITOS_ATUALIZADOS, atualizarFavoritos);
    window.addEventListener("storage", atualizarFavoritos);

    return () => {
      window.removeEventListener(
        EVENTO_FAVORITOS_ATUALIZADOS,
        atualizarFavoritos,
      );
      window.removeEventListener("storage", atualizarFavoritos);
    };
  }, []);

  if (!estaLogado()) {
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

  const receitas = obterReceitas();

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

        {receitasFavoritas.length > 0 ? (
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
