import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({
  path: [
    resolve(backendDirectory, ".env.local"),
    resolve(backendDirectory, ".env"),
  ],
});

const QUANTIDADE_ESPERADA = 597;
const TAMANHO_LOTE = 100;
const VALORES_ESPECIAIS = new Set(["", "NA", "Tr", "*", "a", ",0,02"]);

const MAPEAMENTO_NUTRIENTES = [
  ["energy_kcal", "energia_kcal"],
  ["energy_kj", "energia_kj"],
  ["humidity_percents", "umidade_percentual"],
  ["protein_g", "proteina_g"],
  ["lipid_g", "lipidios_g"],
  ["cholesterol_mg", "colesterol_mg"],
  ["carbohydrate_g", "carboidratos_g"],
  ["fiber_g", "fibras_g"],
  ["ashes_g", "cinzas_g"],
  ["calcium_mg", "calcio_mg"],
  ["magnesium_mg", "magnesio_mg"],
  ["manganese_mg", "manganes_mg"],
  ["phosphorus_mg", "fosforo_mg"],
  ["iron_mg", "ferro_mg"],
  ["sodium_mg", "sodio_mg"],
  ["potassium_mg", "potassio_mg"],
  ["copper_mg", "cobre_mg"],
  ["zinc_mg", "zinco_mg"],
  ["retinol_mcg", "retinol_mcg"],
  ["re_mcg", "equivalentes_retinol_mcg"],
  ["rae_mcg", "equivalentes_atividade_retinol_mcg"],
  ["thiamine_mg", "tiamina_mg"],
  ["riboflavin_mg", "riboflavina_mg"],
  ["pyridoxine_mg", "piridoxina_mg"],
  ["niacin_mg", "niacina_mg"],
  ["vitaminC_mg", "vitamina_c_mg"],
  ["saturated_g", "acidos_graxos_saturados_g"],
  ["monounsaturated_g", "acidos_graxos_monoinsaturados_g"],
  ["polyunsaturated_g", "acidos_graxos_poliinsaturados_g"],
  ["12:0_g", "acido_graxo_12_0_g"],
  ["14:0_g", "acido_graxo_14_0_g"],
  ["14:1_g", "acido_graxo_14_1_g"],
  ["16:0_g", "acido_graxo_16_0_g"],
  ["16:1_g", "acido_graxo_16_1_g"],
  ["18:0_g", "acido_graxo_18_0_g"],
  ["18:1_g", "acido_graxo_18_1_g"],
  ["20:0_g", "acido_graxo_20_0_g"],
  ["20:1_g", "acido_graxo_20_1_g"],
  ["18:2 n-6_g", "acido_graxo_18_2_n_6_g"],
  ["18:3 n-3_g", "acido_graxo_18_3_n_3_g"],
  ["20:4_g", "acido_graxo_20_4_g"],
  ["20:5_g", "acido_graxo_20_5_g"],
  ["22:0_g", "acido_graxo_22_0_g"],
  ["22:5_g", "acido_graxo_22_5_g"],
  ["22:6_g", "acido_graxo_22_6_g"],
  ["24:0_g", "acido_graxo_24_0_g"],
  ["18:1t_g", "acido_graxo_18_1_trans_g"],
  ["18:2t_g", "acido_graxo_18_2_trans_g"],
  ["alanine_g", "alanina_g"],
  ["arginine_g", "arginina_g"],
  ["aspartic_g", "acido_aspartico_g"],
  ["cystine_g", "cistina_g"],
  ["glutamic_g", "acido_glutamico_g"],
  ["glycine_g", "glicina_g"],
  ["histidine_g", "histidina_g"],
  ["isoleucine_g", "isoleucina_g"],
  ["leucine_g", "leucina_g"],
  ["lysine_g", "lisina_g"],
  ["methionine_g", "metionina_g"],
  ["phenylalanine_g", "fenilalanina_g"],
  ["proline_g", "prolina_g"],
  ["serine_g", "serina_g"],
  ["threonine_g", "treonina_g"],
  ["tryptophan_g", "triptofano_g"],
  ["tyrosine_g", "tirosina_g"],
  ["valine_g", "valina_g"],
];

const COLUNAS_INSERT = [
  "taco_id",
  "descricao",
  "categoria",
  ...MAPEAMENTO_NUTRIENTES.map(([, coluna]) => coluna),
  "dados_origem",
];

