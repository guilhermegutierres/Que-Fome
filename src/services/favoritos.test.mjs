import assert from "node:assert/strict";
import { test } from "node:test";
import { obterFavoritos, alternarFavorito, estaFavorito } from "./favoritos.ts";

test("favoritos corrompidos não derrubam a página", (t) => {
  const original = globalThis.localStorage;
  let value = "{json quebrado";
  globalThis.localStorage = { getItem: () => value };
  t.after(() => {
    globalThis.localStorage = original;
  });
  assert.deepEqual(obterFavoritos("teste@example.invalid"), []);
  value = '{"id":1}';
  assert.deepEqual(obterFavoritos("teste@example.invalid"), []);
  value = '["receita",1,null,{}]';
  assert.deepEqual(obterFavoritos("teste@example.invalid"), ["receita", 1]);
});

test("favoritos ficam separados por usuário e podem ser removidos", (t) => {
  const originalStorage = globalThis.localStorage,
    originalWindow = globalThis.window;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  globalThis.window = new EventTarget();
  t.after(() => {
    globalThis.localStorage = originalStorage;
    globalThis.window = originalWindow;
  });
  assert.equal(alternarFavorito("receita", "primeiro@example.invalid"), true);
  assert.equal(estaFavorito("receita", "primeiro@example.invalid"), true);
  assert.equal(estaFavorito("receita", "segundo@example.invalid"), false);
  assert.equal(alternarFavorito("receita", "primeiro@example.invalid"), false);
  assert.deepEqual(obterFavoritos(null), []);
});
