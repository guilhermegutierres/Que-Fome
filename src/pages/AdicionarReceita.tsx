import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import BuscaAlimento from "../components/BuscaAlimento";
import Navbar from "../components/Navbar";
import Select from "../components/Select";
import TagSelector from "../components/TagSelector";
import { CATEGORIAS_RECEITAS } from "../data/categoriasReceitas";
import { useAuth } from "../contexts/auth-context";
import {
  atualizarReceita,
  obterReceitasPorAutor,
  salvarReceita,
  enviarImagem,
} from "../services/receitas";
import "./AdicionarReceita.css";

type UsuarioFormulario = NonNullable<ReturnType<typeof useAuth>["usuario"]>;
type AlimentoSelecionado = NonNullable<
  ComponentProps<typeof BuscaAlimento>["alimento"]
>;
type ReceitaApiFormulario = Awaited<
  ReturnType<typeof obterReceitasPorAutor>
>[number];
type ReceitaFormulario = ReceitaApiFormulario & {
  tipo?: unknown;
  autorId?: unknown;
  titulo?: string;
  categoria?: string;
  tempoMinutos?: number | null;
  tempo?: string | number | null;
  dificuldade?: string;
  custo?: string | null;
  imagem?: string | null;
  descricao?: string | null;
  descricaoCompleta?: string | null;
  ingredientes?: unknown[];
  modoPreparo?: unknown[];
  tags?: unknown[];
};

interface IngredienteDetalhadoApi {
  nome?: string | null;
  quantidade?: string | null;
  textoExibicao?: string | null;
  tacoId?: number | null;
  tacoDescricao?: string | null;
  gramas?: number | null;
  gramasEstimadas?: boolean | null;
}

interface IngredienteFormulario {
  nome: string;
  quantidade: string;
  textoExibicao: string | null;
  alimentoTaco: AlimentoSelecionado | null;
  gramas: string;
  gramasEstimadas: boolean;
}

type CampoIngrediente = "nome" | "quantidade" | "alimentoTaco" | "gramas";
type ErroFormulario =
  | "titulo"
  | "categoria"
  | "imagem"
  | "tempo"
  | "dificuldade"
  | "ingredientes"
  | "modoPreparo";
type ErrosFormulario = Partial<Record<ErroFormulario, string>>;

interface FormularioReceitaProps {
  usuario: UsuarioFormulario;
}

interface FormularioReceitaCamposProps extends FormularioReceitaProps {
  receitaOriginal: ReceitaFormulario | null;
}

