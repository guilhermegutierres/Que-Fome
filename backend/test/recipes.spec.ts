import "reflect-metadata";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import type { ExecutionContext } from "@nestjs/common";
import { validate } from "class-validator";
import type { QueryResult, QueryResultRow } from "pg";
import { describe, it } from "node:test";
import type { AuthenticatedRequest } from "../src/auth/authenticated-user.js";
import { SupabaseAuthGuard } from "../src/auth/supabase-auth.guard.js";
import type { SupabaseAuthService } from "../src/auth/supabase-auth.service.js";
import { DatabaseService } from "../src/database/database.service.js";
import { CreateRecipeDto } from "../src/recipes/dto/create-recipe.dto.js";
import { ListRecipesQueryDto } from "../src/recipes/dto/list-recipes-query.dto.js";
import { UpdateRecipeDto } from "../src/recipes/dto/update-recipe.dto.js";
import { RecipesController } from "../src/recipes/recipes.controller.js";
import { RecipesService } from "../src/recipes/recipes.service.js";
import { RECIPE_TAG_IDS } from "../src/recipes/recipe-tags.js";

const authorId = "d9428888-122b-4fc5-8d2f-47f50f1c1f78";
const otherAuthorId = "b1238888-122b-4fc5-8d2f-47f50f1c1f78";
const recipeId = "4d11767c-c263-4a42-9b3a-18db42d51001";

const recipeRow = {
  id: recipeId,
  tipo: "usuario",
  autor_id: authorId,
  autor_nome: "Autora de teste",
  titulo: "Salada de teste",
  categoria: "Saladas",
  descricao: "Descrição curta",
  descricao_completa: "Descrição completa",
  tempo_minutos: 12,
  porcoes: 4,
  dificuldade: "Fácil",
  custo: null,
  imagem_path: "recipes/salada.webp",
  tags: ["legumes", "vegetariano"],
  created_at: new Date("2026-10-01T00:00:00.000Z"),
  updated_at: new Date("2026-10-02T00:00:00.000Z"),
  ingredientes_detalhados: [
    {
      nome: "Tomate",
      quantidade: "2 unidades",
      tacoId: null,
      tacoDescricao: null,
      gramas: null,
      textoExibicao: null,
      gramasEstimadas: false,
    },
  ],
  modo_preparo: ["Corte o tomate."],
};

const validCreateBody = {
  titulo: " Salada de teste ",
  categoria: " Saladas ",
  descricao: "Descrição curta",
  descricaoCompleta: "Descrição completa",
  tempo: "12 min",
  porcoes: "4",
  dificuldade: "Fácil",
  custo: "",
  imagemPath: "recipes/salada.webp",
  ingredientes: ["2 unidades Tomate"],
  ingredientesDetalhados: [
    {
      nome: " Tomate ",
      quantidade: " 2 unidades ",
      textoExibicao: " 2 tomates frescos ",
    },
    {
      nome: "Arroz",
      quantidade: "100 g",
      tacoId: 1,
      tacoDescricao: "Rótulo enviado não é fonte confiável",
      gramas: "100",
      textoExibicao: "Arroz cozido original",
      gramasEstimadas: true,
    },
  ],
  modoPreparo: [" Corte o tomate. "],
  tags: ["legume", "VEGETARIÁNO"],
};

function queryResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return { rows } as QueryResult<T>;
}

function validationOptions() {
  return { whitelist: true, forbidNonWhitelisted: true };
}

function makeRecipeDatabase(options?: {
  updateRows?: Array<{ id: string }>;
  deleteRows?: Array<{ id: string }>;
  failOn?: string;
  failCode?: string;
}) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const transactionEvents: string[] = [];
  const database = {
    isConfigured: () => true,
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("COUNT(*)")) return queryResult([{ total: "1" }]);
      if (sql.includes("FROM public.receitas") && sql.includes("LIMIT"))
        return queryResult([recipeRow]);
      if (sql.includes("WHERE r.id = $1")) return queryResult([recipeRow]);
      return queryResult([]);
    },
    transaction: async <T>(operation: (client: never) => Promise<T>) => {
      const client = {
        query: async (sql: string, params: unknown[] = []) => {
          queries.push({ sql, params });
          if (options?.failOn && sql.includes(options.failOn)) {
            throw Object.assign(new Error("sensitive database detail"), {
              code: options.failCode ?? "XX000",
            });
          }
          if (sql.includes("WHERE r.id = $1")) return queryResult([recipeRow]);
          if (sql.startsWith("UPDATE public.receitas"))
            return queryResult(options?.updateRows ?? [{ id: recipeId }]);
          if (sql.startsWith("DELETE FROM public.receitas"))
            return queryResult(options?.deleteRows ?? [{ id: recipeId }]);
          if (sql.startsWith("INSERT INTO public.receitas"))
            return queryResult([{ id: recipeId }]);
          return queryResult([]);
        },
      };
      transactionEvents.push("BEGIN");
      try {
        const result = await operation(client as never);
        transactionEvents.push("COMMIT");
        return result;
      } catch (error) {
        transactionEvents.push("ROLLBACK");
        throw error;
      }
    },
  };
  return { database: database as never, queries, transactionEvents };
}

