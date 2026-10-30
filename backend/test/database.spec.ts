import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createDatabaseSource } from "../src/database/data-source.js";
import { DatabaseService } from "../src/database/database.service.js";
import {
  User,
  Session,
  Ingredient,
  DATABASE_ENTITIES,
} from "../src/database/entities.js";

test("TypeORM inicia sem sincronizar, apagar, migrar ou instalar extensões", () => {
  const options = createDatabaseSource(
    "postgresql://example:example@127.0.0.1/example",
  ).options;
  assert.equal(options.synchronize, false);
  assert.equal(options.dropSchema, false);
  assert.equal(options.migrationsRun, false);
  assert.equal(
    (options as { installExtensions: boolean }).installExtensions,
    false,
  );
  assert.equal(DATABASE_ENTITIES.length, 8);
  assert.ok(
    DATABASE_ENTITIES.every((entity) => entity.options.synchronize === false),
  );
  assert.equal(User.options.columns.encrypted_password?.select, false);
  assert.equal(Session.options.columns.token_hash?.select, false);
  assert.equal(Ingredient.options.columns.receita_id?.primary, true);
  assert.equal(Ingredient.options.columns.ordem?.primary, true);
});

function withRunner(runner: object): DatabaseService {
  const database = Object.create(DatabaseService.prototype) as DatabaseService;
  Object.defineProperty(database, "dataSource", {
    value: { isInitialized: true, createQueryRunner: () => runner },
  });
  return database;
}

test("consulta SQL mantém parâmetros, linhas e quantidade afetada do QueryRunner", async () => {
  let released = false;
  const database = withRunner({
    query: async (sql: string, params: unknown[], structured: boolean) => {
      assert.equal(sql, "SELECT $1 AS value");
      assert.deepEqual(params, ["value"]);
      assert.equal(structured, true);
      return { records: [{ value: "value" }], affected: 1 };
    },
    release: async () => {
      released = true;
    },
  });
  assert.deepEqual(await database.query("SELECT $1 AS value", ["value"]), {
    rows: [{ value: "value" }],
    rowCount: 1,
  });
  assert.equal(released, true);
});

test("falhas em consultas e repositórios liberam a conexão e preservam o erro", async () => {
  let releases = 0;
  const failure = new Error("simulated");
  const database = withRunner({
    manager: {},
    query: async () => {
      throw failure;
    },
    release: async () => {
      releases++;
    },
  });
  await assert.rejects(
    database.query("SELECT 1"),
    (error) => error === failure,
  );
  await assert.rejects(
    database.withManager(async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
  assert.equal(releases, 2);
});

test("falha ao conectar não executa o cadastro e libera o QueryRunner", async () => {
  let called = false,
    released = false;
  const database = withRunner({
    isTransactionActive: false,
    connect: async () => {
      throw new Error("offline");
    },
    release: async () => {
      released = true;
    },
  });
  await assert.rejects(
    database.transaction(async () => {
      called = true;
    }),
  );
  assert.equal(called, false);
  assert.equal(released, true);
});

test("modo sem DATABASE_URL continua disponível para o catálogo TACO local", async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const database = new DatabaseService();
    await database.onModuleInit();
    assert.equal(database.isConfigured(), false);
    await assert.rejects(database.query("SELECT 1"), /DATABASE_URL/);
    await database.onModuleDestroy();
  } finally {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});
