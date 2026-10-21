import { TAGS_RECEITAS } from "../data/tagsReceitas";

interface TagSelectorProps {
  value?: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

function TagSelector({
  value = [],
  onChange,
  disabled = false,
}: TagSelectorProps) {
  const selecionadas = new Set(value);

  function alternarTag(tagId: string) {
    onChange(
      selecionadas.has(tagId)
        ? value.filter((tag) => tag !== tagId)
        : [...value, tagId],
    );
  }

  return (
    <fieldset className="campo tags-selecao" disabled={disabled}>
      <legend>Tags (opcional)</legend>
      <small>Escolha características que descrevem esta receita.</small>
      <div className="tags-selecao-opcoes">
        {TAGS_RECEITAS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`tag-selecao-chip${selecionadas.has(tag.id) ? " selecionada" : ""}`}
            aria-pressed={selecionadas.has(tag.id)}
            onClick={() => alternarTag(tag.id)}
          >
            {tag.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default TagSelector;