describe("Recipes API", () => {
  it("validates and normalizes the current recipe form shape", async () => {
    const dto = plainToInstance(CreateRecipeDto, validCreateBody);
    assert.deepEqual(await validate(dto, validationOptions()), []);
    assert.equal(dto.titulo, "Salada de teste");
    assert.equal(dto.tempo, 12);
    assert.equal(dto.porcoes, 4);
    assert.equal(dto.custo, null);
    assert.equal(dto.ingredientesDetalhados[1].gramas, 100);
    assert.equal(
      dto.ingredientesDetalhados[0].textoExibicao,
      "2 tomates frescos",
    );
    assert.equal(dto.ingredientesDetalhados[1].gramasEstimadas, true);
    assert.deepEqual(dto.tags, ["legumes", "vegetariano"]);
  });

  it("accepts Lanches as a category and Tomate as a controlled tag", async () => {
    const dto = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      categoria: "Lanches",
      tags: ["Tomate"],
    });

    assert.deepEqual(await validate(dto, validationOptions()), []);
    assert.equal(dto.categoria, "Lanches");
    assert.deepEqual(dto.tags, ["tomate"]);
    assert.ok(RECIPE_TAG_IDS.includes("tomate"));
  });

  it("normalizes allowed tags and rejects invalid or duplicate tags", async () => {
    const validTags = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      tags: ["Camarão", "Carne seca", "Legume", "Vegetarianos"],
    });
    assert.deepEqual(await validate(validTags, validationOptions()), []);
    assert.deepEqual(validTags.tags, [
      "camarao",
      "carne-seca",
      "legumes",
      "vegetariano",
    ]);
    assert.ok(RECIPE_TAG_IDS.includes("camarao"));

    const duplicates = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      tags: ["Camarão", "camarao"],
    });
    assert.ok((await validate(duplicates, validationOptions())).length > 0);

    const invalid = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      tags: ["sem glúten"],
    });
    assert.ok((await validate(invalid, validationOptions())).length > 0);
  });

  it("normalizes and validates tags in recipe edits", async () => {
    const dto = plainToInstance(UpdateRecipeDto, { tags: ["Carnes", "ovo"] });
    assert.deepEqual(await validate(dto, validationOptions()), []);
    assert.deepEqual(dto.tags, ["carne", "ovo"]);
  });

  it("rejects non-finite grams, TACO ingredients without grams, and client identity fields", async () => {
    const nonFinite = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      ingredientesDetalhados: [
        { nome: "Arroz", quantidade: "100 g", tacoId: 1, gramas: "Infinity" },
      ],
    });
    assert.ok((await validate(nonFinite, validationOptions())).length > 0);

    const missingGrams = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      ingredientesDetalhados: [
        { nome: "Arroz", quantidade: "100 g", tacoId: 1 },
      ],
    });
    assert.ok((await validate(missingGrams, validationOptions())).length > 0);

    const forgedIdentity = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      autorId: otherAuthorId,
      tipo: "oficial",
    });
    const errors = await validate(forgedIdentity, validationOptions());
    assert.ok(errors.some((error) => error.property === "autorId"));
    assert.ok(errors.some((error) => error.property === "tipo"));

    const estimatedWithoutWeight = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      ingredientesDetalhados: [
        { nome: "Tomate", quantidade: "1 unidade", gramasEstimadas: true },
      ],
    });
    assert.ok(
      (await validate(estimatedWithoutWeight, validationOptions())).length > 0,
    );

    const invalidServings = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      porcoes: 0,
    });
    assert.ok(
      (await validate(invalidServings, validationOptions())).length > 0,
    );
  });

  it("leaves public recipe listing unauthenticated and paginates", async () => {
    const { database, queries } = makeRecipeDatabase();
    const service = new RecipesService(database);
    const query = plainToInstance(ListRecipesQueryDto, {
      page: "2",
      limit: "10",
    });
    const result = await service.listPublished(query);

    assert.equal(result.page, 2);
    assert.equal(result.limit, 10);
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, recipeId);
    assert.deepEqual(result.items[0].tags, ["legumes", "vegetariano"]);
    assert.ok(!queries.some(({ sql }) => /autor_id\s*=/.test(sql)));
    assert.deepEqual(queries[1].params, [10, 10]);
  });

  it("lists only the authenticated user's recipes", async () => {
    const { database, queries } = makeRecipeDatabase();
    const service = new RecipesService(database);
    await service.listMine(authorId, plainToInstance(ListRecipesQueryDto, {}));

    assert.match(queries[0].sql, /r\.tipo = 'usuario' AND r\.autor_id = \$1/);
    assert.deepEqual(queries[0].params, [authorId]);
  });

  it("returns detailed fields with UUID strings and TACO descriptions from the database", async () => {
    const { database } = makeRecipeDatabase();
    const service = new RecipesService(database);
    const recipe = await service.getById(recipeId);

    assert.equal(recipe.id, recipeId);
    assert.equal(typeof recipe.id, "string");
    assert.equal(recipe.autorId, authorId);
    assert.equal(recipe.tempo, "12 min");
    assert.equal(recipe.porcoes, 4);
    assert.equal(recipe.imagemPath, "recipes/salada.webp");
    assert.deepEqual(recipe.tags, ["legumes", "vegetariano"]);
    assert.deepEqual(recipe.ingredientes, ["2 unidades Tomate"]);
    assert.deepEqual(recipe.modoPreparo, ["Corte o tomate."]);
  });

  it("returns display text and estimated-weight metadata when stored", async () => {
    const database = {
      isConfigured: () => true,
      query: async () =>
        queryResult([
          {
            ...recipeRow,
            ingredientes_detalhados: [
              {
                nome: "Tomate",
                quantidade: "1 unidade",
                tacoId: 157,
                tacoDescricao: "Tomate, com semente, cru",
                gramas: "120",
                textoExibicao: "1 tomate médio, picado",
                gramasEstimadas: true,
              },
            ],
          },
        ]),
    };
    const recipe = await new RecipesService(database as never).getById(
      recipeId,
    );

    assert.deepEqual(recipe.ingredientes, ["1 tomate médio, picado"]);
    assert.equal(
      recipe.ingredientesDetalhados[0].textoExibicao,
      "1 tomate médio, picado",
    );
    assert.equal(recipe.ingredientesDetalhados[0].gramasEstimadas, true);
    assert.equal(recipe.ingredientesDetalhados[0].gramas, 120);
  });

  it("returns an empty tag list for rows predating tag data", async () => {
    const database = {
      isConfigured: () => true,
      query: async () => queryResult([{ ...recipeRow, tags: null }]),
    };
    const recipe = await new RecipesService(database as never).getById(
      recipeId,
    );
    assert.deepEqual(recipe.tags, []);
  });

  it("returns 404 for a missing recipe", async () => {
    const database = {
      isConfigured: () => true,
      query: async () => queryResult([]),
    };
    const service = new RecipesService(database as never);
    await assert.rejects(service.getById(recipeId), NotFoundException);
  });

  it("creates a user recipe using only the authenticated author UUID", async () => {
    const { database, queries, transactionEvents } = makeRecipeDatabase();
    const service = new RecipesService(database);
    const dto = plainToInstance(CreateRecipeDto, validCreateBody);
    await service.create(authorId, dto);

    const insert = queries.find(({ sql }) =>
      sql.includes("INSERT INTO public.receitas"),
    );
    assert.ok(insert);
    assert.match(insert.sql, /'usuario'/);
    assert.deepEqual(insert.params[10], ["legumes", "vegetariano"]);
    assert.deepEqual(insert.params.slice(0, 2), [authorId, "Salada de teste"]);
    assert.equal(insert.params[6], 4);
    assert.ok(
      queries.some(({ sql }) =>
        sql.includes("INSERT INTO public.receita_ingredientes"),
      ),
    );
    assert.ok(
      queries.some(({ sql }) =>
        sql.includes("INSERT INTO public.receita_etapas"),
      ),
    );
    assert.ok(
      queries.some(
        ({ sql, params }) =>
          sql.includes("INSERT INTO public.receita_ingredientes") &&
          params.join("|") ===
            `${recipeId}|2|Arroz|100 g|1|100|Arroz cozido original|true`,
      ),
    );
    assert.deepEqual(transactionEvents, ["BEGIN", "COMMIT"]);
  });

  it("replaces ordered ingredients and steps atomically when editing", async () => {
    const { database, queries, transactionEvents } = makeRecipeDatabase();
    const service = new RecipesService(database);
    const dto = plainToInstance(UpdateRecipeDto, {
      tempo: "20 min",
      porcoes: "6",
      custo: null,
      ingredientesDetalhados: [{ nome: "Feijão", quantidade: "1 concha" }],
      modoPreparo: ["Aqueça o feijão."],
    });
    assert.deepEqual(await validate(dto, validationOptions()), []);

    await service.update(recipeId, authorId, dto);
    const update = queries.find(({ sql }) =>
      sql.startsWith("UPDATE public.receitas"),
    );
    assert.ok(update);
    assert.match(update.sql, /tempo_minutos = \$3/);
    assert.match(update.sql, /porcoes = \$4/);
    assert.match(update.sql, /updated_at = pg_catalog\.now\(\)/);
    assert.ok(
      queries.some(({ sql }) =>
        sql.includes("DELETE FROM public.receita_ingredientes"),
      ),
    );
    assert.ok(
      queries.some(({ sql }) =>
        sql.includes("DELETE FROM public.receita_etapas"),
      ),
    );
    assert.deepEqual(transactionEvents, ["BEGIN", "COMMIT"]);
  });

  it("updates only a user recipe owned by the authenticated UUID", async () => {
    const { database, queries } = makeRecipeDatabase({ updateRows: [] });
    const service = new RecipesService(database);
    const dto = plainToInstance(UpdateRecipeDto, { titulo: "Alterada" });

    await assert.rejects(
      service.update(recipeId, otherAuthorId, dto),
      NotFoundException,
    );
    const update = queries.find(({ sql }) =>
      sql.startsWith("UPDATE public.receitas"),
    );
    assert.ok(update);
    assert.match(
      update.sql,
      /id = \$1 AND tipo = 'usuario' AND autor_id = \$2/,
    );
    assert.deepEqual(update.params.slice(0, 2), [recipeId, otherAuthorId]);
  });

  it("persists normalized tags on user recipe updates", async () => {
    const { database, queries } = makeRecipeDatabase();
    const service = new RecipesService(database);
    const dto = plainToInstance(UpdateRecipeDto, {
      tags: ["Carne seca", "Cogumelo"],
    });
    assert.deepEqual(await validate(dto, validationOptions()), []);

    await service.update(recipeId, authorId, dto);
    const update = queries.find(({ sql }) =>
      sql.startsWith("UPDATE public.receitas"),
    );
    assert.ok(update?.sql.includes("tags = $3"));
    assert.deepEqual(update?.params, [
      recipeId,
      authorId,
      ["carne-seca", "cogumelos"],
    ]);
  });

  it("does not expose official recipes for user editing", async () => {
    const { database, queries } = makeRecipeDatabase({ updateRows: [] });
    const service = new RecipesService(database);
    const dto = plainToInstance(UpdateRecipeDto, { descricao: "Tentativa" });

    await assert.rejects(
      service.update(recipeId, authorId, dto),
      NotFoundException,
    );
    assert.match(
      queries[0].sql,
      /id = \$1 AND tipo = 'usuario' AND autor_id = \$2/,
    );
  });

  it("deletes only a user recipe owned by the authenticated UUID", async () => {
    const { database, queries } = makeRecipeDatabase({ deleteRows: [] });
    const service = new RecipesService(database);

    await assert.rejects(
      service.delete(recipeId, otherAuthorId),
      NotFoundException,
    );
    assert.match(
      queries[0].sql,
      /id = \$1 AND tipo = 'usuario' AND autor_id = \$2/,
    );
    assert.deepEqual(queries[0].params, [recipeId, otherAuthorId]);
  });

  it("deletes an owned recipe in a transaction", async () => {
    const { database, queries, transactionEvents } = makeRecipeDatabase();
    const service = new RecipesService(database);

    await service.delete(recipeId, authorId);
    assert.match(
      queries[0].sql,
      /id = \$1 AND tipo = 'usuario' AND autor_id = \$2/,
    );
    assert.deepEqual(queries[0].params, [recipeId, authorId]);
    assert.deepEqual(transactionEvents, ["BEGIN", "COMMIT"]);
  });

  it("rejects a TACO foreign key that does not exist and rolls back", async () => {
    const { database, transactionEvents } = makeRecipeDatabase({
      failOn: "INSERT INTO public.receita_ingredientes",
      failCode: "23503",
    });
    const service = new RecipesService(database);
    const dto = plainToInstance(CreateRecipeDto, validCreateBody);

    await assert.rejects(service.create(authorId, dto), (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.ok(!error.message.includes("sensitive database detail"));
      return true;
    });
    assert.deepEqual(transactionEvents, ["BEGIN", "ROLLBACK"]);
  });

  it("rolls back recipe and child writes when a step insert fails", async () => {
    const { database, transactionEvents } = makeRecipeDatabase({
      failOn: "INSERT INTO public.receita_etapas",
    });
    const service = new RecipesService(database);
    const dto = plainToInstance(CreateRecipeDto, validCreateBody);

    await assert.rejects(service.create(authorId, dto), (error: unknown) => {
      assert.ok(error instanceof InternalServerErrorException);
      assert.ok(!error.message.includes("sensitive database detail"));
      return true;
    });
    assert.deepEqual(transactionEvents, ["BEGIN", "ROLLBACK"]);
  });

  it("rejects empty updates and legacy data URLs", async () => {
    const { database } = makeRecipeDatabase();
    const service = new RecipesService(database);
    await assert.rejects(
      service.update(recipeId, authorId, plainToInstance(UpdateRecipeDto, {})),
      BadRequestException,
    );

    const imageDto = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      imagemPath: "data:image/png;base64,abc",
    });
    assert.ok((await validate(imageDto, validationOptions())).length > 0);

    const legacyImageField = plainToInstance(CreateRecipeDto, {
      ...validCreateBody,
      imagem: "data:image/png;base64,abc",
    });
    assert.ok(
      (await validate(legacyImageField, validationOptions())).some(
        (error) => error.property === "imagem",
      ),
    );
  });

  it("protects private operations with the existing bearer guard", async () => {
    assert.deepEqual(
      Reflect.getMetadata(GUARDS_METADATA, RecipesController.prototype.create),
      [SupabaseAuthGuard],
    );
    assert.deepEqual(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RecipesController.prototype.listMine,
      ),
      [SupabaseAuthGuard],
    );
    assert.deepEqual(
      Reflect.getMetadata(GUARDS_METADATA, RecipesController.prototype.update),
      [SupabaseAuthGuard],
    );
    assert.deepEqual(
      Reflect.getMetadata(GUARDS_METADATA, RecipesController.prototype.delete),
      [SupabaseAuthGuard],
    );
    assert.equal(
      Reflect.getMetadata(GUARDS_METADATA, RecipesController.prototype.list),
      undefined,
    );

    const guard = new SupabaseAuthGuard({
      validateAccessToken: async () => null,
    } as unknown as SupabaseAuthService);
    const request: AuthenticatedRequest = { headers: {} };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    await assert.rejects(guard.canActivate(context), UnauthorizedException);
  });

  it("rolls back and releases a PostgreSQL transaction client on failure", async () => {
    const statements: string[] = [];
    let released = false;
    const client = {
      query: async (sql: string) => {
        statements.push(sql);
        if (sql === "COMMIT") throw new Error("simulated commit failure");
        return { rows: [] };
      },
      release: () => {
        released = true;
      },
    };
    const database = Object.create(
      DatabaseService.prototype,
    ) as DatabaseService;
    Object.defineProperty(database, "pool", {
      value: { connect: async () => client },
    });

    await assert.rejects(database.transaction(async () => "result"));
    assert.deepEqual(statements, ["BEGIN", "COMMIT", "ROLLBACK"]);
    assert.equal(released, true);
  });
});
