import assert from "node:assert/strict";
import { test, mock } from "node:test";
import {
  login,
  cadastrar,
  logout,
  consultarUsuario,
  AUTH_EVENT,
} from "./auth.ts";

test("login e cadastro usam cookies e nunca dependem de token do Supabase", async (t) => {
  const originalWindow = globalThis.window;
  globalThis.window = new EventTarget();
  t.after(() => {
    globalThis.window = originalWindow;
    mock.restoreAll();
  });
  let events = 0;
  window.addEventListener(AUTH_EVENT, () => events++);
  const calls = [];
  mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    return Response.json({
      usuario: { id: "uuid", nome: "Teste", email: "teste@example.invalid" },
    });
  });
  assert.deepEqual(await login("teste@example.invalid", "senha-temporaria"), {
    sucesso: true,
  });
  assert.deepEqual(
    await cadastrar("Teste", "teste@example.invalid", "senha-temporaria"),
    { sucesso: true, sessaoLiberada: true },
  );
  assert.equal(events, 2);
  assert.deepEqual(
    calls.map((c) => c.url),
    ["/api/auth/login", "/api/auth/register"],
  );
  assert.ok(calls.every((c) => c.init.credentials === "include"));
  assert.ok(calls.every((c) => !("Authorization" in c.init.headers)));
});

test("erros HTTP e de rede são compreensíveis e não emitem sucesso", async (t) => {
  t.after(() => mock.restoreAll());
  const fetchMock = mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "E-mail ou senha incorretos." }, { status: 401 }),
  );
  assert.deepEqual(await login("teste@example.invalid", "errada"), {
    sucesso: false,
    mensagem: "E-mail ou senha incorretos.",
  });
  fetchMock.mock.mockImplementation(async () =>
    Response.json(
      { message: ["E-mail inválido.", "Senha muito curta."] },
      { status: 400 },
    ),
  );
  assert.deepEqual(await cadastrar("Teste", "invalido", "curta"), {
    sucesso: false,
    mensagem: "E-mail inválido. Senha muito curta.",
  });
  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError("offline");
  });
  assert.deepEqual(await login("teste@example.invalid", "senha"), {
    sucesso: false,
    mensagem: "Não foi possível conectar ao servidor.",
  });
});

test("restaura sessão via /me e aceita logout HTTP 204", async (t) => {
  const originalWindow = globalThis.window;
  globalThis.window = new EventTarget();
  t.after(() => {
    globalThis.window = originalWindow;
    mock.restoreAll();
  });
  mock.method(globalThis, "fetch", async (url) =>
    url.endsWith("/me")
      ? Response.json({
          usuario: {
            id: "uuid",
            nome: "Teste",
            email: "teste@example.invalid",
          },
        })
      : new Response(null, { status: 204 }),
  );
  assert.equal((await consultarUsuario()).id, "uuid");
  assert.deepEqual(await logout(), { sucesso: true });
});
