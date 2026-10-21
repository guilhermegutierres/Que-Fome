import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import TagBadges from "./TagBadges";
import {
  alternarFavorito,
  estaFavorito,
  EVENTO_FAVORITOS_ATUALIZADOS,
} from "../services/favoritos";
import "./ReceitaCard.css";

interface ReceitaCardDados {
  id: string | number;
  tipo?: string | null;
  autorId?: string | number | null;
  imagem?: string | null;
  titulo?: string;
  categoria?: string | null;
  tags?: unknown;
  descricao?: string | null;
  tempo?: string | number | null;
  dificuldade?: string | null;
}

interface ReceitaCardProps {
  receita: ReceitaCardDados;
  onEditar?: string | null;
  onExcluir?: ((receita: ReceitaCardDados) => void) | null;
}

const IMAGEM_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#eeeeee"/><path d="M250 590l120-130 95 100 75-75 110 105H250z" fill="#c7c7c7"/><circle cx="520" cy="350" r="55" fill="#c7c7c7"/><text x="400" y="700" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" fill="#666666">Imagem indisponível</text></svg>',
  );

function ReceitaCard({ receita, onEditar, onExcluir }: ReceitaCardProps) {
  const navigate = useNavigate();
  const { usuario, carregando } = useAuth() as {
    usuario: { email: string } | null;
    carregando: boolean;
  };
  const [imagemComErro, setImagemComErro] = useState(false);
  const [, atualizarFavoritos] = useState(0);

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

  const favoritado = estaFavorito(receita.id, usuario?.email);
  const podeGerenciar = receita.tipo === "usuario" && Boolean(receita.autorId);

  function handleFavorito() {
    if (carregando) return;
    if (!usuario) {
      navigate("/login");
      return;
    }

    alternarFavorito(receita.id, usuario.email);
  }

  return (
    <article className="receita-card">
      <div className="receita-card-imagem-container">
        <img
          src={
            imagemComErro || !receita.imagem ? IMAGEM_FALLBACK : receita.imagem
          }
          alt={
            imagemComErro
              ? `Imagem indisponível para ${receita.titulo}`
              : receita.titulo
          }
          className="receita-card-imagem"
          onError={() => setImagemComErro(true)}
        />

        <button
          type="button"
          className={`favorito-botao ${favoritado ? "favoritado" : ""}`}
          onClick={handleFavorito}
          disabled={carregando}
          aria-label={
            favoritado
              ? `Remover ${receita.titulo} dos favoritos`
              : `Adicionar ${receita.titulo} aos favoritos`
          }
        >
          <svg
            width="20"
            height="20"
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

      <div className="receita-card-conteudo">
        <span className="receita-card-categoria">{receita.categoria}</span>
        <TagBadges tags={receita.tags} limit={2} context="card" />

        <h2 title={receita.titulo}>{receita.titulo}</h2>

        <p>{receita.descricao}</p>

        <div className="receita-card-info">
          <span>⏱ {receita.tempo}</span>
          <span>•</span>
          <span>{receita.dificuldade}</span>
        </div>

        <Link to={`/receita/${receita.id}`} className="receita-card-botao">
          Ver receita
        </Link>

        {podeGerenciar && (onEditar || onExcluir) && (
          <div className="receita-card-acoes-proprietario">
            {onEditar && (
              <Link to={onEditar} className="receita-card-editar">
                Editar
              </Link>
            )}
            {onExcluir && (
              <button
                type="button"
                className="receita-card-excluir"
                onClick={() => onExcluir(receita)}
              >
                Excluir
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default ReceitaCard;
