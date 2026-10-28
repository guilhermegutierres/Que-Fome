import type { Key } from "react";
import { obterNomeTag } from "../data/tagsReceitas";
import "./TagBadges.css";

interface TagBadgesProps {
  tags?: unknown;
  limit?: unknown;
  context?: unknown;
}

function TagBadges({ tags = [], limit, context = "detalhe" }: TagBadgesProps) {
  const listaTags: unknown[] = Array.isArray(tags) ? tags : [];
  const visiveis = Number.isInteger(limit)
    ? listaTags.slice(0, limit as number)
    : listaTags;
  const restantes = listaTags.length - visiveis.length;

  return (
    <div
      className={`receita-tags receita-tags-${context as string}`}
      aria-label="Tags da receita"
    >
      {visiveis.map((tag) => (
        <span className="receita-tag" key={tag as Key}>
          {obterNomeTag(tag as string)}
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
