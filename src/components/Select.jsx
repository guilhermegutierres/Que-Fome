import { useEffect, useRef, useState } from "react";
import "./Select.css";

function Select({
  id,
  value,
  options: opcoes,
  placeholder = "Selecione",
  onChange,
  invalid = false,
}) {
  const [aberto, setAberto] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const containerRef = useRef(null);
  const typeaheadRef = useRef("");
  const typeaheadTimeoutRef = useRef(null);
  const options = [{ value: "", label: placeholder }, ...opcoes];
  const opcaoSelecionada = options.find((opcao) => opcao.value === value);

  useEffect(() => {
    function fecharAoClicarFora(event) {
      if (!containerRef.current?.contains(event.target)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      window.clearTimeout(typeaheadTimeoutRef.current);
    };
  }, []);

  function abrir(indice = options.findIndex((opcao) => opcao.value === value)) {
    setIndiceAtivo(indice >= 0 ? indice : 0);
    setAberto(true);
  }

  function escolher(opcao) {
    onChange(opcao.value);
    setAberto(false);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!aberto) abrir();
      else setIndiceAtivo((atual) => (atual + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!aberto)
        abrir(
          options.findIndex((opcao) => opcao.value === value) >= 0
            ? options.findIndex((opcao) => opcao.value === value)
            : options.length - 1,
        );
      else
        setIndiceAtivo(
          (atual) => (atual - 1 + options.length) % options.length,
        );
    } else if (event.key === "Home" && aberto) {
      event.preventDefault();
      setIndiceAtivo(0);
    } else if (event.key === "End" && aberto) {
      event.preventDefault();
      setIndiceAtivo(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!aberto) abrir();
      else if (options[indiceAtivo]) escolher(options[indiceAtivo]);
    } else if (event.key === "Escape" && aberto) {
      event.preventDefault();
      setAberto(false);
    } else if (event.key === "Tab") {
      setAberto(false);
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      typeaheadRef.current += event.key.toLocaleLowerCase();
      window.clearTimeout(typeaheadTimeoutRef.current);
      typeaheadTimeoutRef.current = window.setTimeout(() => {
        typeaheadRef.current = "";
      }, 700);
      const inicio = options.findIndex((opcao) =>
        opcao.label.toLocaleLowerCase().startsWith(typeaheadRef.current),
      );
      if (inicio >= 0) {
        setIndiceAtivo(inicio);
        setAberto(true);
      }
    }
  }

  return (
    <div className="select-custom" ref={containerRef}>
      <button
        id={id}
        type="button"
        className="select-custom-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={`${id}-opcoes`}
        aria-activedescendant={
          aberto && options[indiceAtivo]
            ? `${id}-opcao-${indiceAtivo}`
            : undefined
        }
        aria-invalid={invalid}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={handleKeyDown}
      >
        <span className={value ? "" : "select-custom-placeholder"}>
          {opcaoSelecionada?.label || placeholder}
        </span>
        <span
          className={`select-custom-indicador${aberto ? " aberto" : ""}`}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <div
          className="select-custom-opcoes"
          id={`${id}-opcoes`}
          role="listbox"
          aria-labelledby={id}
        >
          {options.map((opcao, index) => (
            <div
              id={`${id}-opcao-${index}`}
              key={opcao.value}
              role="option"
              aria-selected={opcao.value === value}
              className={`select-custom-opcao${index === indiceAtivo ? " ativa" : ""}${opcao.value === value ? " selecionada" : ""}`}
              onMouseEnter={() => setIndiceAtivo(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => escolher(opcao)}
            >
              {opcao.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Select;
