import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import {
  getSessionToken,
  LocalAuthService,
} from "../src/auth/local-auth.service.js";
import { LocalAuthGuard } from "../src/auth/local-auth.guard.js";

const uid = "d9428888-122b-4fc5-8d2f-47f50f1c1f78";
const row = { id: uid, email: "teste@exemplo.com", nome: "Pessoa de teste" };

describe("Autenticacao PostgreSQL local", () => {
  it("cookie continua Secure por padrão em produção e aceita HTTP local explícito", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousSecure = process.env.SESSION_COOKIE_SECURE;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.SESSION_COOKIE_SECURE;
      const auth = new LocalAuthService({} as never);
      assert.match(auth.sessionCookie("a".repeat(64)), /; Secure$/);
      process.env.SESSION_COOKIE_SECURE = "false";
      assert.doesNotMatch(auth.sessionCookie("a".repeat(64)), /; Secure/);
      assert.doesNotMatch(auth.clearSessionCookie(), /; Secure/);
      process.env.SESSION_COOKIE_SECURE = "true";
      assert.match(auth.clearLegacySessionCookie(), /; Secure$/);
      process.env.SESSION_COOKIE_SECURE = "valor-invalido";
      assert.match(auth.sessionCookie("a".repeat(64)), /; Secure$/);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousSecure === undefined)
        delete process.env.SESSION_COOKIE_SECURE;
      else process.env.SESSION_COOKIE_SECURE = previousSecure;
    }
  });
  it("usa consulta parametrizada para validar senha e emite cookie HttpOnly", async () => {
    const queries: { sql: string; params?: unknown[] }[] = [];
    const database = {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (sql.includes("SELECT u.id")) return { rows: [row] };
        return { rows: [] };
      },
    };
    const auth = new LocalAuthService(database as never);
    const result = await auth.login(" TESTE@EXEMPLO.COM ", "senha-teste");
    assert.equal(result.usuario.id, uid);
    assert.deepEqual(queries[0].params, ["teste@exemplo.com", "senha-teste"]);
    assert.match(queries[0].sql, /extensions\.crypt/);
    assert.ok(queries.some((q) => q.sql.includes("app_sessions")));
    assert.match(
      auth.sessionCookie(result.token),
      /HttpOnly; SameSite=Lax; Path=\/;/,
    );
    assert.equal(
      getSessionToken(`outro=1; que_fome_session=${result.token}`),
      result.token,
    );
  });

  it("nega credenciais incorretas sem criar sessao", async () => {
    let count = 0;
    const auth = new LocalAuthService({
      query: async () => {
        count++;
        return { rows: [] };
      },
    } as never);
    await assert.rejects(
      auth.login("teste@exemplo.com", "senha-errada"),
      UnauthorizedException,
    );
    assert.equal(count, 1);
  });

  it("procura usuario somente por sessao valida e elimina sessao no logout", async () => {
    const calls: string[] = [];
    const auth = new LocalAuthService({
      query: async (sql: string) => {
        calls.push(sql);
        return { rows: sql.includes("JOIN auth.users") ? [row] : [] };
      },
    } as never);
    const token = "a".repeat(64);
    assert.equal(
      (await auth.userByCookie(`que_fome_session=${token}`))?.id,
      uid,
    );
    await auth.logout(`que_fome_session=${token}`);
    assert.ok(
      calls.some((sql) => sql.includes("DELETE FROM public.app_sessions")),
    );
    assert.equal(await auth.userByCookie("que_fome_session=qualquer"), null);
  });

  it("protege endpoints de escrita e anexa usuario validado", async () => {
    const auth = {
      userByCookie: async (cookie?: string) => (cookie ? row : null),
    } as unknown as LocalAuthService;
    const guard = new LocalAuthGuard(auth);
    const request: { headers: { cookie?: string }; user?: unknown } = {
      headers: { cookie: "sessao" },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
    assert.equal(await guard.canActivate(context), true);
    assert.deepEqual(request.user, row);
    request.headers.cookie = undefined;
    await assert.rejects(guard.canActivate(context), UnauthorizedException);
  });

  it("cadastro usa transacao para usuario e identidade", async () => {
    const queries: string[] = [];
    const auth = new LocalAuthService({
      transaction: async (fn: (client: unknown) => Promise<void>) =>
        fn({
          query: async (sql: string) => {
            queries.push(sql);
            return { rows: [] };
          },
        }),
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: [] };
      },
    } as never);
    const result = await auth.register(
      "Pessoa",
      "PESSOA@EXEMPLO.COM",
      "senha-segura-123",
    );
    assert.equal(result.usuario.email, "pessoa@exemplo.com");
    assert.ok(queries.some((sql) => sql.includes("INSERT INTO auth.users")));
    assert.ok(
      queries.some((sql) => sql.includes("INSERT INTO auth.identities")),
    );
  });
});
