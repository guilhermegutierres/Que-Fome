import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppModule } from "./app.module.js";
import { configureApp } from "./configure-app.js";

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({
  path: [
    resolve(backendDirectory, ".env.local"),
    resolve(backendDirectory, ".env"),
  ],
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  configureApp(app);

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT precisa ser uma porta válida de 1 a 65535.");
  }
  await app.listen(port, process.env.HOST || "127.0.0.1");
}

void bootstrap();
