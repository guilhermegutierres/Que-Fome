import {
  CanActivate, ExecutionContext, HttpException, Injectable, UnauthorizedException,
} from "@nestjs/common";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";

const deriveKey = promisify(scrypt);
const sessionDuration = 8 * 60 * 60 * 1000;
const cookieName = "que_fome_admin";

@Injectable()
export class AdminAuth {
  private readonly sessions = new Map<string, number>();
  private attempts = 0;
  private retryAt = 0;

  async login(username: string, password: string, response: Response) {
    const now = Date.now();
    if (now >= this.retryAt) {
      this.attempts = 0;
      this.retryAt = now + 60_000;
    }
    if (++this.attempts > 10)
      throw new HttpException("Tente novamente em um minuto.", 429);

    const [salt, hash] = (process.env.ADMIN_PASSWORD_HASH ?? "").split(":");
    if (!process.env.ADMIN_USERNAME || !/^[a-f0-9]{32}$/.test(salt ?? "") ||
        !/^[a-f0-9]{128}$/.test(hash ?? ""))
      throw new UnauthorizedException("Acesso indisponível.");

    const key = await deriveKey(password, salt, 64) as Buffer;
    if (!timingSafeEqual(key, Buffer.from(hash, "hex")) ||
        username !== process.env.ADMIN_USERNAME)
      throw new UnauthorizedException("Login ou senha inválidos.");

    for (const [token, expiry] of this.sessions)
      if (expiry <= now) this.sessions.delete(token);
    const token = randomBytes(32).toString("hex");
    this.sessions.set(token, now + sessionDuration);
    response.cookie(cookieName, token, { ...this.cookieOptions(), maxAge: sessionDuration });
    return { authenticated: true };
  }

  requireSession(request: Request): boolean {
    const token = this.token(request);
    if (!token || (this.sessions.get(token) ?? 0) <= Date.now())
      throw new UnauthorizedException("Entre no painel para continuar.");
    return true;
  }

  logout(request: Request, response: Response) {
    this.sessions.delete(this.token(request) ?? "");
    response.clearCookie(cookieName, this.cookieOptions());
  }

  private token(request: Request) {
    return request.headers.cookie?.match(/(?:^|;\s*)que_fome_admin=([a-f0-9]{64})(?:;|$)/)?.[1];
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: "strict" as const,
      secure: new URL(process.env.ADMIN_ORIGIN!).protocol === "https:",
      path: "/admin-api",
    };
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AdminAuth) {}

  canActivate(context: ExecutionContext): boolean {
    return this.auth.requireSession(context.switchToHttp().getRequest<Request>());
  }
}