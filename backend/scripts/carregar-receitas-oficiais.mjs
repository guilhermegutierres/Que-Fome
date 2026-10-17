import dotenv from "dotenv";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectDirectory = resolve(backendDirectory, "..");
dotenv.config({
  path: [
    resolve(backendDirectory, ".env.local"),
    resolve(backendDirectory, ".env"),
  ],
});

const RECIPE_IDS = new Set([
  "a1256dc6-a8d1-5c9b-8178-fc7b04c65a66",
  "ed2f05aa-a56e-5874-bd49-d8519c23b537",
  "b9acac73-45e7-53d3-b07c-7b3c3a73bbbe",
  "3f9bfa40-0b16-52d1-a83a-985aa5f83c55",
  "56947c03-6161-524c-961d-4524fe49a9f1",
  "8d360de1-da56-53d9-a63d-851fd2f6e4d0",
  "2037e7f9-e0e2-5578-94ae-eec70628087e",
  "fcf012f2-a4a5-50c4-a191-c808659fa701",
  "6d6c7d73-f17b-5ad0-b8e0-30fd60c2608b",
  "18d5391c-b1f5-5937-8812-5065671eff72",
  "e9986f08-5da7-5864-a040-f4d70d02d7a2",
  "c2805bab-5312-550b-aa31-9959bfc67c58",
  "6c812152-45f3-5758-9995-b19b1ac7370b",
  "9509bc58-a5fe-59cd-a836-8b75dd86f153",
  "2044f5d7-5a64-5d51-81dc-708a07b69b13",
  "fdfc771d-3293-59b2-a33e-4b723df2c932",
  "48a5bb44-f4b9-511f-888f-107f64dd25fe",
  "086714fe-796f-5301-83e2-aa8045811063",
  "e282c1d2-8ee1-5363-bc7f-4f0cfef9f418",
  "f7bc0fe1-cdc8-5d1f-bb34-6345db91c0ec",
  "92b9caab-b683-59d9-a4af-9396e0448681",
  "1e7de690-cdc7-5f23-a543-d585df9ca8e2",
]);

const APPROVED_TACO_DESCRIPTIONS = new Map([
  [4, "Arroz, tipo 1, cru"],
  [34, "Farinha, de rosca"],
  [35, "Farinha, de trigo"],
  [40, "Macarrão, trigo, cru"],
  [45, "Milho, verde, enlatado, drenado"],
  [71, "Abobrinha, italiana, crua"],
  [82, "Alho, cru"],
  [92, "Batata, inglesa, crua"],
  [107, "Cebola, crua"],
  [110, "Cenoura, crua"],
  [113, "Chuchu, cru"],
  [122, "Farinha, de mandioca, torrada"],
  [130, "Mandioca, crua"],
  [142, "Pepino, cru"],
  [144, "Pimentão, verde, cru"],
  [153, "Salsa, crua"],
  [157, "Tomate, com semente, cru"],
  [159, "Tomate, molho industrializado"],
  [175, "Banana, da terra, crua"],
  [215, "Laranja, pêra, suco"],
  [220, "Limão, tahiti, cru"],
  [260, "Azeite, de oliva, extra virgem"],
  [261, "Manteiga, com sal"],
  [272, "Óleo, de soja"],
  [285, "Camarão, Rio Grande, grande, cru"],
  [302, "Merluza, filé, cru"],
  [339, "Carne, bovina, charque, cru"],
  [376, "Carne, bovina, patinho, sem gordura, cru"],
  [409, "Frango, peito, sem pele, cru"],
  [447, "Creme de Leite"],
  [453, "Leite, condensado"],
  [463, "Queijo, mozarela"],
  [464, "Queijo, parmesão"],
  [489, "Ovo, de galinha, inteiro, cru"],
  [492, "Açúcar, cristal"],
  [494, "Açúcar, refinado"],
  [513, "Fermento em pó, químico"],
]);

