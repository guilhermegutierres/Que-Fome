import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({
  path: [
    resolve(backendDirectory, ".env.local"),
    resolve(backendDirectory, ".env"),
  ],
});

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("SENHA@")) {
  throw new Error("Configure DATABASE_URL no backend/.env.local ou backend/.env.");
}
const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await cliente.connect();
  const tabela = await cliente.query(
    "SELECT to_regclass('public.alimentos') AS nome",
  );
  if (!tabela.rows[0].nome) {
    throw new Error(
      "Tabela public.alimentos não existe. Execute a migration no SQL Editor do Supabase.",
    );
  }
  const contagem = await cliente.query(
    "SELECT COUNT(*)::integer AS total FROM public.alimentos",
  );
  console.log(
    `Supabase conectado; alimentos cadastrados: ${contagem.rows[0].total}.`,
  );
  if (contagem.rows[0].total === 0) {
    console.log("A tabela está vazia. Importe a TACO com: npm run import:taco");
  }
} finally {
  await cliente.end().catch(() => {});
}
