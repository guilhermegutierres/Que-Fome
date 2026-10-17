// Com o NestJS iniciado (npm run dev), execute: npm run test:api
import assert from "node:assert/strict";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({
  path: [
    resolve(backendDirectory, ".env.local"),
    resolve(backendDirectory, ".env"),
  ],
});

const base = process.env.TEST_API_URL || "http://localhost:3000";

const respostaBusca = await fetch(`${base}/alimentos?busca=morango`);
assert.equal(respostaBusca.status, 200, "GET /alimentos deve retornar 200");
const alimentos = await respostaBusca.json();
assert.ok(Array.isArray(alimentos), "A busca deve retornar um array");
assert.ok(
  alimentos.length > 0,
  "O catálogo TACO deve retornar resultados para morango",
);
assert.ok(
  alimentos.every(
    (item) => typeof item.id === "number" && typeof item.descricao === "string",
  ),
);

const respostaCalculo = await fetch(`${base}/alimentos/calcular`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ items: [{ id: 1, grams: 100 }] }),
});
assert.equal(
  respostaCalculo.status,
  201,
  "POST /alimentos/calcular deve retornar 201",
);
const calculo = await respostaCalculo.json();
assert.equal(calculo.totals.grams, 100);
assert.ok(calculo.totals.macros.kcal > 100 && calculo.totals.macros.kcal < 150);
assert.equal(calculo.items[0].id, 1);

const respostaInvalida = await fetch(`${base}/alimentos/calcular`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ items: [{ id: 1, grams: -5 }] }),
});
assert.equal(respostaInvalida.status, 400, "DTO deve rejeitar peso negativo");
console.log("OK: busca, cálculo TACO (100 g) e validação de DTO.");