const REQUIRED_RECIPE_FIELDS = [
  "id",
  "tipo",
  "autorId",
  "titulo",
  "categoria",
  "descricao",
  "descricaoCompleta",
  "tempoMinutos",
  "porcoes",
  "dificuldade",
  "custo",
  "imagemPath",
  "ingredientes",
  "modoPreparo",
];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function validateRecipes(recipes, tacoFoods, allowedTags) {
  if (!Array.isArray(recipes) || recipes.length !== RECIPE_IDS.size) {
    throw new Error(
      "O arquivo deve conter exatamente as 22 receitas oficiais esperadas.",
    );
  }

  const seenIds = new Set();
  for (const recipe of recipes) {
    for (const field of REQUIRED_RECIPE_FIELDS) {
      if (!(field in recipe)) {
        throw new Error(
          `Receita inválida: campo obrigatório ausente (${field}).`,
        );
      }
    }
    if (!RECIPE_IDS.has(recipe.id) || seenIds.has(recipe.id)) {
      throw new Error(
        "O arquivo contém ID ausente, duplicado ou fora da lista oficial permitida.",
      );
    }
    seenIds.add(recipe.id);

    if (recipe.tipo !== "oficial" || recipe.autorId !== null) {
      throw new Error(
        "As receitas da carga devem ser oficiais e não ter autor pessoal.",
      );
    }
    if (
      recipe.porcoes !== null &&
      (!Number.isInteger(recipe.porcoes) || recipe.porcoes < 1)
    ) {
      throw new Error(
        `Receita ${recipe.id}: porções deve ser nulo ou inteiro positivo.`,
      );
    }
    if (
      !Array.isArray(recipe.ingredientes) ||
      !Array.isArray(recipe.modoPreparo)
    ) {
      throw new Error(
        `Receita ${recipe.id}: ingredientes e etapas devem ser listas.`,
      );
    }
    if (
      !Array.isArray(recipe.tags) ||
      recipe.tags.length > 12 ||
      recipe.tags.some((tag) => !allowedTags.has(tag)) ||
      new Set(recipe.tags).size !== recipe.tags.length
    ) {
      throw new Error(
        `Receita ${recipe.id}: lista de tags ausente, duplicada ou inválida.`,
      );
    }

    for (const [index, ingredient] of recipe.ingredientes.entries()) {
      if (
        ingredient.ordem !== index + 1 ||
        !ingredient.nome?.trim() ||
        !ingredient.quantidade?.trim() ||
        !ingredient.textoExibicao?.trim()
      ) {
        throw new Error(
          `Receita ${recipe.id}: ingrediente ${index + 1} inválido ou fora de ordem.`,
        );
      }
      if (ingredient.tacoId !== null) {
        if (
          !Number.isInteger(ingredient.tacoId) ||
          !APPROVED_TACO_DESCRIPTIONS.has(ingredient.tacoId) ||
          tacoFoods.get(ingredient.tacoId) !==
            APPROVED_TACO_DESCRIPTIONS.get(ingredient.tacoId)
        ) {
          throw new Error(
            `Receita ${recipe.id}: taco_id não confirmado na base TACO local.`,
          );
        }
        if (!Number.isFinite(ingredient.gramas) || ingredient.gramas <= 0) {
          throw new Error(
            `Receita ${recipe.id}: ingrediente TACO exige gramas finitas e positivas.`,
          );
        }
      }
      if (
        ingredient.gramas !== null &&
        (!Number.isFinite(ingredient.gramas) || ingredient.gramas <= 0)
      ) {
        throw new Error(
          `Receita ${recipe.id}: gramas devem ser nulas ou finitas e positivas.`,
        );
      }
      if (
        typeof ingredient.gramasEstimadas !== "boolean" ||
        (ingredient.gramasEstimadas && ingredient.gramas === null)
      ) {
        throw new Error(
          `Receita ${recipe.id}: indicador de estimativa inconsistente.`,
        );
      }
    }

    if (
      recipe.modoPreparo.some(
        (step) => typeof step !== "string" || !step.trim(),
      )
    ) {
      throw new Error(`Receita ${recipe.id}: etapa vazia ou inválida.`);
    }
  }

  if (seenIds.size !== RECIPE_IDS.size) {
    throw new Error("Uma ou mais receitas oficiais previstas estão ausentes.");
  }
}

async function validateLocalImages(recipes) {
  for (const recipe of recipes) {
    if (!recipe.imagemPath?.startsWith("/images/receitas/")) continue;
    if (!/^\/images\/receitas\/[a-z0-9-]+\.jpg$/i.test(recipe.imagemPath)) {
      throw new Error(
        `Receita ${recipe.id}: caminho de imagem local fora do padrão.`,
      );
    }
    await access(
      resolve(projectDirectory, "public", recipe.imagemPath.slice(1)),
    );
  }
}

