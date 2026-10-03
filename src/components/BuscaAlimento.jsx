import { useEffect, useRef, useState } from "react";
import { apiConfigurada, buscarAlimentos } from "../services/nutricao";
import "./BuscaAlimento.css";

const TAMANHO_MINIMO_BUSCA = 3;
const ATRASO_BUSCA_MS = 500;

function BuscaAlimento({
  id,
  alimento,
  nomeIngrediente = "",
  onSelecionar,
  invalid = false,
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [consultaIniciada, setConsultaIniciada] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const containerRef = useRef(null);
  const termoValido = termo.trim().length >= TAMANHO_MINIMO_BUSCA;

  useEffect(() => {
    function fecharAoClicarFora(event) {
      if (!containerRef.current?.contains(event.target)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  // Espera o usuário parar de digitar para não gastar a cota da API.
  useEffect(() => {
    const termoLimpo = termo.trim();
    if (termoLimpo.length < TAMANHO_MINIMO_BUSCA) return;

    let cancelado = false;
    const temporizador = window.setTimeout(async () => {
      if (cancelado) return;
      setConsultaIniciada(true);
      setCarregando(true);

      try {
        const encontrados = await buscarAlimentos(termoLimpo);
        if (cancelado) return;
        setResultados(encontrados);
        setErro("");
        setIndiceAtivo(encontrados.length > 0 ? 0 : -1);
      } catch (falha) {
        if (cancelado) return;
        setResultados([]);
        setErro(falha.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }, ATRASO_BUSCA_MS);

    return () => {
      cancelado = true;
      window.clearTimeout(temporizador);
    };
  }, [termo]);

  function escolher(opcao) {
    onSelecionar({ id: opcao.id, descricao: opcao.descricao });
    setTermo("");
    setAberto(false);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" && termoValido && resultados.length > 0) {
      event.preventDefault();
      setAberto(true);
      setIndiceAtivo((atual) => (atual + 1) % resultados.length);
    } else if (
      event.key === "ArrowUp" &&
      termoValido &&
      resultados.length > 0
    ) {
      event.preventDefault();
      setAberto(true);
      setIndiceAtivo(
        (atual) => (atual - 1 + resultados.length) % resultados.length,
      );
    } else if (event.key === "Enter") {
      // Evita enviar o formulário ao escolher um alimento com Enter.
      event.preventDefault();
      if (mostrarLista && !carregando && resultados[indiceAtivo]) {
        escolher(resultados[indiceAtivo]);
      }
    } else if (event.key === "Escape") {
      setAberto(false);
    }
  }

  if (!apiConfigurada()) {
    return (
      <p className="busca-alimento-aviso">
        Informação nutricional indisponível: configure a chave da API.
      </p>
    );
  }

  if (alimento) {
    return (
      <div className="busca-alimento-selecionado">
        <span className="busca-alimento-vinculo">
          <span aria-hidden="true">✓</span>
          <span className="busca-alimento-vinculo-texto">
            <small>Alimento vinculado</small>
            <strong title={alimento.descricao}>{alimento.descricao}</strong>
          </span>
        </span>
        <button type="button" onClick={() => onSelecionar(null)}>
          Trocar
        </button>
      </div>
    );
  }

  const mostrarLista = aberto && termoValido && consultaIniciada;

  return (
    <div className="busca-alimento" ref={containerRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        placeholder={
          nomeIngrediente.trim()
            ? `Buscar “${nomeIngrediente.trim()}” na TACO...`
            : "Buscar alimento na TACO..."
        }
        value={termo}
        aria-invalid={invalid}
        aria-expanded={mostrarLista}
        aria-controls={`${id}-resultados`}
        aria-activedescendant={
          mostrarLista && resultados[indiceAtivo]
            ? `${id}-resultado-${indiceAtivo}`
            : undefined
        }
        onChange={(event) => {
          const novoTermo = event.target.value;
          const novoTermoValido =
            novoTermo.trim().length >= TAMANHO_MINIMO_BUSCA;

          setTermo(novoTermo);
          setResultados([]);
          setErro("");
          setIndiceAtivo(-1);
          setCarregando(false);
          setConsultaIniciada(false);
          setAberto(novoTermoValido);
        }}
        onFocus={() => setAberto(termoValido)}
        onKeyDown={handleKeyDown}
      />

      {mostrarLista && (
        <div
          className="busca-alimento-resultados"
          id={`${id}-resultados`}
          role="listbox"
        >
          {carregando && (
            <p className="busca-alimento-status">Buscando alimentos...</p>
          )}

          {!carregando && erro && (
            <p className="busca-alimento-status erro">{erro}</p>
          )}

          {!carregando && !erro && resultados.length === 0 && (
            <p className="busca-alimento-status">Nenhum alimento encontrado.</p>
          )}

          {!carregando &&
            resultados.map((opcao, index) => (
              <div
                id={`${id}-resultado-${index}`}
                key={opcao.id}
                role="option"
                aria-selected={index === indiceAtivo}
                className={`busca-alimento-opcao${index === indiceAtivo ? " ativa" : ""}`}
                onMouseEnter={() => setIndiceAtivo(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => escolher(opcao)}
              >
                <span>{opcao.descricao}</span>
                {opcao.kcal != null && (
                  <small>{Math.round(opcao.kcal)} kcal/100 g</small>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default BuscaAlimento;
