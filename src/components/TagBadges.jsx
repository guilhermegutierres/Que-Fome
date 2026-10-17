import { obterNomeTag } from "../data/tagsReceitas";
import "./TagBadges.css";

function TagBadges({ tags = [], limit, context = "detalhe" }) {
  const listaTags = Array.isArray(tags) ? tags : [];
  const visiveis = Number.isInteger(limit)
    ? listaTags.slice(0, limit)
    : listaTags;
  const restantes = listaTags.length - visiveis.length;

  return (
    <div
      className={`receita-tags receita-tags-${context}`}
      aria-label="Tags da receita"
    >
      {visiveis.map((tag) => (
        <span className="receita-tag" key={tag}>
          {obterNomeTag(tag)}
        </span>
      ))}
      {restantes > 0 && (
        <span
          className="receita-tag receita-tag-mais"
          aria-label={`${restantes} tags adicionais`}
        >
          +{restantes}
        </span>
      )}
    </div>
  );
}

export default TagBadges;
