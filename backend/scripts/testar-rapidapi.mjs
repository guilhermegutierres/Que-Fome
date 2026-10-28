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

const base = (process.env.TEST_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const resposta = await fetch(`${base}/alimentos/rapidapi?busca=morango`, {
  signal: AbortSignal.timeout(12000),
});
const dados = await resposta.json();
if (!resposta.ok) {
  throw new Error(
    `RapidAPI não disponível. HTTP ${resposta.status}: ${dados.message || JSON.stringify(dados)}`,
  );
}
if (!Array.isArray(dados))
  throw new Error("Resposta de busca não é uma lista.");
console.log(`RapidAPI respondeu. Resultados para morango: ${dados.length}.`);
console.log(dados.slice(0, 3));
