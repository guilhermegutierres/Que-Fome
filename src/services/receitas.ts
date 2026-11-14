const URL_API = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");
const LIMITE_PAGINA = 100;

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
}

function criarServicoReceitas({
  baseUrl = "/api",
  fetchImpl = globalThis.fetch,
}: OpcoesServicoReceitas = {}) {
  async function requisitar<T = unknown>(
    caminho: string,
    opcoes: RequestInit = {},
  ): Promise<T | null> {
    const headers = new Headers(opcoes.headers || {});
    if (opcoes.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    let resposta: Response;
    try {
      resposta = await fetchImpl(`${baseUrl}${caminho}`, {
        ...opcoes,
        credentials: "include",
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
    if (/^[^/\\]+\.(?:jpe?g|png|webp|gif|avif)$/i.test(valor)) {
      return `/images/receitas/${encodeURIComponent(valor)}`;
    }
    return null;
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
  ): Promise<ReceitaNormalizada[]> {
    const receitas = new Map<string, ReceitaNormalizada>();
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const separador = caminho.includes("?") ? "&" : "?";
      const resposta = await requisitar<RespostaPaginadaReceitas>(
        `${caminho}${separador}page=${pagina}&limit=${LIMITE_PAGINA}`,
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
    return listarTodasAsPaginas("/recipes/mine");
  }

  async function salvarReceita(dados: unknown): Promise<ReceitaNormalizada> {
    const resposta = await requisitar<ReceitaApi>("/recipes", {
      method: "POST",
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
        body: JSON.stringify(dados),
      },
    );
    return normalizarReceita(resposta as ReceitaApi);
  }

  async function excluirReceita(id: string): Promise<void> {
    await requisitar(`/recipes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async function enviarImagem(
    arquivo: Blob,
    usuarioId: string | null | undefined,
  ): Promise<string> {
    if (!usuarioId) throw new Error("Entre na sua conta para enviar imagens.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
      throw new Error("Selecione uma imagem JPG, PNG ou WEBP válida.");
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter até 5 MB.");
    }
    const formulario = new FormData();
    formulario.append("image", arquivo, "receita.jpg");
    const resposta = await fetchImpl(`${baseUrl}/uploads/receitas`, {
      method: "POST",
      credentials: "include",
      body: formulario,
    });
    const json = (await resposta.json().catch(() => ({}))) as {
      imagemPath?: string;
      message?: string;
    };
    if (!resposta.ok || !json.imagemPath) {
      throw new Error(json.message || "Não foi possível enviar a imagem.");
    }
    return json.imagemPath;
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
