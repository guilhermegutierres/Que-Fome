import { randomBytes, scryptSync } from "node:crypto";
const salt = randomBytes(16).toString("hex");
const password = randomBytes(18).toString("base64url");
console.log("Senha administrativa (guarde em local seguro): " + password);
console.log("ADMIN_PASSWORD_HASH=" + salt + ":" + scryptSync(password, salt, 64).toString("hex"));
