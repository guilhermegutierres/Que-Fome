import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase.ts";

const URL_API = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");
const LIMITE_PAGINA = 100;

interface ClienteSupabaseReceitas extends Pick<
  SupabaseClient,
  "auth" | "storage"
> {}

interface ReceitaApi {
  [campo: string]: unknown;
  id?: unknown;
  imagemPath?: unknown;
  imagem?: unknown;
  ingredientes?: unknown;
  ingredientesDetalhados?: unknown;
  modoPreparo?: unknown;
  tags?: unknown;
}

interface ReceitaNormalizada extends ReceitaApi {
  id: string;
  imagemPath: unknown;
  imagem: string | null;
  ingredientes: unknown[];
  ingredientesDetalhados: Record<string, unknown>[];
  modoPreparo: unknown[];
  tags: unknown[];
}

interface RespostaPaginadaReceitas {
  items?: unknown;
  totalPages?: unknown;
}

interface OpcoesServicoReceitas {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  supabaseClient?: ClienteSupabaseReceitas | null;
  cryptoImpl?: Pick<Crypto, "randomUUID"> | null;
}

interface OpcoesRequisicao extends RequestInit {
  autenticado?: boolean;
}

function criarServicoReceitas({
  baseUrl = "/api",
  fetchImpl = globalThis.fetch,
  supabaseClient = null,
  cryptoImpl = globalThis.crypto,
}: OpcoesServicoReceitas = {}) {
  async function obterSessao(): Promise<Session> {
    if (!supabaseClient) {
      throw new Error("A autenticação não está configurada neste navegador.");
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data?.session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente para continuar.");
    }
    return data.session;
  }

  async function requisitar<T = unknown>(
    caminho: string,
    { autenticado = false, ...opcoes }: OpcoesRequisicao = {},
  ): Promise<T | null> {
    const headers = new Headers(opcoes.headers || {});
    if (opcoes.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (autenticado) {
      const sessao = await obterSessao();
      headers.set("Authorization", `Bearer ${sessao.access_token}`);
    }

    let resposta: Response;
    try {
      resposta = await fetchImpl(`${baseUrl}${caminho}`, {
        ...opcoes,
        headers,
      });
    } catch {
      throw new Error("Não foi possível conectar ao servidor de receitas.");
    }

    let dados: unknown = null;
    if (resposta.status !== 204) {
      try {
        dados = await resposta.json();
      } catch {
        dados = null;
      }
    }

    if (!resposta.ok) {
      const mensagem = Array.isArray(
        (dados as { message?: unknown } | null)?.message,
      )
        ? ((dados as { message?: unknown }).message as unknown[]).join(" ")
        : typeof (dados as { message?: unknown } | null)?.message === "string"
          ? ((dados as { message?: string }).message as string)
          : "Não foi possível concluir a operação de receitas.";
      throw new Error(mensagem);
    }

    return dados as T | null;
  }

  function normalizarImagem(caminho: unknown): string | null {
    if (typeof caminho !== "string" || !caminho.trim()) return null;
    const valor = caminho.trim();
    if (/^https?:\/\//i.test(valor) || valor.startsWith("/")) return valor;
    if (/^(data|blob):/i.test(valor) || !supabaseClient) return null;

    const { data } = supabaseClient.storage
      .from("receitas")
      .getPublicUrl(valor);
    return data?.publicUrl || null;
  }

  function normalizarReceita(receita: ReceitaApi): ReceitaNormalizada {
    const imagemPath = receita.imagemPath ?? receita.imagem ?? null;
    return {
      ...receita,
      id: String(receita.id),
      imagemPath,
      imagem: normalizarImagem(imagemPath),
      ingredientes: Array.isArray(receita.ingredientes)
        ? (receita.ingredientes as unknown[])
        : [],
      ingredientesDetalhados: Array.isArray(receita.ingredientesDetalhados)
        ? (receita.ingredientesDetalhados as unknown[]).map((ingrediente) => ({
            ...(ingrediente as object),
          }))
        : [],
      modoPreparo: Array.isArray(receita.modoPreparo)
        ? (receita.modoPreparo as unknown[])
        : [],
      tags: Array.isArray(receita.tags) ? (receita.tags as unknown[]) : [],
    };
  }

  async function listarTodasAsPaginas(
    caminho: string,
    autenticado = false,
  ): Promise<ReceitaNormalizada[]> {
    const receitas = new Map<string, ReceitaNormalizada>();
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const separador = caminho.includes("?") ? "&" : "?";
      const resposta = await requisitar<RespostaPaginadaReceitas>(
        `${caminho}${separador}page=${pagina}&limit=${LIMITE_PAGINA}`,
        { autenticado },
      );
      const itens: unknown[] = Array.isArray(resposta?.items)
        ? resposta.items
        : [];
      for (const item of itens) {
        if ((item as ReceitaApi | null | undefined)?.id != null) {
          const normalizada = normalizarReceita(item as ReceitaApi);
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

  async function obterReceita(id: string): Promise<ReceitaNormalizada> {
    const resposta = await requisitar<ReceitaApi>(
      `/recipes/${encodeURIComponent(id)}`,
    );
    return normalizarReceita(resposta as ReceitaApi);
  }

  async function obterReceitas(): Promise<ReceitaNormalizada[]> {
    return listarTodasAsPaginas("/recipes");
  }

  async function obterReceitasPorAutor(): Promise<ReceitaNormalizada[]> {
    return listarTodasAsPaginas("/recipes/mine", true);
  }

  async function salvarReceita(dados: unknown): Promise<ReceitaNormalizada> {
    const resposta = await requisitar<ReceitaApi>("/recipes", {
      method: "POST",
      autenticado: true,
      body: JSON.stringify(dados),
    });
    return normalizarReceita(resposta as ReceitaApi);
  }

  async function atualizarReceita(
    id: string,
    dados: unknown,
  ): Promise<ReceitaNormalizada> {
    const resposta = await requisitar<ReceitaApi>(
      `/recipes/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        autenticado: true,
        body: JSON.stringify(dados),
      },
    );
    return normalizarReceita(resposta as ReceitaApi);
  }

  async function excluirReceita(id: string): Promise<void> {
    await requisitar(`/recipes/${encodeURIComponent(id)}`, {
      method: "DELETE",
      autenticado: true,
    });
  }

  async function enviarImagem(
    arquivo: Blob,
    usuarioId: string | null | undefined,
  ): Promise<string> {
    const sessao = await obterSessao();
    if (!usuarioId || sessao.user?.id !== usuarioId) {
      throw new Error("Não foi possível confirmar a autoria do upload.");
    }
    if (!cryptoImpl?.randomUUID) {
      throw new Error("Este navegador não oferece suporte ao upload seguro.");
    }

    const extensoes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extensao = extensoes[arquivo?.type];
    if (!extensao) {
      throw new Error("Selecione uma imagem JPG, PNG ou WEBP válida.");
    }

    const caminho = `${sessao.user.id}/${cryptoImpl.randomUUID()}.${extensao}`;
    const { error } = await supabaseClient!.storage
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
