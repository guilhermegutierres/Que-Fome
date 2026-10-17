import { supabase } from "./supabase.js";

const URL_API = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");
const LIMITE_PAGINA = 100;

function criarServicoReceitas({
  baseUrl = "/api",
  fetchImpl = globalThis.fetch,
  supabaseClient = null,
  cryptoImpl = globalThis.crypto,
} = {}) {
  async function obterSessao() {
    if (!supabaseClient) {
      throw new Error("A autenticação não está configurada neste navegador.");
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data?.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente para continuar.");
    }
    return data.session;
  }

  async function requisitar(caminho, { autenticado = false, ...opcoes } = {}) {
    const headers = new Headers(opcoes.headers || {});
    if (opcoes.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (autenticado) {
      const sessao = await obterSessao();
      headers.set("Authorization", `Bearer ${sessao.access_token}`);
    }

    let resposta;
    try {
      resposta = await fetchImpl(`${baseUrl}${caminho}`, {
        ...opcoes,
        headers,
      });
    } catch {
      throw new Error("Não foi possível conectar ao servidor de receitas.");
    }

    let dados = null;
    if (resposta.status !== 204) {
      try {
        dados = await resposta.json();
      } catch {
        dados = null;
      }
    }

    if (!resposta.ok) {
      const mensagem = Array.isArray(dados?.message)
        ? dados.message.join(" ")
        : typeof dados?.message === "string"
          ? dados.message
          : "Não foi possível concluir a operação de receitas.";
      throw new Error(mensagem);
    }

    return dados;
  }

  function normalizarImagem(caminho) {
    if (typeof caminho !== "string" || !caminho.trim()) return null;
    const valor = caminho.trim();
    if (/^https?:\/\//i.test(valor) || valor.startsWith("/")) return valor;
    if (/^(data|blob):/i.test(valor) || !supabaseClient) return null;

    const { data } = supabaseClient.storage
      .from("receitas")
      .getPublicUrl(valor);
    return data?.publicUrl || null;
  }

  function normalizarReceita(receita) {
    const imagemPath = receita.imagemPath ?? receita.imagem ?? null;
    return {
      ...receita,
      id: String(receita.id),
      imagemPath,
      imagem: normalizarImagem(imagemPath),
      ingredientes: Array.isArray(receita.ingredientes)
        ? receita.ingredientes
        : [],
      ingredientesDetalhados: Array.isArray(receita.ingredientesDetalhados)
        ? receita.ingredientesDetalhados.map((ingrediente) => ({
            ...ingrediente,
          }))
        : [],
      modoPreparo: Array.isArray(receita.modoPreparo)
        ? receita.modoPreparo
        : [],
      tags: Array.isArray(receita.tags) ? receita.tags : [],
    };
  }

  async function listarTodasAsPaginas(caminho, autenticado = false) {
    const receitas = new Map();
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const separador = caminho.includes("?") ? "&" : "?";
      const resposta = await requisitar(
        `${caminho}${separador}page=${pagina}&limit=${LIMITE_PAGINA}`,
        { autenticado },
      );
      const itens = Array.isArray(resposta?.items) ? resposta.items : [];
      for (const item of itens) {
        if (item?.id != null) {
          const normalizada = normalizarReceita(item);
          receitas.set(normalizada.id, normalizada);
        }
      }

      const informado = Number(resposta?.totalPages);
      totalPaginas =
        Number.isInteger(informado) && informado > 0 ? informado : 1;
      pagina += 1;
    } while (pagina <= totalPaginas);

    return [...receitas.values()];
  }

  async function obterReceita(id) {
    const resposta = await requisitar(`/recipes/${encodeURIComponent(id)}`);
    return normalizarReceita(resposta);
  }

  async function obterReceitas() {
    return listarTodasAsPaginas("/recipes");
  }

  async function obterReceitasPorAutor() {
    return listarTodasAsPaginas("/recipes/mine", true);
  }

  async function salvarReceita(dados) {
    const resposta = await requisitar("/recipes", {
      method: "POST",
      autenticado: true,
      body: JSON.stringify(dados),
    });
    return normalizarReceita(resposta);
  }

  async function atualizarReceita(id, dados) {
    const resposta = await requisitar(`/recipes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      autenticado: true,
      body: JSON.stringify(dados),
    });
    return normalizarReceita(resposta);
  }

  async function excluirReceita(id) {
    await requisitar(`/recipes/${encodeURIComponent(id)}`, {
      method: "DELETE",
      autenticado: true,
    });
  }

  async function enviarImagem(arquivo, usuarioId) {
    const sessao = await obterSessao();
    if (!usuarioId || sessao.user?.id !== usuarioId) {
      throw new Error("Não foi possível confirmar a autoria do upload.");
    }
    if (!cryptoImpl?.randomUUID) {
      throw new Error("Este navegador não oferece suporte ao upload seguro.");
    }

    const extensoes = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extensao = extensoes[arquivo?.type];
    if (!extensao) {
      throw new Error("Selecione uma imagem JPG, PNG ou WEBP válida.");
    }

    const caminho = `${sessao.user.id}/${cryptoImpl.randomUUID()}.${extensao}`;
    const { error } = await supabaseClient.storage
      .from("receitas")
      .upload(caminho, arquivo, {
        cacheControl: "3600",
        contentType: arquivo.type,
        upsert: false,
      });
    if (error) {
      throw new Error(
        "Não foi possível enviar a imagem. Verifique as permissões do Storage e tente novamente.",
      );
    }
    return caminho;
  }

  return {
    obterReceitas,
    obterReceitasPorAutor,
    obterReceita,
    salvarReceita,
    atualizarReceita,
    excluirReceita,
    enviarImagem,
  };
}

const servicoReceitas = criarServicoReceitas({
  baseUrl: URL_API,
  supabaseClient: supabase,
});

const {
  obterReceitas,
  obterReceitasPorAutor,
  obterReceita,
  salvarReceita,
  atualizarReceita,
  excluirReceita,
  enviarImagem,
} = servicoReceitas;

export {
  criarServicoReceitas,
  obterReceitas,
  obterReceitasPorAutor,
  obterReceita,
  salvarReceita,
  atualizarReceita,
  excluirReceita,
  enviarImagem,
};
