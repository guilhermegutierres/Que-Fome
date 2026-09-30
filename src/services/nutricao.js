const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPIDAPI_HOST =
  import.meta.env.VITE_RAPIDAPI_HOST || "taco-api-br1.p.rapidapi.com";
const URL_BASE = `https://${RAPIDAPI_HOST}`;

const CHAVE_CACHE = "cache_nutricao";

const consultasPendentes = new Map();

function apiConfigurada() {
  return Boolean(RAPIDAPI_KEY);
}

function obterCache() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CACHE)) || {};
  } catch {
    return {};
  }
}

function salvarNoCache(chave, valor) {
  const cache = obterCache();
  cache[chave] = valor;

  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(cache));
  } catch {
    // Sem espaço no navegador: a consulta funciona, só não fica em cache.
  }
}

async function requisitar(caminho, opcoes = {}) {
  if (!apiConfigurada()) {
    throw new Error("A chave da API de nutrição não foi configurada.");
  }

  let resposta;
  try {
    resposta = await fetch(`${URL_BASE}${caminho}`, {
      ...opcoes,
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
        ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch {
    throw new Error("Não foi possível conectar à API de nutrição.");
  }

  if (resposta.status === 429) {
    throw new Error(
      "Limite diário de consultas da API de nutrição atingido. Tente novamente amanhã.",
    );
  }

  if (resposta.status === 401 || resposta.status === 403) {
    throw new Error("A chave da API de nutrição é inválida ou não tem acesso.");
  }

  if (!resposta.ok) {
    throw new Error("A API de nutrição não conseguiu responder no momento.");
  }

  return resposta.json();
}

function consultarComCache(chave, consultar) {
  const cache = obterCache();
  if (cache[chave]) return Promise.resolve(cache[chave]);

  if (!consultasPendentes.has(chave)) {
    const consulta = consultar()
      .then((resultado) => {
        salvarNoCache(chave, resultado);
        return resultado;
      })
      .finally(() => consultasPendentes.delete(chave));

    consultasPendentes.set(chave, consulta);
  }

  return consultasPendentes.get(chave);
}

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function consultarAlimentosPorPalavra(palavra) {
  return consultarComCache(`busca:${palavra}`, async () => {
    const dados = await requisitar(
      `/foods/?q=${encodeURIComponent(palavra)}&limit=100`,
    );

    return (dados.results || []).map((alimento) => ({
      id: alimento.id,
      descricao: alimento.description,
      kcal: alimento.kcal,
    }));
  });
}

async function buscarAlimentos(termo) {
  const palavras = termo.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];

  const primeira = palavras[0].toLowerCase();
  const variantes = [
    primeira,
    primeira.charAt(0).toUpperCase() + primeira.slice(1),
  ];
  const listas = await Promise.all(variantes.map(consultarAlimentosPorPalavra));

  const palavrasNormalizadas = palavras.map(normalizarTexto);
  const encontrados = new Map();

  listas.flat().forEach((alimento) => {
    const descricao = normalizarTexto(alimento.descricao);
    const correspondeTodas = palavrasNormalizadas.every((palavra) =>
      descricao.includes(palavra),
    );

    if (correspondeTodas) encontrados.set(alimento.id, alimento);
  });

  // Alimentos cujo nome começa com o termo buscado aparecem primeiro.
  return [...encontrados.values()]
    .sort(
      (a, b) =>
        Number(
          !normalizarTexto(a.descricao).startsWith(palavrasNormalizadas[0]),
        ) -
        Number(
          !normalizarTexto(b.descricao).startsWith(palavrasNormalizadas[0]),
        ),
    )
    .slice(0, 8);
}

function corrigirMicronutrientes(dados) {
  const micros = dados.totals?.micros;
  if (!micros) return dados;

  return {
    ...dados,
    totals: {
      ...dados.totals,
      micros: {
        calcium: micros.calcium,
        iron: micros.sodium,
        phosphorus: micros.iron,
      },
    },
  };
}

function calcularNutricao(itens) {
  return consultarComCache(`receita:${JSON.stringify(itens)}`, () =>
    requisitar("/foods/calculate-meal", {
      method: "POST",
      body: JSON.stringify({ items: itens }),
    }).then(corrigirMicronutrientes),
  );
}

export { apiConfigurada, buscarAlimentos, calcularNutricao };
