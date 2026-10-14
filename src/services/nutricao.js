// O React fala somente com o NestJS. Nenhuma chave do banco/API é enviada ao navegador.
const URL_API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
// `supabase` (padrão): usa os alimentos do PostgreSQL via NestJS.
// `rapidapi`: usa a API externa via proxy seguro do NestJS.
// Não misture IDs entre fontes em uma mesma receita.
const FONTE =
  import.meta.env.VITE_ALIMENTOS_SOURCE === "rapidapi"
    ? "/alimentos/rapidapi"
    : "/alimentos";
const consultasPendentes = new Map();

// Mantém a assinatura pública dos componentes enquanto migramos os serviços.
function apiConfigurada() {
  return true;
}

async function requisitar(caminho, opcoes = {}) {
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
  return resposta.json();
}

function consultarUmaVez(chave, consultar) {
  if (!consultasPendentes.has(chave)) {
    consultasPendentes.set(
      chave,
      consultar().finally(() => consultasPendentes.delete(chave)),
    );
  }
  return consultasPendentes.get(chave);
}

function buscarAlimentos(termo) {
  const busca = termo.trim();
  if (!busca) return Promise.resolve([]);
  return consultarUmaVez(`busca:${busca.toLowerCase()}`, () =>
    requisitar(`${FONTE}?busca=${encodeURIComponent(busca)}`),
  );
}

function calcularNutricao(itens) {
  if (itens.length === 0) return Promise.resolve(null);
  return consultarUmaVez(`calculo:${JSON.stringify(itens)}`, () =>
    requisitar(`${FONTE}/calcular`, {
      method: "POST",
      body: JSON.stringify({ items: itens }),
    }),
  );
}

export { apiConfigurada, buscarAlimentos, calcularNutricao };
