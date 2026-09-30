import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Select from "../components/Select";
import { estaLogado, getUsuario } from "../services/auth";
import { salvarReceita } from "../services/receitas";
import "./AdicionarReceita.css";

function transformarLista(texto) {
  return texto
    .split(/\n+/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () =>
      reject(new Error("Não foi possível ler a imagem selecionada."));
    leitor.readAsDataURL(arquivo);
  });
}

function AdicionarReceita() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tempo, setTempo] = useState("");
  const [dificuldade, setDificuldade] = useState("");
  const [custo, setCusto] = useState("");
  const [imagem, setImagem] = useState("");
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [descricao, setDescricao] = useState("");
  const [ingredientes, setIngredientes] = useState([]);
  const [modoPreparo, setModoPreparo] = useState("");
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [sucesso, setSucesso] = useState("");
  const imagemInputRef = useRef(null);

  if (!estaLogado()) {
    return (
      <>
        <Navbar />
        <main className="adicionar-page">
          <section className="adicionar-nao-autorizado">
            <h1>Faça login para adicionar uma receita</h1>
            <p>Você precisa estar autenticado para publicar uma receita.</p>
            <Link to="/login" className="adicionar-botao">
              Entrar
            </Link>
          </section>
        </main>
      </>
    );
  }

  const formularioVazio =
    !titulo.trim() &&
    !categoria &&
    !tempo.trim() &&
    !dificuldade &&
    !custo &&
    !arquivoImagem &&
    !descricao.trim() &&
    ingredientes.every(
      ({ nome, quantidade }) => !nome.trim() && !quantidade.trim(),
    ) &&
    !modoPreparo.trim();

  function cancelar() {
    if (
      formularioVazio ||
      window.confirm(
        "Deseja realmente sair e perder as informações preenchidas?",
      )
    ) {
      navigate("/");
    }
  }

  function atualizarIngrediente(index, campo, valor) {
    setIngredientes((atuais) =>
      atuais.map((ingrediente, itemIndex) =>
        itemIndex === index ? { ...ingrediente, [campo]: valor } : ingrediente,
      ),
    );
  }

  function selecionarImagem(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    const extensaoValida = /\.(jpe?g|png|webp)$/i.test(arquivo.name);
    const tipoValido = ["image/jpeg", "image/png", "image/webp"].includes(
      arquivo.type,
    );
    if (!extensaoValida || !tipoValido) {
      if (imagem.startsWith("blob:")) URL.revokeObjectURL(imagem);
      setArquivoImagem(null);
      setImagem("");
      setErros((atuais) => ({
        ...atuais,
        imagem: "Selecione uma imagem JPG, JPEG, PNG ou WEBP.",
      }));
      event.target.value = "";
      return;
    }

    if (imagem.startsWith("blob:")) URL.revokeObjectURL(imagem);
    setArquivoImagem(arquivo);
    setImagem(URL.createObjectURL(arquivo));
    setErros((atuais) => ({ ...atuais, imagem: "" }));
  }

  function removerImagem() {
    if (imagem.startsWith("blob:")) URL.revokeObjectURL(imagem);
    setArquivoImagem(null);
    setImagem("");
    if (imagemInputRef.current) imagemInputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErroGeral("");

    const novosErros = {};
    const tituloLimpo = titulo.trim();
    const tempoNumerico = Number(tempo);
    const ingredientesPreenchidos = ingredientes.filter(
      ({ nome, quantidade }) => nome.trim() || quantidade.trim(),
    );
    const ingredientesValidos = ingredientesPreenchidos.filter(
      ({ nome, quantidade }) => nome.trim() && quantidade.trim(),
    );
    const existeIngredienteParcial = ingredientesPreenchidos.some(
      ({ nome, quantidade }) => !nome.trim() || !quantidade.trim(),
    );
    const passos = transformarLista(modoPreparo);

    if (!tituloLimpo) {
      novosErros.titulo = "Informe o nome da receita.";
    } else if (titulo.length > 100 || tituloLimpo.length > 100) {
      novosErros.titulo = "O nome deve ter no máximo 100 caracteres.";
    }
    if (!categoria) {
      novosErros.categoria = "Selecione uma categoria.";
    }
    if (!arquivoImagem || !imagem) {
      novosErros.imagem = "Selecione uma imagem para a receita.";
    }
    if (!tempo.trim()) {
      novosErros.tempo = "Informe o tempo de preparo.";
    } else if (
      !Number.isFinite(tempoNumerico) ||
      !Number.isInteger(tempoNumerico)
    ) {
      novosErros.tempo = "Informe um número inteiro de minutos válido.";
    } else if (tempoNumerico < 3) {
      novosErros.tempo = "O tempo mínimo de preparo é de 3 minutos.";
    }
    if (!dificuldade) {
      novosErros.dificuldade = "Selecione a dificuldade.";
    }
    if (existeIngredienteParcial) {
      novosErros.ingredientes =
        "Preencha nome e quantidade em todos os ingredientes adicionados.";
    } else if (ingredientesValidos.length === 0) {
      novosErros.ingredientes =
        "Adicione ao menos um ingrediente com nome e quantidade.";
    }
    if (passos.length === 0) {
      novosErros.modoPreparo = "Adicione pelo menos um passo do preparo.";
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    try {
      const imagemSalva = await lerArquivoComoDataUrl(arquivoImagem);
      const usuario = getUsuario();
      const novaReceita = {
        id: Date.now(),
        titulo: tituloLimpo,
        categoria,
        tempo: `${tempoNumerico} min`,
        dificuldade,
        custo,
        imagem: imagemSalva,
        descricao:
          descricao.trim() || "Receita publicada por um usuário do Que Fome!",
        descricaoCompleta: descricao.trim(),
        // Mantém strings para compatibilidade com os mocks e com Receita.jsx.
        ingredientes: ingredientesValidos.map(
          ({ nome, quantidade }) => `${quantidade.trim()} ${nome.trim()}`,
        ),
        modoPreparo: passos,
        autorId: usuario?.id || null,
        autorNome: usuario?.nome || "Usuário",
      };

      salvarReceita(novaReceita);
      setSucesso("Receita publicada com sucesso! Redirecionando...");
      window.setTimeout(() => navigate(`/receita/${novaReceita.id}`), 1200);
    } catch (erro) {
      setErroGeral(
        erro.message ||
          "Não foi possível salvar a receita. Verifique o espaço disponível no navegador e tente novamente.",
      );
    }
  }

  return (
    <>
      <Navbar />
      <main className="adicionar-page">
        <section className="adicionar-card">
          <button type="button" className="adicionar-voltar" onClick={cancelar}>
            ← Voltar
          </button>
          <h1>Adicionar receita</h1>
          <p className="adicionar-subtitulo">
            Preencha as informações da sua receita para publicá-la.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="campo">
              <label htmlFor="titulo">Nome da receita *</label>
              <input
                id="titulo"
                type="text"
                maxLength={100}
                placeholder="Ex.: Mousse de limão"
                value={titulo}
                aria-invalid={Boolean(erros.titulo)}
                aria-describedby={erros.titulo ? "erro-titulo" : undefined}
                onChange={(event) => setTitulo(event.target.value)}
              />
              <small className="contador-caracteres">
                {titulo.length}/100 caracteres
              </small>
              {erros.titulo && (
                <p id="erro-titulo" className="campo-erro">
                  {erros.titulo}
                </p>
              )}
            </div>

            <div className="campo">
              <label htmlFor="categoria">Categoria *</label>
              <Select
                id="categoria"
                value={categoria}
                placeholder="Selecione uma categoria"
                invalid={Boolean(erros.categoria)}
                onChange={setCategoria}
                options={[
                  "Saladas",
                  "Sopas",
                  "Petiscos",
                  "Massas",
                  "Peixes",
                  "Carnes",
                  "Aves",
                  "Vegetarianos",
                  "Arroz",
                  "Legumes",
                  "Batatas",
                  "Bolos",
                  "Doces",
                  "Tortas",
                  "Sucos",
                  "Drinks",
                  "Cafés",
                ].map((item) => ({ value: item, label: item }))}
              />
              {erros.categoria && (
                <p className="campo-erro">{erros.categoria}</p>
              )}
            </div>

            <div className="campo">
              <label htmlFor="imagem">Imagem da receita *</label>
              <input
                ref={imagemInputRef}
                id="imagem"
                className="imagem-input-escondido"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                aria-invalid={Boolean(erros.imagem)}
                onChange={selecionarImagem}
              />
              <button
                type="button"
                className="imagem-escolher"
                onClick={() => imagemInputRef.current?.click()}
              >
                Escolher arquivo
              </button>
              <small className="campo-ajuda">
                Formatos aceitos: JPG, JPEG, PNG e WEBP.
              </small>
              {imagem && (
                <div className="imagem-preview">
                  <img src={imagem} alt="Prévia da receita selecionada" />
                  <span>{arquivoImagem?.name}</span>
                  <button
                    type="button"
                    className="imagem-remover"
                    onClick={removerImagem}
                  >
                    Remover imagem
                  </button>
                </div>
              )}
              {erros.imagem && <p className="campo-erro">{erros.imagem}</p>}
            </div>

            <div className="campo-duplo">
              <div className="campo">
                <label htmlFor="tempo">Tempo de preparo (minutos) *</label>
                <input
                  id="tempo"
                  type="number"
                  min="3"
                  step="1"
                  placeholder="Ex.: 30"
                  value={tempo}
                  aria-invalid={Boolean(erros.tempo)}
                  onChange={(event) => setTempo(event.target.value)}
                />
                {erros.tempo && <p className="campo-erro">{erros.tempo}</p>}
              </div>
              <div className="campo">
                <label htmlFor="dificuldade">Dificuldade *</label>
                <Select
                  id="dificuldade"
                  value={dificuldade}
                  invalid={Boolean(erros.dificuldade)}
                  onChange={setDificuldade}
                  options={["Muito fácil", "Fácil", "Médio", "Difícil"].map(
                    (item) => ({ value: item, label: item }),
                  )}
                />
                {erros.dificuldade && (
                  <p className="campo-erro">{erros.dificuldade}</p>
                )}
              </div>
            </div>

            <div className="campo">
              <label htmlFor="custo">Custo</label>
              <Select
                id="custo"
                value={custo}
                onChange={setCusto}
                options={["Baixo", "Médio", "Alto"].map((item) => ({
                  value: item,
                  label: item,
                }))}
              />
            </div>

            <div className="campo">
              <label htmlFor="descricao">Descrição</label>
              <textarea
                id="descricao"
                placeholder="Conte um pouco sobre a receita."
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
              />
            </div>

            <div className="campo">
              <label>Ingredientes *</label>
              <small>
                Informe a quantidade e o ingrediente em campos separados.
              </small>
              <div className="ingredientes-formulario">
                {ingredientes.map((ingrediente, index) => (
                  <div className="ingrediente-linha" key={index}>
                    <input
                      aria-label={`Quantidade do ingrediente ${index + 1}`}
                      placeholder="Quantidade (ex.: 2 xícaras)"
                      value={ingrediente.quantidade}
                      aria-invalid={Boolean(
                        erros.ingredientes &&
                        (!ingrediente.quantidade.trim() ||
                          !ingrediente.nome.trim()),
                      )}
                      onChange={(event) =>
                        atualizarIngrediente(
                          index,
                          "quantidade",
                          event.target.value,
                        )
                      }
                    />
                    <input
                      aria-label={`Ingrediente ${index + 1}`}
                      placeholder="Ingrediente (ex.: farinha)"
                      value={ingrediente.nome}
                      aria-invalid={Boolean(
                        erros.ingredientes &&
                        (!ingrediente.quantidade.trim() ||
                          !ingrediente.nome.trim()),
                      )}
                      onChange={(event) =>
                        atualizarIngrediente(index, "nome", event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="ingrediente-remover"
                      aria-label={`Remover ingrediente ${index + 1}`}
                      onClick={() =>
                        setIngredientes((atuais) =>
                          atuais.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="ingrediente-adicionar"
                onClick={() =>
                  setIngredientes((atuais) => [
                    ...atuais,
                    { nome: "", quantidade: "" },
                  ])
                }
              >
                + Adicionar ingrediente
              </button>
              {erros.ingredientes && (
                <p className="campo-erro">{erros.ingredientes}</p>
              )}
            </div>

            <div className="campo">
              <label htmlFor="modoPreparo">Modo de preparo *</label>
              <small>Escreva um passo por linha.</small>
              <textarea
                id="modoPreparo"
                placeholder="Ex.: misture os ingredientes&#10;bata no liquidificador&#10;leve à geladeira"
                value={modoPreparo}
                aria-invalid={Boolean(erros.modoPreparo)}
                onChange={(event) => setModoPreparo(event.target.value)}
              />
              {erros.modoPreparo && (
                <p className="campo-erro">{erros.modoPreparo}</p>
              )}
            </div>

            {erroGeral && (
              <p className="adicionar-erro" role="alert">
                {erroGeral}
              </p>
            )}
            {sucesso && (
              <p className="adicionar-sucesso" role="status">
                {sucesso}
              </p>
            )}
            <div className="adicionar-acoes-formulario">
              <button
                type="button"
                className="adicionar-cancelar"
                onClick={cancelar}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="adicionar-botao"
                disabled={Boolean(sucesso)}
              >
                Publicar receita
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}

export default AdicionarReceita;