const CHAVES_ORIGEM_ESPERADAS = new Set([
  "id",
  "description",
  "category",
  ...MAPEAMENTO_NUTRIENTES.map(([campo]) => campo),
]);

function criarRelatorio(registrosLidos) {
  return {
    registrosLidos,
    registrosEnviados: 0,
    inseridos: 0,
    atualizados: 0,
    errosConversao: 0,
    idsDuplicados: [],
    registrosInvalidos: [],
    valoresEspeciais: {},
  };
}

function resumirRelatorio(relatorio) {
  console.log(`Registros lidos: ${relatorio.registrosLidos}`);
  console.log(`Registros enviados: ${relatorio.registrosEnviados}`);
  console.log(`Inseridos: ${relatorio.inseridos}`);
  console.log(`Atualizados: ${relatorio.atualizados}`);
  console.log(`Erros de conversão: ${relatorio.errosConversao}`);
  console.log(`IDs duplicados: ${relatorio.idsDuplicados.length}`);
  console.log(`Registros inválidos: ${relatorio.registrosInvalidos.length}`);
  if (relatorio.idsDuplicados.length > 0) {
    console.error(
      `IDs duplicados encontrados: ${relatorio.idsDuplicados.join(", ")}`,
    );
  }
  if (relatorio.registrosInvalidos.length > 0) {
    console.error(
      `Detalhes dos registros inválidos: ${JSON.stringify(relatorio.registrosInvalidos)}`,
    );
  }
  console.log(
    `Valores especiais convertidos para NULL: ${JSON.stringify(relatorio.valoresEspeciais)}`,
  );
}

function registrarRegistroInvalido(relatorio, indice, motivo) {
  relatorio.registrosInvalidos.push({ indice: indice + 1, motivo });
}

function validarEPrepararRegistros(registros, relatorio) {
  const idsVistos = new Set();
  const idsDuplicados = new Set();
  const preparados = [];

  registros.forEach((registro, indice) => {
    const errosRegistro = [];
    if (!registro || typeof registro !== "object" || Array.isArray(registro)) {
      registrarRegistroInvalido(relatorio, indice, "Registro não é um objeto.");
      return;
    }

    if (!Number.isInteger(registro.id) || registro.id <= 0) {
      errosRegistro.push("id deve ser um inteiro positivo.");
    } else if (idsVistos.has(registro.id)) {
      idsDuplicados.add(registro.id);
      errosRegistro.push(`ID TACO duplicado: ${registro.id}.`);
    } else {
      idsVistos.add(registro.id);
    }

    if (
      typeof registro.description !== "string" ||
      !registro.description.trim()
    ) {
      errosRegistro.push("description deve ser uma string não vazia.");
    }
    if (typeof registro.category !== "string" || !registro.category.trim()) {
      errosRegistro.push("category deve ser uma string não vazia.");
    }

    const chavesRegistro = Object.keys(registro);
    const ausentes = [...CHAVES_ORIGEM_ESPERADAS].filter(
      (chave) => !Object.hasOwn(registro, chave),
    );
    const inesperadas = chavesRegistro.filter(
      (chave) => !CHAVES_ORIGEM_ESPERADAS.has(chave),
    );
    if (ausentes.length) {
      errosRegistro.push(`Campos ausentes: ${ausentes.join(", ")}.`);
    }
    if (inesperadas.length) {
      errosRegistro.push(`Campos não mapeados: ${inesperadas.join(", ")}.`);
    }

    const preparado = {
      taco_id: registro.id,
      descricao: registro.description,
      categoria: registro.category,
    };

    for (const [campoOrigem, coluna] of MAPEAMENTO_NUTRIENTES) {
      const valor = registro[campoOrigem];

      if (typeof valor === "number" && Number.isFinite(valor)) {
        // pg recebe string decimal para evitar conversões binárias adicionais.
        preparado[coluna] = String(valor);
      } else if (typeof valor === "string" && VALORES_ESPECIAIS.has(valor)) {
        preparado[coluna] = null;
        relatorio.valoresEspeciais[valor] =
          (relatorio.valoresEspeciais[valor] || 0) + 1;
      } else {
        preparado[coluna] = null;
        relatorio.errosConversao += 1;
        errosRegistro.push(
          `Valor nutricional inválido em ${campoOrigem}: ${JSON.stringify(valor)}.`,
        );
      }
    }

    preparado.dados_origem = JSON.stringify(registro);

    if (errosRegistro.length) {
      registrarRegistroInvalido(relatorio, indice, errosRegistro.join(" "));
      return;
    }

    preparados.push(preparado);
  });

  relatorio.idsDuplicados = [...idsDuplicados];
  return preparados;
}

