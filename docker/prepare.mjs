// Cria uma cópia portátil do banco e dos uploads. Nunca restaura no banco de origem.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import {
  access,
  mkdir,
  copyFile,
  cp,
  writeFile,
  rename,
  unlink,
  lstat,
} from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "backend/package.json"));
const dotenv = require("dotenv");
const { Pool } = require("pg");
dotenv.config({
  path: [join(root, "backend/.env.local"), join(root, "backend/.env")],
});
if (!process.env.DATABASE_URL)
  throw new Error("Configure DATABASE_URL em backend/.env antes de exportar.");
const source = new URL(process.env.DATABASE_URL);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(source.hostname) ||
  source.pathname !== "/que_fome_db"
) {
  throw new Error("Este preparador exporta apenas o banco local que_fome_db.");
}
const data = join(root, "docker/local-data");
const secrets = join(root, "docker/secrets");
await mkdir(data, { recursive: true });
await mkdir(secrets, { recursive: true });
await mkdir(join(data, "uploads"), { recursive: true });
for (const name of ["db_admin_password.txt", "db_app_password.txt"]) {
  try {
    await writeFile(
      join(secrets, name),
      randomBytes(32).toString("hex") + "\n",
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}
try {
  await copyFile(
    join(root, ".env.docker.example"),
    join(root, ".env.docker"),
    1,
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}

const dump = join(data, "que-fome.dump");
try {
  await access(dump);
  throw new Error(
    "Já existe docker/local-data/que-fome.dump. Backup preservado. Para gerar outro, renomeie a pasta local-data antes de executar novamente.",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const bin =
  process.env.PG_BIN ||
  (process.platform === "win32" ? "C:/Program Files/PostgreSQL/18/bin" : "");
const executable = bin
  ? join(bin, process.platform === "win32" ? "pg_dump.exe" : "pg_dump")
  : "pg_dump";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
const connection = await pool.connect();
const temporaryDump = join(data, `export-${randomUUID()}.partial`);
let complete = false;
try {
  await connection.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const snapshot = (await connection.query("SELECT pg_export_snapshot() AS id"))
    .rows[0].id;
  const counts = (
    await connection.query(`SELECT
    (SELECT count(*)::int FROM auth.users) users,
    (SELECT count(*)::int FROM auth.identities) identities,
    (SELECT count(*)::int FROM public.profiles) profiles,
    (SELECT count(*)::int FROM public.receitas) recipes,
    (SELECT count(*)::int FROM public.receita_ingredientes) ingredients,
    (SELECT count(*)::int FROM public.receita_etapas) steps,
    (SELECT count(*)::int FROM public.alimentos) foods`)
  ).rows[0];
  await new Promise((success, failure) => {
    // A senha é passada no ambiente do processo, nunca no comando ou no console.
    const child = spawn(
      executable,
      [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--no-publications",
        "--no-subscriptions",
        "--exclude-table-data=public.app_sessions",
        `--snapshot=${snapshot}`,
        `--file=${temporaryDump}`,
      ],
      {
        env: {
          ...process.env,
          PGHOST: source.hostname.replace(/^\[|\]$/g, ""),
          PGPORT: source.port || "5432",
          PGUSER: decodeURIComponent(source.username),
          PGPASSWORD: decodeURIComponent(source.password),
          PGDATABASE: "que_fome_db",
        },
        windowsHide: true,
        stdio: "ignore",
      },
    );
    child.once("error", () =>
      failure(
        new Error(
          "Não foi possível executar pg_dump. Confira PG_BIN e a instalação do PostgreSQL 18.",
        ),
      ),
    );
    child.once("exit", (code) =>
      code === 0
        ? success()
        : failure(
            new Error(
              `pg_dump falhou (código ${code}). Nenhum dado da origem foi alterado.`,
            ),
          ),
    );
  });
  // Rejeitar links evita transportar referências a arquivos fora dos uploads.
  const sourceUploads = join(root, "backend/uploads");
  async function rejectLinks(path) {
    const entry = await lstat(path);
    if (entry.isSymbolicLink())
      throw new Error(
        "O diretório de uploads contém um link simbólico; revise antes de copiar.",
      );
    if (entry.isDirectory()) {
      const { readdir } = await import("node:fs/promises");
      for (const name of await readdir(path))
        await rejectLinks(join(path, name));
    }
  }
  try {
    await access(sourceUploads);
    await rejectLinks(sourceUploads);
    await cp(sourceUploads, join(data, "uploads"), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await rename(temporaryDump, dump);
  await writeFile(
    join(data, "manifest.json"),
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        counts,
        sessions: "Não exportadas: entre novamente após importar.",
        database: "que_fome_db",
        postgresMajor: 18,
      },
      null,
      2,
    ) + "\n",
  );
  complete = true;
  console.log(
    "Cópia portátil preparada em docker/local-data. Senhas do Docker salvas em docker/secrets, sem exibição no console.",
  );
  console.log("Registros exportados:", JSON.stringify(counts));
  console.log(
    "Próximo comando: docker compose --env-file .env.docker up --build -d",
  );
} finally {
  await connection.query("ROLLBACK");
  connection.release();
  await pool.end();
  if (!complete) await unlink(temporaryDump).catch(() => undefined);
}
