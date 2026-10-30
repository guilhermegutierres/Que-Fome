import { ValidationPipe, type INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const origins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      next();
      return;
    }
    let origin = req.headers.origin || "";
    if (!origin && req.headers.referer) {
      try {
        origin = new URL(req.headers.referer).origin;
      } catch {
        origin = "";
      }
    }
    // Requisições de navegador com sessão exigem origem explicitamente aceita.
    // O cabeçalho Fetch Metadata também bloqueia formulários cross-site sem Origin.
    if (
      (origin && !origins.includes(origin)) ||
      (req.headers["sec-fetch-site"] === "cross-site" && !origin) ||
      (req.headers.cookie?.includes("que_fome_session=") && !origin)
    ) {
      res.status(403).json({ message: "Origem não autorizada." });
      return;
    }
    next();
  });
}