function criarConsultaUpsert(registros) {
  const valores = [];
  const gruposValores = registros.map((registro, indiceRegistro) => {
    const primeiroParametro = indiceRegistro * COLUNAS_INSERT.length;
    const placeholders = COLUNAS_INSERT.map((_, indiceColuna) => {
      const parametro = primeiroParametro + indiceColuna + 1;
      return `$${parametro}`;
    });

    COLUNAS_INSERT.forEach((coluna) => valores.push(registro[coluna]));
    return `(${placeholders.join(", ")})`;
  });

  const atualizacoes = COLUNAS_INSERT.filter((coluna) => coluna !== "taco_id")
    .map((coluna) => `${coluna} = EXCLUDED.${coluna}`)
    .join(", ");

  const sql = `
    INSERT INTO public.alimentos (${COLUNAS_INSERT.join(", ")})
    VALUES ${gruposValores.join(", ")}
    ON CONFLICT (taco_id) DO UPDATE SET ${atualizacoes}
    RETURNING taco_id
  `;

  return { sql, valores };
}

async function importar() {
  const caminhoJson = new URL("../data/taco/TACO.json", import.meta.url);
  const conteudoJson = await readFile(caminhoJson, "utf8");
  const registros = JSON.parse(conteudoJson);
  const relatorio = criarRelatorio(
    Array.isArray(registros) ? registros.length : 0,
  );

  if (!Array.isArray(registros)) {
    resumirRelatorio(relatorio);
    throw new Error("A raiz de TACO.json precisa ser um array.");
  }

  const preparados = validarEPrepararRegistros(registros, relatorio);
  if (registros.length !== QUANTIDADE_ESPERADA) {
    registrarRegistroInvalido(
      relatorio,
      0,
      `Esperados ${QUANTIDADE_ESPERADA} registros, encontrados ${registros.length}.`,
    );
  }

  if (
    relatorio.registrosInvalidos.length > 0 ||
    relatorio.idsDuplicados.length > 0 ||
    relatorio.errosConversao > 0 ||
    preparados.length !== registros.length
  ) {
    resumirRelatorio(relatorio);
    throw new Error(
      "Validação cancelou a importação; nenhum registro foi enviado ao banco.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    resumirRelatorio(relatorio);
    throw new Error("Defina DATABASE_URL no ambiente antes de importar.");
  }

  const client = new Client({
    connectionString: databaseUrl,
    application_name: "que-fome-importar-taco",
  });

  try {
    await client.connect();
    await client.query("BEGIN");

    const ids = preparados.map((registro) => registro.taco_id);
    const existentes = await client.query(
      "SELECT taco_id FROM public.alimentos WHERE taco_id = ANY($1::integer[])",
      [ids],
    );
    relatorio.atualizados = existentes.rowCount;
    relatorio.inseridos = preparados.length - existentes.rowCount;

    let registrosRetornados = 0;
    for (let inicio = 0; inicio < preparados.length; inicio += TAMANHO_LOTE) {
      const lote = preparados.slice(inicio, inicio + TAMANHO_LOTE);
      const consulta = criarConsultaUpsert(lote);
      relatorio.registrosEnviados += lote.length;
      const resultado = await client.query(consulta.sql, consulta.valores);
      registrosRetornados += resultado.rowCount;
    }

    if (registrosRetornados !== preparados.length) {
      throw new Error(
        `O banco confirmou ${registrosRetornados} registros para ${preparados.length} enviados.`,
      );
    }

    await client.query("COMMIT");
    resumirRelatorio(relatorio);
  } catch (erro) {
    await client.query("ROLLBACK").catch(() => {});
    relatorio.inseridos = 0;
    relatorio.atualizados = 0;
    resumirRelatorio(relatorio);
    throw erro;
  } finally {
    await client.end();
  }
}

importar().catch((erro) => {
  console.error(`Falha na importação: ${erro.message}`);
  process.exitCode = 1;
});
