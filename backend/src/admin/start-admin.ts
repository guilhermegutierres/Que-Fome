import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NextFunction, Request, Response } from "express";
import { AdminModule } from "./admin.module.js";

export async function startAdmin(): Promise<void> {
  if (!process.env.ADMIN_ORIGIN) return;
  const origin = new URL(process.env.ADMIN_ORIGIN);
  const port = Number(process.env.ADMIN_PORT || 3001);
  if (origin.origin !== process.env.ADMIN_ORIGIN ||
      !["http:", "https:"].includes(origin.protocol) ||
      (origin.protocol === "http:" && !["localhost", "127.0.0.1"].includes(origin.hostname)) ||
      !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Confira ADMIN_ORIGIN e ADMIN_PORT.");

  const app = await NestFactory.create(AdminModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
  }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.set({
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      "X-Content-Type-Options": "nosniff",
    });
    if (!["GET", "HEAD"].includes(req.method) && req.headers.origin !== origin.origin) {
      res.status(403).json({ message: "Origem não autorizada." });
      return;
    }
    next();
  });

  await app.listen(port, "127.0.0.1");
}