async function insertRecipe(client, recipe) {
  const result = await client.query(
    `INSERT INTO public.receitas (
       id, tipo, autor_id, titulo, categoria, descricao, descricao_completa,
       tempo_minutos, porcoes, dificuldade, custo, imagem_path, tags
     ) VALUES ($1, 'oficial', NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       tipo = EXCLUDED.tipo,
       autor_id = EXCLUDED.autor_id,
       titulo = EXCLUDED.titulo,
       categoria = EXCLUDED.categoria,
       descricao = EXCLUDED.descricao,
       descricao_completa = EXCLUDED.descricao_completa,
       tempo_minutos = EXCLUDED.tempo_minutos,
       porcoes = EXCLUDED.porcoes,
       dificuldade = EXCLUDED.dificuldade,
       custo = EXCLUDED.custo,
       imagem_path = EXCLUDED.imagem_path,
       tags = EXCLUDED.tags
     WHERE public.receitas.tipo = 'oficial'
       AND public.receitas.autor_id IS NULL
     RETURNING id`,
    [
      recipe.id,
      recipe.titulo,
      recipe.categoria,
      recipe.descricao,
      recipe.descricaoCompleta,
      recipe.tempoMinutos,
      recipe.porcoes,
      recipe.dificuldade,
      recipe.custo,
      recipe.imagemPath,
      recipe.tags,
    ],
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `ID oficial ${recipe.id} já está ocupado por um registro incompatível.`,
    );
  }

  await client.query(
    "DELETE FROM public.receita_ingredientes WHERE receita_id = $1",
    [recipe.id],
  );
  for (const ingredient of recipe.ingredientes) {
    await client.query(
      `INSERT INTO public.receita_ingredientes (
         receita_id, ordem, nome, quantidade, texto_exibicao,
         taco_id, gramas, gramas_estimadas
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        recipe.id,
        ingredient.ordem,
        ingredient.nome,
        ingredient.quantidade,
        ingredient.textoExibicao,
        ingredient.tacoId,
        ingredient.gramas,
        ingredient.gramasEstimadas,
      ],
    );
  }

  await client.query(
    "DELETE FROM public.receita_etapas WHERE receita_id = $1",
    [recipe.id],
  );
  for (const [index, instruction] of recipe.modoPreparo.entries()) {
    await client.query(
      `INSERT INTO public.receita_etapas (receita_id, ordem, instrucao)
       VALUES ($1, $2, $3)`,
      [recipe.id, index + 1, instruction],
    );
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não está configurada no ambiente do backend.",
    );
  }

  const [recipes, tacoRows, tagsConfig] = await Promise.all([
    readJson(resolve(backendDirectory, "data", "receitas-oficiais.json")),
    readJson(resolve(backendDirectory, "data", "taco", "TACO.json")),
    readJson(resolve(backendDirectory, "data", "tags-receitas.json")),
  ]);
  const tacoFoods = new Map(
    tacoRows.map((food) => [food.id, food.description]),
  );
  const allowedTags = new Set(tagsConfig.tags.map((tag) => tag.id));
  validateRecipes(recipes, tacoFoods, allowedTags);
  await validateLocalImages(recipes);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    for (const recipe of recipes) await insertRecipe(client, recipe);
    await client.query("COMMIT");
    console.info(
      "Carga oficial concluída: 22 receitas processadas em uma transação.",
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

main().catch((error) => {
  if (error instanceof Error && error.message.startsWith("O arquivo")) {
    console.error(error.message);
  } else if (error instanceof Error && error.message.includes("taco_id")) {
    console.error(error.message);
  } else if (error instanceof Error && error.message.includes("DATABASE_URL")) {
    console.error(error.message);
  } else if (error instanceof Error && error.message.includes("porções")) {
    console.error(error.message);
  } else if (error instanceof Error && error.message.includes("imagem")) {
    console.error(error.message);
  } else if (error instanceof Error && error.message.includes("ID oficial")) {
    console.error(error.message);
  } else if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String(error.code) === "42703"
  ) {
    console.error(
      "O schema de receitas está desatualizado. Confirme se a migration 20261016040000_add_recipe_tags.sql foi aplicada antes da carga.",
    );
  } else {
    console.error(
      "Falha ao preparar a carga das receitas oficiais; detalhes internos omitidos.",
    );
  }
  process.exitCode = 1;
});
