import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { estaLogado, getUsuario } from "../services/auth";
import { salvarReceita } from "../services/receitas";
import "./AdicionarReceita.css";

function transformarLista(texto) {
  return texto
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function AdicionarReceita() {
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tempo, setTempo] = useState("");
  const [dificuldade, setDificuldade] = useState("");
  const [custo, setCusto] = useState("");
  const [imagem, setImagem] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ingredientes, setIngredientes] = useState("");
  const [modoPreparo, setModoPreparo] = useState("");
  const [erro, setErro] = useState("");

  if (!estaLogado()) {
    return (
      <main className="adicionar-page">
        <section className="adicionar-nao-autorizado">
          <h1>Faça login para adicionar uma receita</h1>

          <p>
            Você precisa estar autenticado para publicar uma receita.
          </p>

          <Link to="/login" className="adicionar-botao">
            Entrar
          </Link>
        </section>
      </main>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    setErro("");

    if (
      !titulo ||
      !categoria ||
      !tempo ||
      !dificuldade ||
      !imagem ||
      !ingredientes ||
      !modoPreparo
    ) {
      setErro(
        "Preencha todos os campos obrigatórios."
      );
      return;
    }

    const listaIngredientes = transformarLista(ingredientes);
    const listaModoPreparo = transformarLista(modoPreparo);

    if (listaIngredientes.length === 0) {
      setErro("Adicione pelo menos um ingrediente.");
      return;
    }

    if (listaModoPreparo.length === 0) {
      setErro("Adicione pelo menos um passo do preparo.");
      return;
    }

    const usuario = getUsuario();

    const novaReceita = {
      id: Date.now(),

      titulo,
      categoria,
      tempo,
      dificuldade,
      custo,

      imagem,

      descricao:
        descricao ||
        "Receita publicada por um usuário do Que Fome!",

      descricaoCompleta: descricao,

      ingredientes: listaIngredientes,

      modoPreparo: listaModoPreparo,

      autorId: usuario?.id || null,
      autorNome: usuario?.nome || "Usuário",
    };

    salvarReceita(novaReceita);

    navigate(`/receita/${novaReceita.id}`);
  }

  return (
    <main className="adicionar-page">
      <section className="adicionar-card">
        <Link to="/" className="adicionar-voltar">
          ← Voltar
        </Link>

        <h1>Adicionar receita</h1>

        <p className="adicionar-subtitulo">
          Preencha as informações da sua receita para publicá-la.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="campo">
            <label htmlFor="titulo">
              Nome da receita *
            </label>

            <input
              id="titulo"
              type="text"
              placeholder="Ex.: Mousse de limão"
              value={titulo}
              onChange={(event) =>
                setTitulo(event.target.value)
              }
            />
          </div>

          <div className="campo">
            <label htmlFor="categoria">
              Categoria *
            </label>

            <select
              id="categoria"
              value={categoria}
              onChange={(event) =>
                setCategoria(event.target.value)
              }
            >
              <option value="">
                Selecione uma categoria
              </option>

              <option value="Saladas">Saladas</option>
              <option value="Sopas">Sopas</option>
              <option value="Petiscos">Petiscos</option>

              <option value="Massas">Massas</option>
              <option value="Peixes">Peixes</option>
              <option value="Carnes">Carnes</option>
              <option value="Aves">Aves</option>
              <option value="Vegetarianos">
                Vegetarianos
              </option>

              <option value="Arroz">Arroz</option>
              <option value="Legumes">Legumes</option>
              <option value="Batatas">Batatas</option>

              <option value="Bolos">Bolos</option>
              <option value="Doces">Doces</option>
              <option value="Tortas">Tortas</option>

              <option value="Sucos">Sucos</option>
              <option value="Drinks">Drinks</option>
              <option value="Cafés">Cafés</option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="imagem">
              Imagem da receita *
            </label>

            <input
              id="imagem"
              type="url"
              placeholder="Cole o link da imagem"
              value={imagem}
              onChange={(event) =>
                setImagem(event.target.value)
              }
            />

            <small>
              Por enquanto, utilize um link direto para a imagem.
            </small>
          </div>

          <div className="campo-duplo">
            <div className="campo">
              <label htmlFor="tempo">
                Tempo de preparo *
              </label>

              <input
                id="tempo"
                type="text"
                placeholder="Ex.: 30 min"
                value={tempo}
                onChange={(event) =>
                  setTempo(event.target.value)
                }
              />
            </div>

            <div className="campo">
              <label htmlFor="dificuldade">
                Dificuldade *
              </label>

              <select
                id="dificuldade"
                value={dificuldade}
                onChange={(event) =>
                  setDificuldade(event.target.value)
                }
              >
                <option value="">
                  Selecione
                </option>

                <option value="Muito fácil">
                  Muito fácil
                </option>

                <option value="Fácil">
                  Fácil
                </option>

                <option value="Médio">
                  Médio
                </option>

                <option value="Difícil">
                  Difícil
                </option>
              </select>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="custo">
              Custo
            </label>

            <select
              id="custo"
              value={custo}
              onChange={(event) =>
                setCusto(event.target.value)
              }
            >
              <option value="">
                Selecione
              </option>

              <option value="Baixo">
                Baixo
              </option>

              <option value="Médio">
                Médio
              </option>

              <option value="Alto">
                Alto
              </option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="descricao">
              Descrição
            </label>

            <textarea
              id="descricao"
              placeholder="Conte um pouco sobre a receita."
              value={descricao}
              onChange={(event) =>
                setDescricao(event.target.value)
              }
            />
          </div>

          <div className="campo">
            <label htmlFor="ingredientes">
              Ingredientes *
            </label>

            <small>
              Separe por vírgulas ou pressione Enter.
            </small>

            <textarea
              id="ingredientes"
              placeholder="Ex.: 1 lata de leite condensado, 2 limões, 1 caixa de creme de leite"
              value={ingredientes}
              onChange={(event) =>
                setIngredientes(event.target.value)
              }
            />
          </div>

          <div className="campo">
            <label htmlFor="modoPreparo">
              Modo de preparo *
            </label>

            <small>
              Separe os passos por vírgulas ou pressione Enter.
            </small>

            <textarea
              id="modoPreparo"
              placeholder="Ex.: misture os ingredientes, bata no liquidificador, leve à geladeira"
              value={modoPreparo}
              onChange={(event) =>
                setModoPreparo(event.target.value)
              }
            />
          </div>

          {erro && (
            <p className="adicionar-erro">
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="adicionar-botao"
          >
            Publicar receita
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdicionarReceita;