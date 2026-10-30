// Execute após npm run build, dentro de backend. Todos os dados são revertidos.
import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, access, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { NestFactory } from "@nestjs/core";

dotenv.config({ path: [".env.local", ".env"] });

test(
  "API local + PostgreSQL: autenticação, receitas, imagens e integridade (ROLLBACK)",
  {
    skip: !process.env.DATABASE_URL
      ? "Configure DATABASE_URL no backend/.env"
      : false,
    timeout: 120000,
  },
  async (t) => {
    const uploadRoot = await mkdtemp(join(tmpdir(), "que-fome-integration-"));
    const previousUpload = process.env.UPLOAD_DIR;
    const previousOrigins = process.env.CORS_ORIGIN;
    const previousSource = process.env.ALIMENTOS_SOURCE;
    process.env.UPLOAD_DIR = uploadRoot;
    process.env.CORS_ORIGIN = "http://localhost:5173";
    process.env.ALIMENTOS_SOURCE = "postgres";
    const { AppModule } = await import("../dist/app.module.js");
    const { DatabaseService } =
      await import("../dist/database/database.service.js");
    const { configureApp } = await import("../dist/configure-app.js");
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
    const client = await pool.connect();
    let app;
    let before;
    let failSession = false;
    let savepoint = 0;
    let operationQueue = Promise.resolve();
    const testRuntimeRole = process.env.TEST_RUNTIME_ROLE === "1";
    const tables = [
      "auth.users",
      "auth.identities",
      "public.profiles",
      "public.app_sessions",
      "public.receitas",
      "public.receita_ingredientes",
      "public.receita_etapas",
      "public.alimentos",
    ];
    async function snapshot() {
      const values = [];
      for (const table of tables) {
        // Somente nomes constantes acima; nenhum conteúdo sensível é retornado.
        const result = await client.query(`SELECT count(*)::int AS count,
        md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY row_to_json(t)::text), '')) AS fingerprint
        FROM ${table} t`);
        values.push(result.rows[0]);
      }
      return values;
    }
    try {
      before = await snapshot();
      await client.query("BEGIN");
      if (testRuntimeRole) {
        const proposal = await readFile(
          new URL(
            "../migrations/002_runtime_role.example.sql",
            import.meta.url,
          ),
          "utf8",
        );
        // Criação e GRANTs também ficam dentro do ROLLBACK externo.
        await client.query(
          proposal.replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, ""),
        );
      }
      app = await NestFactory.create(AppModule, { logger: false });
      const database = app.get(DatabaseService);
      await database.onModuleInit();
      // SQL, repositories e transações reais do TypeORM usam a conexão que
      // está dentro do ROLLBACK externo. Os COMMITs viram savepoints aninhados.
      const runner = database.dataSource.createQueryRunner();
      runner.connect = async () => client;
      runner.release = async () => undefined;
      runner.isTransactionActive = true;
      runner.transactionDepth = 1;
      const ormQuery = runner.query.bind(runner);
      runner.query = async (sql, params, structured) => {
        if (failSession && sql.includes("INSERT INTO public.app_sessions")) {
          throw Object.assign(new Error("Falha simulada de sessão"), {
            code: "42P01",
          });
        }
        return ormQuery(sql, params, structured);
      };
      database.dataSource.createQueryRunner = () => runner;
      function schedule(operation) {
        const next = operationQueue.then(operation);
        operationQueue = next.catch(() => undefined);
        return next;
      }
      async function scopedOperation(operation) {
        const name = `integration_${++savepoint}`;
        await client.query(`SAVEPOINT ${name}`);
        try {
          if (testRuntimeRole)
            await client.query("SET LOCAL ROLE que_fome_runtime");
          const value = await operation();
          if (testRuntimeRole) await client.query("SET LOCAL ROLE NONE");
          await client.query(`RELEASE SAVEPOINT ${name}`);
          return value;
        } catch (error) {
          await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
          await client.query(`RELEASE SAVEPOINT ${name}`);
          throw error;
        }
      }
      const originalQuery = database.query.bind(database);
      const originalTransaction = database.transaction.bind(database);
      const originalManager = database.withManager.bind(database);
      database.query = (sql, params) =>
        schedule(() => scopedOperation(() => originalQuery(sql, params)));
      database.transaction = (operation) =>
        schedule(() => scopedOperation(() => originalTransaction(operation)));
      database.withManager = (operation) =>
        schedule(() => scopedOperation(() => originalManager(operation)));
      configureApp(app);
      await app.listen(0, "127.0.0.1");
      const base = await app.getUrl();
      async function request(
        path,
        {
          method = "GET",
          body,
          cookie,
          origin = "http://localhost:5173",
          headers = {},
        } = {},
      ) {
        const response = await fetch(`${base}${path}`, {
          method,
          headers: {
            ...(origin ? { Origin: origin } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
            ...(body !== undefined && !(body instanceof FormData)
              ? { "Content-Type": "application/json" }
              : {}),
            ...headers,
          },
          body:
            body instanceof FormData
              ? body
              : body === undefined
                ? undefined
                : JSON.stringify(body),
        });
        const text = await response.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
        return {
          status: response.status,
          headers: response.headers,
          json,
          text,
        };
      }
      function cookieFrom(response) {
        const value = response.headers
          .getSetCookie()
          .find((item) => /Max-Age=43200/.test(item));
        assert.ok(value, "cookie de sessão presente");
        assert.match(value, /HttpOnly; SameSite=Lax; Path=\/;/);
        return value.split(";")[0];
      }
      const password = "Auditoria-local-2026!";
      const email = `audit-${randomUUID()}@example.invalid`;
      let cookie, userId, secondCookie, secondId, recipeId, imagePath;

      await t.test(
        "rotas privadas e credenciais inválidas são rejeitadas",
        async () => {
          for (const path of ["/recipes/mine", "/profiles/me"])
            assert.equal((await request(path)).status, 401);
          assert.equal(
            (
              await request("/auth/login", {
                method: "POST",
                body: { email, senha: password },
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await request("/auth/register", {
                method: "POST",
                body: { nome: "Teste", email: "invalido", senha: "curta" },
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "cadastro cria UUID, perfil, identidade, hash bcrypt e sessão",
        async () => {
          const registered = await request("/auth/register", {
            method: "POST",
            body: {
              nome: "Auditoria temporária",
              email: email.toUpperCase(),
              senha: password,
            },
          });
          assert.equal(registered.status, 201, registered.json?.message);
          userId = registered.json.usuario.id;
          assert.equal(registered.json.usuario.email, email);
          assert.deepEqual(Object.keys(registered.json), ["usuario"]);
          cookie = cookieFrom(registered);
          const result = await client.query(
            `SELECT u.encrypted_password <> $2 AS hashed,
        u.encrypted_password = extensions.crypt($2, u.encrypted_password) AS valid,
        p.nome, i.provider_id = u.id::text AS identity_ok,
        s.token_hash <> $3 AS token_hashed
        FROM auth.users u JOIN public.profiles p ON p.id = u.id
        JOIN auth.identities i ON i.user_id = u.id JOIN public.app_sessions s ON s.user_id = u.id
        WHERE u.id = $1`,
            [userId, password, cookie.split("=")[1]],
          );
          assert.equal(result.rowCount, 1);
          assert.equal(result.rows[0].hashed, true);
          assert.equal(result.rows[0].valid, true);
          assert.equal(result.rows[0].identity_ok, true);
          assert.equal(result.rows[0].token_hashed, true);
        },
      );
      await t.test("e-mail duplicado não cria cadastro parcial", async () => {
        assert.ok(userId);
        const duplicate = await request("/auth/register", {
          method: "POST",
          body: { nome: "Duplicado", email, senha: password },
        });
        assert.equal(duplicate.status, 409);
        assert.equal(
          (
            await client.query(
              "SELECT count(*)::int n FROM auth.users WHERE lower(email)=$1",
              [email],
            )
          ).rows[0].n,
          1,
        );
      });
      await t.test(
        "falha de sessão reverte usuário, identidade e perfil",
        async () => {
          const failedEmail = `audit-failure-${randomUUID()}@example.invalid`;
          failSession = true;
          let result;
          try {
            result = await request("/auth/register", {
              method: "POST",
              body: { nome: "Rollback", email: failedEmail, senha: password },
            });
          } finally {
            failSession = false;
          }
          assert.equal(result.status, 503);
          assert.equal(
            (
              await client.query(
                "SELECT count(*)::int n FROM auth.users WHERE email=$1",
                [failedEmail],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "login suporta bcrypt 2a, 2b e 2y e preserva UUID",
        async () => {
          assert.ok(userId);
          for (const prefix of ["$2a$", "$2b$", "$2y$"]) {
            await client.query(
              "UPDATE auth.users SET encrypted_password = $2::text || substring(encrypted_password FROM 5) WHERE id=$1",
              [userId, prefix],
            );
            const result = await request("/auth/login", {
              method: "POST",
              body: { email, senha: password },
            });
            assert.equal(result.status, 200);
            assert.equal(result.json.usuario.id, userId);
            cookie = cookieFrom(result);
          }
          assert.equal(
            (
              await request("/auth/login", {
                method: "POST",
                body: { email, senha: "errada" },
              })
            ).status,
            401,
          );
        },
      );
      await t.test(
        "sessão persiste em /me, perfil edita somente o próprio usuário",
        async () => {
          assert.ok(cookie);
          assert.equal(
            (await request("/auth/me", { cookie })).json.usuario.id,
            userId,
          );
          const updated = await request("/profiles/me", {
            method: "PATCH",
            cookie,
            body: { nome: "Nome de teste atualizado" },
          });
          assert.equal(updated.status, 200);
          assert.equal(
            (await request("/auth/me", { cookie })).json.usuario.nome,
            "Nome de teste atualizado",
          );
          assert.equal(
            (
              await request("/profiles/me", {
                method: "PATCH",
                cookie,
                body: { nome: "Teste", id: randomUUID() },
              })
            ).status,
            400,
          );
          const registered = await request("/auth/register", {
            method: "POST",
            body: {
              nome: "Outro teste",
              email: `audit-${randomUUID()}@example.invalid`,
              senha: password,
            },
          });
          assert.equal(registered.status, 201);
          secondCookie = cookieFrom(registered);
          secondId = registered.json.usuario.id;
        },
      );
      await t.test(
        "CSRF rejeita origem externa e escrita com cookie sem origem",
        async () => {
          assert.ok(cookie);
          assert.equal(
            (
              await request("/auth/logout", {
                method: "POST",
                cookie,
                origin: "https://external.invalid",
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await request("/auth/logout", {
                method: "POST",
                cookie,
                origin: "",
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await request("/auth/login", {
                method: "POST",
                origin: "",
                headers: { "Sec-Fetch-Site": "cross-site" },
                body: { email, senha: password },
              })
            ).status,
            403,
          );
          assert.equal(
            (await request("/auth/me", { cookie })).json.usuario.id,
            userId,
          );
        },
      );
      await t.test(
        "catálogo, paginação e detalhes preservam receitas originais",
        async () => {
          const page = await request("/recipes?page=1&limit=20");
          assert.equal(page.status, 200);
          assert.equal(page.json.total, before[4].count);
          assert.equal(page.json.items.length, Math.min(20, before[4].count));
          const second = await request("/recipes?page=2&limit=20");
          assert.equal(second.status, 200);
          assert.equal(
            new Set([...page.json.items, ...second.json.items].map((r) => r.id))
              .size,
            before[4].count,
          );
          const recipe = page.json.items[0];
          const detail = await request(`/recipes/${recipe.id}`);
          assert.equal(detail.status, 200);
          assert.ok(detail.json.ingredientesDetalhados.length > 0);
          assert.ok(detail.json.modoPreparo.length > 0);
          const images = await client.query(
            "SELECT imagem_path FROM public.receitas WHERE imagem_path IS NOT NULL",
          );
          for (const { imagem_path } of images.rows) {
            if (/^[^/\\]+\.(jpg|jpeg|png|webp)$/i.test(imagem_path))
              await access(resolve("../public/images/receitas", imagem_path));
          }
          assert.equal(
            (await request("/recipes?page=0&limit=2000")).status,
            400,
          );
        },
      );
      await t.test(
        "upload local valida conteúdo, limite e serve imagem com UUID",
        async () => {
          assert.ok(cookie);
          const png = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
            "base64",
          );
          const form = new FormData();
          form.append(
            "image",
            new Blob([png], { type: "image/png" }),
            "../../imagem.png",
          );
          const uploaded = await request("/uploads/receitas", {
            method: "POST",
            cookie,
            body: form,
          });
          assert.equal(uploaded.status, 201);
          imagePath = uploaded.json.imagemPath;
          assert.ok(imagePath.startsWith(`/uploads/receitas/${userId}/`));
          const served = await fetch(`${base}${imagePath}`);
          assert.equal(served.status, 200);
          assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
          const bad = new FormData();
          bad.append(
            "image",
            new Blob(["texto"], { type: "image/png" }),
            "fake.png",
          );
          assert.equal(
            (
              await request("/uploads/receitas", {
                method: "POST",
                cookie,
                body: bad,
              })
            ).status,
            400,
          );
          const large = new FormData();
          large.append(
            "image",
            new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], {
              type: "image/png",
            }),
            "large.png",
          );
          assert.equal(
            (
              await request("/uploads/receitas", {
                method: "POST",
                cookie,
                body: large,
              })
            ).status,
            413,
          );
          assert.equal(
            (await request(`/uploads/receitas/${userId}/invalid.png`)).status,
            404,
          );
        },
      );
      await t.test(
        "receita cria, edita e exclui ingredientes e etapas só do autor",
        async () => {
          assert.ok(cookie);
          assert.ok(secondCookie);
          assert.ok(imagePath);
          const data = {
            titulo: "AUDITORIA TEMPORÁRIA",
            categoria: "Lanches",
            descricao: "Teste revertido",
            tempo: 10,
            porcoes: 2,
            dificuldade: "Fácil",
            imagemPath: imagePath,
            ingredientesDetalhados: [
              { nome: "Arroz", quantidade: "100 g", tacoId: 1, gramas: 100 },
            ],
            modoPreparo: ["Etapa de teste"],
            tags: [],
          };
          const created = await request("/recipes", {
            method: "POST",
            cookie,
            body: data,
          });
          assert.equal(created.status, 201, created.json?.message);
          recipeId = created.json.id;
          assert.equal(created.json.autorId, userId);
          assert.equal(created.json.imagemPath, imagePath);
          const mine = await request("/recipes/mine", { cookie });
          assert.ok(mine.json.items.some((r) => r.id === recipeId));
          for (const method of ["PATCH", "DELETE"]) {
            assert.equal(
              (
                await request(`/recipes/${recipeId}`, {
                  method,
                  cookie: secondCookie,
                  ...(method === "PATCH"
                    ? { body: { titulo: "Intrusão" } }
                    : {}),
                })
              ).status,
              404,
            );
          }
          assert.equal(
            (
              await request("/recipes", {
                method: "POST",
                cookie: secondCookie,
                body: data,
              })
            ).status,
            400,
          );
          const edited = await request(`/recipes/${recipeId}`, {
            method: "PATCH",
            cookie,
            body: {
              titulo: "AUDITORIA EDITADA",
              ingredientesDetalhados: [{ nome: "Água", quantidade: "100 ml" }],
              modoPreparo: ["Primeira", "Segunda"],
            },
          });
          assert.equal(edited.status, 200);
          assert.equal(edited.json.ingredientesDetalhados[0].nome, "Água");
          assert.equal(edited.json.ingredientesDetalhados[0].tacoId, null);
          assert.equal(edited.json.modoPreparo.length, 2);
          assert.equal(
            (
              await request(`/recipes/${recipeId}`, {
                method: "DELETE",
                cookie,
              })
            ).status,
            204,
          );
          assert.equal((await request(`/recipes/${recipeId}`)).status, 404);
          assert.equal(
            (
              await client.query(
                "SELECT count(*)::int n FROM public.receita_ingredientes WHERE receita_id=$1",
                [recipeId],
              )
            ).rows[0].n,
            0,
          );
          assert.equal(
            (
              await client.query(
                "SELECT count(*)::int n FROM public.receita_etapas WHERE receita_id=$1",
                [recipeId],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test("alimentos TACO, busca e cálculo nutricional", async () => {
        const search = await request("/alimentos?busca=arroz");
        assert.equal(search.status, 200);
        assert.ok(search.json.length > 0);
        const id = search.json[0].id;
        const calculated = await request("/alimentos/calcular", {
          method: "POST",
          body: { items: [{ id, grams: 100 }] },
        });
        assert.equal(calculated.status, 201);
        assert.equal(calculated.json.totals.grams, 100);
        assert.ok(calculated.json.totals.macros.kcal > 0);
        assert.equal(
          (
            await request("/alimentos/calcular", {
              method: "POST",
              body: { items: [{ id: 999999, grams: 100 }] },
            })
          ).status,
          400,
        );
      });
      await t.test(
        "sessões expiradas, bloqueio de usuário e logout revogam acesso",
        async () => {
          assert.ok(cookie);
          assert.ok(secondCookie);
          await client.query(
            "UPDATE auth.users SET banned_until=now()+interval '1 hour' WHERE id=$1",
            [secondId],
          );
          assert.equal(
            (await request("/auth/me", { cookie: secondCookie })).json.usuario,
            null,
          );
          await client.query(
            "UPDATE auth.users SET banned_until=null WHERE id=$1",
            [secondId],
          );
          await client.query(
            "UPDATE public.app_sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
            [secondId],
          );
          assert.equal(
            (await request("/profiles/me", { cookie: secondCookie })).status,
            401,
          );
          const loggedOut = await request("/auth/logout", {
            method: "POST",
            cookie,
          });
          assert.equal(loggedOut.status, 204);
          assert.ok(
            loggedOut.headers
              .getSetCookie()
              .some((value) => /Max-Age=0/.test(value)),
          );
          assert.equal(
            (await request("/auth/me", { cookie })).json.usuario,
            null,
          );
          assert.equal((await request("/profiles/me", { cookie })).status, 401);
        },
      );
      await t.test(
        "integridade referencial sem perfis, identidades, ingredientes ou etapas órfãos",
        async () => {
          const result = await client.query(`SELECT
        (SELECT count(*) FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL) +
        (SELECT count(*) FROM auth.identities i LEFT JOIN auth.users u ON u.id=i.user_id WHERE u.id IS NULL) +
        (SELECT count(*) FROM public.receita_ingredientes i LEFT JOIN public.receitas r ON r.id=i.receita_id WHERE r.id IS NULL) +
        (SELECT count(*) FROM public.receita_etapas e LEFT JOIN public.receitas r ON r.id=e.receita_id WHERE r.id IS NULL)
        AS orphans`);
          assert.equal(Number(result.rows[0].orphans), 0);
        },
      );
    } finally {
      await app?.close();
      await client.query("ROLLBACK");
      if (before)
        assert.deepEqual(
          await snapshot(),
          before,
          "dados originais intactos após ROLLBACK",
        );
      client.release();
      await pool.end();
      if (previousUpload === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = previousUpload;
      if (previousOrigins === undefined) delete process.env.CORS_ORIGIN;
      else process.env.CORS_ORIGIN = previousOrigins;
      if (previousSource === undefined) delete process.env.ALIMENTOS_SOURCE;
      else process.env.ALIMENTOS_SOURCE = previousSource;
      const target = resolve(uploadRoot);
      assert.ok(
        target.startsWith(resolve(tmpdir()) + sep) &&
          target.includes("que-fome-integration-"),
      );
      await rm(target, { recursive: true, force: true });
    }
  },
);
