// O React fala somente com o NestJS. Nenhuma chave do banco/API é enviada ao navegador.
const URL_API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
// `supabase` (padrão): usa os alimentos do PostgreSQL via NestJS.
// `rapidapi`: usa a API externa via proxy seguro do NestJS.
// Não misture IDs entre fontes em uma mesma receita.
const FONTE =
  import.meta.env.VITE_ALIMENTOS_SOURCE === "rapidapi"
    ? "/alimentos/rapidapi"
    : "/alimentos";

type NutrienteMacro =
  | "kcal"
  | "protein"
  | "carbohydrate"
  | "lipids"
  | "fiber";
type NutrienteMicro = "calcium" | "iron" | "phosphorus";

interface AlimentoBusca {
  id: number;
  descricao: string;
  kcal: number | null;
}

interface ItemCalculoNutricional {
  id: number;
  grams: number;
}

interface RefeicaoCalculada {
  items: Array<{ id: number; grams: number; kcal: number | null }>;
  unavailableNutrients?: {
    macros: NutrienteMacro[];
    micros: NutrienteMicro[];
  };
  totals: {
    grams: number;
    macros: Record<NutrienteMacro, number | null>;
    micros: Record<NutrienteMicro, number | null>;
  };
}

interface OpcoesRequisicao extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

const consultasPendentes = new Map<string, Promise<unknown>>();

// Mantém a assinatura pública dos componentes enquanto migramos os serviços.
function apiConfigurada(): boolean {
  return true;
}

async function requisitar<T>(
  caminho: string,
  opcoes: OpcoesRequisicao = {},
): Promise<T> {
  let resposta;
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      ...opcoes,
      headers: {
        ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
        ...opcoes.headers,
      },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor de alimentos.");
  }

  if (!resposta.ok) {
    if (resposta.status >= 500) {
      throw new Error(
        "O servidor não conseguiu consultar os alimentos. Verifique a conexão com o banco.",
      );
    }
    if (resposta.status === 400) {
      throw new Error(
        "Os dados enviados para a consulta nutricional são inválidos.",
      );
    }
    throw new Error("Não foi possível consultar a tabela TACO no momento.");
  }
  return resposta.json() as Promise<T>;
}

function consultarUmaVez<T>(
  chave: string,
  consultar: () => Promise<T>,
): Promise<T> {
  if (!consultasPendentes.has(chave)) {
    consultasPendentes.set(
      chave,
      consultar().finally(() => consultasPendentes.delete(chave)),
    );
  }
  return consultasPendentes.get(chave) as Promise<T>;
}

function buscarAlimentos(termo: string): Promise<AlimentoBusca[]> {
  const busca = termo.trim();
  if (!busca) return Promise.resolve([]);
  return consultarUmaVez(`busca:${busca.toLowerCase()}`, () =>
    requisitar(`${FONTE}?busca=${encodeURIComponent(busca)}`),
  );
}

function calcularNutricao(
  itens: ItemCalculoNutricional[],
): Promise<RefeicaoCalculada | null> {
  if (itens.length === 0) return Promise.resolve(null);
  return consultarUmaVez(`calculo:${JSON.stringify(itens)}`, () =>
    requisitar(`${FONTE}/calcular`, {
      method: "POST",
      body: JSON.stringify({ items: itens }),
    }),
  );
}

export { apiConfigurada, buscarAlimentos, calcularNutricao };
