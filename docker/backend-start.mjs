import { readFile } from "node:fs/promises";

const password = (await readFile(process.env.DB_PASSWORD_FILE, "utf8")).trim();
if (!password) throw new Error("Senha do banco ausente no secret do backend.");
const url = new URL("postgresql://localhost");
url.hostname = process.env.DB_HOST || "db";
url.port = process.env.DB_PORT || "5432";
url.username = process.env.DB_USER || "que_fome_app";
url.password = password;
url.pathname = `/${process.env.DB_NAME || "que_fome_db"}`;
process.env.DATABASE_URL = url.toString();
await import("../dist/main.js");