function transformarLista(texto: string): string[] {
  return texto
    .split(/\n+/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function converterIngredientesParaFormulario(
  receita: ReceitaFormulario | null,
): IngredienteFormulario[] {
  if (Array.isArray(receita?.ingredientesDetalhados)) {
    return receita.ingredientesDetalhados.map((registro) => {
      const ingrediente = registro as IngredienteDetalhadoApi;
      return {
        nome: ingrediente.nome || "",
        quantidade: ingrediente.quantidade || "",
        textoExibicao: ingrediente.textoExibicao || null,
        alimentoTaco: ingrediente.tacoId
          ? {
              id: ingrediente.tacoId,
              descricao: ingrediente.tacoDescricao || "",
            }
          : null,
        gramas: ingrediente.gramas ? String(ingrediente.gramas) : "",
        gramasEstimadas: Boolean(ingrediente.gramasEstimadas),
      };
    });
  }

  return (Array.isArray(receita?.ingredientes) ? receita.ingredientes : []).map(
    (ingrediente) => {
      const texto = String(ingrediente);
      const separador = texto.search(/\s/);

      if (separador === -1) {
        return {
          quantidade: "",
          nome: texto,
          textoExibicao: null,
          alimentoTaco: null,
          gramas: "",
          gramasEstimadas: false,
        };
      }

      return {
        quantidade: texto.slice(0, separador),
        nome: texto.slice(separador + 1).trim(),
        textoExibicao: null,
        alimentoTaco: null,
        gramas: "",
        gramasEstimadas: false,
      };
    },
  );
}
function AdicionarReceita() {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <>
        <Navbar />
        <main className="adicionar-page">
          <section className="adicionar-nao-autorizado">
            <p>Verificando sua sessão...</p>
          </section>
        </main>
      </>
    );
  }

  if (!usuario) {
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

  return <FormularioReceita usuario={usuario} />;
}

function FormularioReceita({ usuario }: FormularioReceitaProps) {
  const { id } = useParams();
  const [receitaOriginal, setReceitaOriginal] =
    useState<ReceitaFormulario | null>(null);
  const [receitaCarregadaId, setReceitaCarregadaId] = useState<string | null>(
    null,
  );
  const [erroCarregamento, setErroCarregamento] = useState("");
  const carregandoReceita = Boolean(id) && receitaCarregadaId !== id;

  useEffect(() => {
    if (!id) return undefined;

    let ativo = true;
    obterReceitasPorAutor()
      .then((receitas) => {
        if (!ativo) return;
        const encontrada = receitas.find(
          (receita) =>
            receita.id === id &&
            receita.tipo === "usuario" &&
            receita.autorId === usuario.id,
        );
        setReceitaOriginal(
          (encontrada as ReceitaFormulario | undefined) || null,
        );
        setErroCarregamento("");
        setReceitaCarregadaId(id);
      })
      .catch((erro) => {
        if (!ativo) return;
        setErroCarregamento((erro as Error).message);
        setReceitaOriginal(null);
        setReceitaCarregadaId(id);
      });

    return () => {
      ativo = false;
    };
  }, [id, usuario.id]);

  if (id && carregandoReceita) {
    return (
      <>
        <Navbar />
        <main className="adicionar-page">
          <section className="adicionar-nao-autorizado" role="status">
            <p>Carregando sua receita...</p>
          </section>
        </main>
      </>
    );
  }

  if (id && (erroCarregamento || !receitaOriginal)) {
    return (
      <>
        <Navbar />
        <main className="adicionar-page">
          <section className="adicionar-nao-autorizado">
            <h1>Receita indisponível</h1>
            <p>
              {erroCarregamento ||
                "Esta receita não existe ou você não tem permissão para editá-la."}
            </p>
            <Link to="/perfil" className="adicionar-botao">
              Voltar ao perfil
            </Link>
          </section>
        </main>
      </>
    );
  }

  return (
    <FormularioReceitaCampos
      key={id || "nova-receita"}
      usuario={usuario}
      receitaOriginal={receitaOriginal}
    />
  );
}

function FormularioReceitaCampos({
  usuario,
  receitaOriginal,
}: FormularioReceitaCamposProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const origemNavegacao =
    location.state?.origem === "/perfil" ? "/perfil" : "/";
  const modoEdicao = Boolean(receitaOriginal);
  const ingredientesOriginais =
    converterIngredientesParaFormulario(receitaOriginal);
  const descricaoOriginal =
    receitaOriginal?.descricaoCompleta || receitaOriginal?.descricao || "";
  const tempoOriginal = String(
    receitaOriginal?.tempoMinutos ??
      String(receitaOriginal?.tempo || "").replace(/\s*min$/i, ""),
  );
  const modoPreparoOriginal = Array.isArray(receitaOriginal?.modoPreparo)
    ? receitaOriginal!.modoPreparo.join("\n")
    : "";
  const tagsOriginais = Array.isArray(receitaOriginal?.tags)
    ? (receitaOriginal.tags as string[])
    : [];
  const [titulo, setTitulo] = useState(receitaOriginal?.titulo || "");
  const [categoria, setCategoria] = useState(receitaOriginal?.categoria || "");
  const [tempo, setTempo] = useState(tempoOriginal);
  const [dificuldade, setDificuldade] = useState(
    receitaOriginal?.dificuldade || "",
  );
  const [custo, setCusto] = useState(receitaOriginal?.custo || "");
  const [imagem, setImagem] = useState(receitaOriginal?.imagem || "");
  const [imagemAlterada, setImagemAlterada] = useState(false);
  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
  const [descricao, setDescricao] = useState(descricaoOriginal);
  const [ingredientes, setIngredientes] = useState(ingredientesOriginais);
  const [modoPreparo, setModoPreparo] = useState(modoPreparoOriginal);
  const [tags, setTags] = useState<string[]>(tagsOriginais);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [erroGeral, setErroGeral] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [publicando, setPublicando] = useState(false);
  const imagemInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (imagem.startsWith("blob:")) URL.revokeObjectURL(imagem);
    },
    [imagem],
  );

  const formularioVazio =
    !titulo.trim() &&
    !categoria &&
    !tempo.trim() &&
    !dificuldade &&
    !custo &&
    !arquivoImagem &&
    !descricao.trim() &&
    tags.length === 0 &&
    ingredientes.every(
      ({ nome, quantidade, alimentoTaco, gramas }) =>
        !nome.trim() && !quantidade.trim() && !alimentoTaco && !gramas.trim(),
    ) &&
    !modoPreparo.trim();

  const formularioAlterado = receitaOriginal
    ? titulo !== receitaOriginal.titulo ||
      categoria !== receitaOriginal.categoria ||
      tempo !== tempoOriginal ||
      dificuldade !== receitaOriginal.dificuldade ||
      custo !== (receitaOriginal.custo || "") ||
      imagem !== (receitaOriginal.imagem || "") ||
      Boolean(arquivoImagem) ||
      descricao !== descricaoOriginal ||
      JSON.stringify(ingredientes) !== JSON.stringify(ingredientesOriginais) ||
      JSON.stringify(tags) !== JSON.stringify(tagsOriginais) ||
      modoPreparo !== modoPreparoOriginal
    : !formularioVazio;

  function cancelar() {
    if (
      !formularioAlterado ||
      window.confirm(
        "Deseja realmente sair e perder as informações preenchidas?",
      )
    ) {
      navigate(modoEdicao ? "/perfil" : origemNavegacao);
    }
  }

  function atualizarIngrediente<K extends CampoIngrediente>(
    index: number,
    campo: K,
    valor: IngredienteFormulario[K],
  ) {
    setIngredientes((atuais) =>
      atuais.map((ingrediente, itemIndex) =>
        itemIndex === index
          ? ({
              ...ingrediente,
              [campo]: valor,
              ...(["nome", "quantidade"].includes(campo)
                ? { textoExibicao: null }
                : {}),
              ...(["alimentoTaco", "gramas"].includes(campo)
                ? { gramasEstimadas: false }
                : {}),
            } as IngredienteFormulario)
          : ingrediente,
      ),
    );
  }
  function selecionarImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    const extensaoValida = /\.(jpe?g|png|webp)$/i.test(arquivo.name);
    const tipoValido = ["image/jpeg", "image/png", "image/webp"].includes(
      arquivo.type,
    );
    if (!extensaoValida || !tipoValido) {
      if (imagem.startsWith("blob:")) URL.revokeObjectURL(imagem);
      setArquivoImagem(null);
      setImagem(modoEdicao ? receitaOriginal?.imagem || "" : "");
      setImagemAlterada(false);
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
    setImagemAlterada(true);
    setErros((atuais) => ({ ...atuais, imagem: "" }));
  }

  function removerImagem() {
    if (imagem.startsWith("blob:")) URL.revokeObjectURL(imagem);
    setArquivoImagem(null);
    setImagem("");
    setImagemAlterada(true);
    if (imagemInputRef.current) imagemInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroGeral("");

    const novosErros: ErrosFormulario = {};
    const tituloLimpo = titulo.trim();
    const tempoNumerico = Number(tempo);
    const ingredientesPreenchidos = ingredientes.filter(
      ({ nome, quantidade, alimentoTaco, gramas }) =>
        nome.trim() || quantidade.trim() || alimentoTaco || gramas.trim(),
    );
    const ingredientesValidos = ingredientesPreenchidos.filter(
      ({ nome, quantidade }) => nome.trim() && quantidade.trim(),
    );
    const existeIngredienteParcial = ingredientesPreenchidos.some(
      ({ nome, quantidade }) => !nome.trim() || !quantidade.trim(),
    );
    const existeGramasInvalida = ingredientesValidos.some(
      ({ alimentoTaco, gramas }) =>
        alimentoTaco && !(Number(gramas.replace(",", ".")) > 0),
    );
    const existeGramasSemAlimento = ingredientesValidos.some(
      ({ alimentoTaco, gramas }) => !alimentoTaco && gramas.trim(),
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
    const imagemExistentePodeSerMantida =
      modoEdicao &&
      !imagemAlterada &&
      Boolean(receitaOriginal?.imagemPath) &&
      Boolean(imagem);
    if ((!arquivoImagem && !imagemExistentePodeSerMantida) || !imagem) {
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
    } else if (existeGramasInvalida) {
      novosErros.ingredientes =
        "Informe o peso em gramas dos ingredientes vinculados à tabela nutricional.";
    } else if (existeGramasSemAlimento) {
      novosErros.ingredientes =
        "Selecione o alimento na tabela nutricional para os ingredientes com peso informado.";
    }
    if (passos.length === 0) {
      novosErros.modoPreparo = "Adicione pelo menos um passo do preparo.";
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setPublicando(true);
    try {
      const imagemPath = arquivoImagem
        ? await enviarImagem(arquivoImagem, usuario.id)
        : undefined;
      const ingredientesDetalhados =
        modoEdicao &&
        JSON.stringify(ingredientes) === JSON.stringify(ingredientesOriginais)
          ? receitaOriginal!.ingredientesDetalhados
          : ingredientesValidos.map(
              ({
                nome,
                quantidade,
                textoExibicao,
                alimentoTaco,
                gramas,
                gramasEstimadas,
              }) => ({
                nome: nome.trim(),
                quantidade: quantidade.trim(),
                ...(textoExibicao && { textoExibicao }),
                ...(alimentoTaco && {
                  tacoId: alimentoTaco.id,
                  gramas: Number(gramas.replace(",", ".")),
                  gramasEstimadas: Boolean(gramasEstimadas),
                }),
              }),
            );
      const descricaoReceita =
        modoEdicao && descricao === descricaoOriginal
          ? {
              descricao: receitaOriginal!.descricao,
              descricaoCompleta: receitaOriginal!.descricaoCompleta,
            }
          : {
              descricao:
                descricao.trim() ||
                "Receita publicada por um usuário do Que Fome!",
              descricaoCompleta: descricao.trim(),
            };
      const modoPreparoSalvo =
        modoEdicao && modoPreparo === modoPreparoOriginal
          ? receitaOriginal!.modoPreparo
          : passos;
      const dadosReceita = {
        titulo: tituloLimpo,
        categoria,
        tempo: tempoNumerico,
        dificuldade,
        custo: custo || null,
        ...descricaoReceita,
        ingredientesDetalhados,
        modoPreparo: modoPreparoSalvo,
        tags,
        ...(imagemPath && { imagemPath }),
      };

      if (modoEdicao) {
        await atualizarReceita(receitaOriginal!.id, dadosReceita);
        setSucesso("Receita atualizada com sucesso! Voltando ao perfil...");
        window.setTimeout(() => navigate("/perfil"), 1200);
      } else {
        const novaReceita = await salvarReceita(dadosReceita);
        setSucesso("Receita publicada com sucesso! Redirecionando...");
        window.setTimeout(
          () =>
            navigate(
              origemNavegacao === "/perfil"
                ? "/perfil"
                : `/receita/${novaReceita.id}`,
            ),
          1200,
        );
      }
    } catch (erro: unknown) {
      setErroGeral(
        (erro as Error).message ||
          "Não foi possível salvar a receita. Verifique o espaço disponível no navegador e tente novamente.",
      );
    } finally {
      setPublicando(false);
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
          <h1>{modoEdicao ? "Editar receita" : "Adicionar receita"}</h1>
          <p className="adicionar-subtitulo">
            {modoEdicao
              ? "Atualize as informações da sua receita."
              : "Preencha as informações da sua receita para publicá-la."}
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
                options={CATEGORIAS_RECEITAS.map((item) => ({
                  value: item,
                  label: item,
                }))}
              />
              {erros.categoria && (
                <p className="campo-erro">{erros.categoria}</p>
              )}
            </div>

            <TagSelector
              value={tags}
              onChange={setTags}
              disabled={publicando}
            />

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
                  <span>{arquivoImagem?.name || "Imagem atual"}</span>
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
                Informe a quantidade culinária e o ingrediente em campos
                separados.
              </small>
              <div className="nutricao-form-intro">
                <strong>Informação nutricional (opcional)</strong>
                <p>
                  A TACO reúne informações nutricionais de alimentos. Se quiser,
                  vincule seus ingredientes para estimar os nutrientes; você
                  pode publicar a receita sem usar a TACO.
                </p>
                <details className="nutricao-como-funciona">
                  <summary>Como funciona?</summary>
                  <div className="nutricao-como-funciona-conteudo">
                    <ol>
                      <li>Informe a quantidade e o ingrediente normalmente.</li>
                      <li>Escolha o alimento correspondente na TACO.</li>
                      <li>Informe o peso total desse ingrediente em gramas.</li>
                      <li>
                        O Que-Fome usa esses dados para estimar os nutrientes na
                        página da receita.
                      </li>
                    </ol>
                    <p>
                      A informação nutricional é opcional. Você pode publicar a
                      receita sem vincular ingredientes à TACO.
                    </p>
                  </div>
                </details>
              </div>
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
                    <div className="ingrediente-nutricao">
                      <div className="ingrediente-taco-campo">
                        <label htmlFor={`alimento-taco-${index}`}>
                          Alimento para cálculo nutricional
                        </label>
                        <BuscaAlimento
                          id={`alimento-taco-${index}`}
                          alimento={ingrediente.alimentoTaco}
                          nomeIngrediente={ingrediente.nome}
                          invalid={Boolean(
                            erros.ingredientes &&
                            ingrediente.gramas.trim() &&
                            !ingrediente.alimentoTaco,
                          )}
                          onSelecionar={(alimento) =>
                            atualizarIngrediente(
                              index,
                              "alimentoTaco",
                              alimento,
                            )
                          }
                        />
                      </div>
                      <div className="ingrediente-peso-campo">
                        <label htmlFor={`peso-taco-${index}`}>
                          Peso usado no cálculo (g)
                        </label>
                        <input
                          id={`peso-taco-${index}`}
                          aria-label={`Peso usado no cálculo para o ingrediente ${index + 1}, em gramas`}
                          inputMode="decimal"
                          placeholder="Ex.: 300"
                          value={ingrediente.gramas}
                          aria-invalid={Boolean(
                            erros.ingredientes &&
                            ingrediente.alimentoTaco &&
                            !(Number(ingrediente.gramas.replace(",", ".")) > 0),
                          )}
                          onChange={(event) =>
                            atualizarIngrediente(
                              index,
                              "gramas",
                              event.target.value,
                            )
                          }
                        />
                        <small>
                          Informe o peso total desse ingrediente para o cálculo.
                          A quantidade culinária continua na receita; xícaras,
                          colheres e unidades não são convertidas
                          automaticamente para gramas.
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="ingrediente-adicionar"
                onClick={() =>
                  setIngredientes((atuais) => [
                    ...atuais,
                    {
                      nome: "",
                      quantidade: "",
                      textoExibicao: null,
                      alimentoTaco: null,
                      gramas: "",
                      gramasEstimadas: false,
                    },
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
                disabled={publicando || Boolean(sucesso)}
              >
                {publicando
                  ? modoEdicao
                    ? "Salvando..."
                    : "Publicando..."
                  : modoEdicao
                    ? "Salvar alterações"
                    : "Publicar receita"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}

export default AdicionarReceita;
