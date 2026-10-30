import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import type { DatabaseTransaction } from "../database/database.service.js";
import { DatabaseService } from "../database/database.service.js";
import type { AuthenticatedUser } from "./authenticated-user.js";

const COOKIE_NAME = "que_fome_session";
const SESSION_HOURS = 12;
const SESSION_SECONDS = SESSION_HOURS * 3600;

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  nome: string | null;
}

export interface SessionUser extends AuthenticatedUser {
  email: string;
  nome: string;
}

interface SessionResult {
  usuario: SessionUser;
  token: string;
}

function normalizeUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    nome: row.nome?.trim() || row.email.split("@")[0] || "Usuário",
  };
}

export function getSessionToken(
  cookieHeader: string | undefined,
): string | null {
  const field = cookieHeader
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!field) return null;
  const token = field.substring(COOKIE_NAME.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);
  constructor(private readonly database: DatabaseService) {}

  sessionCookie(token: string): string {
    const secure = this.secureCookie();
    return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${secure}`;
  }

  clearSessionCookie(): string {
    const secure = this.secureCookie();
    return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
  }

  clearLegacySessionCookie(): string {
    return this.clearSessionCookie().replace("Path=/;", "Path=/api;");
  }

  private secureCookie(): string {
    // HTTP local no Compose pode desativar Secure explicitamente. Em produção
    // o padrão continua seguro; um valor inválido nunca desativa a proteção.
    const configured = process.env.SESSION_COOKIE_SECURE;
    const enabled =
      configured === undefined
        ? process.env.NODE_ENV === "production"
        : configured !== "false";
    return enabled ? "; Secure" : "";
  }

  private logDatabaseError(operation: string, error: unknown): void {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown";
    // Não registrar SQL, parâmetros, credenciais ou detalhes do usuário.
    this.logger.error(`${operation}: falha no PostgreSQL (${code}).`);
  }

  private async createSession(
    user: SessionUser,
    client?: DatabaseTransaction,
  ): Promise<SessionResult> {
    const token = randomBytes(32).toString("hex");
    try {
      const sql = `INSERT INTO public.app_sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '12 hours')`;
      const values = [hashToken(token), user.id];
      if (client) await client.query(sql, values);
      else await this.database.query(sql, values);
    } catch (error) {
      this.logDatabaseError("sessão", error);
      throw new ServiceUnavailableException(
        "Não foi possível iniciar a sessão.",
      );
    }
    return { usuario: user, token };
  }

  async login(email: string, password: string): Promise<SessionResult> {
    if (!password || Buffer.byteLength(password, "utf8") > 72) {
      throw new UnauthorizedException("E-mail ou senha incorretos.");
    }
    try {
      // A extensão pgcrypto preserva os hashes bcrypt vindos do Supabase.
      const result = await this.database.query<UserRow>(
        `SELECT u.id, u.email, p.nome
           FROM auth.users u
           LEFT JOIN public.profiles p ON p.id = u.id
          WHERE lower(u.email) = $1
            AND u.encrypted_password IS NOT NULL
            AND (
              CASE WHEN left(u.encrypted_password, 4) IN ('$2b$', '$2y$')
                THEN '$2a$' || substring(u.encrypted_password FROM 5)
                ELSE u.encrypted_password END
            ) = extensions.crypt($2,
              CASE WHEN left(u.encrypted_password, 4) IN ('$2b$', '$2y$')
                THEN '$2a$' || substring(u.encrypted_password FROM 5)
                ELSE u.encrypted_password END
            )
            AND u.deleted_at IS NULL
            AND (u.banned_until IS NULL OR u.banned_until < now())
          LIMIT 1`,
        [email.trim().toLowerCase(), password],
      );
      if (!result.rows[0]) {
        throw new UnauthorizedException("E-mail ou senha incorretos.");
      }
      return await this.createSession(normalizeUser(result.rows[0]));
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      this.logDatabaseError("login", error);
      throw new ServiceUnavailableException(
        "Não foi possível consultar os dados de autenticação.",
      );
    }
  }

  async register(
    nome: string,
    email: string,
    password: string,
  ): Promise<SessionResult> {
    const nomeNormalizado = nome.trim();
    const emailNormalizado = email.trim().toLowerCase();
    if (nomeNormalizado.length < 1 || nomeNormalizado.length > 100) {
      throw new BadRequestException("Informe um nome com até 100 caracteres.");
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      throw new BadRequestException("A senha deve ter de 8 a 72 bytes.");
    }
    const id = randomUUID();
    try {
      return await this.database.transaction(async (client) => {
        const existing = await client.query(
          "SELECT id FROM auth.users WHERE lower(email) = $1 LIMIT 1",
          [emailNormalizado],
        );
        if (existing.rows.length)
          throw new ConflictException("Este e-mail já está cadastrado.");
        await client.query(
          `INSERT INTO auth.users (
             id, instance_id, aud, role, email, encrypted_password,
             email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
             is_sso_user, is_anonymous, created_at, updated_at
           ) VALUES (
             $1, '00000000-0000-0000-0000-000000000000', 'authenticated',
             'authenticated', $2,
             extensions.crypt($3, extensions.gen_salt('bf', 12)),
             now(), '{"provider":"email","providers":["email"]}'::jsonb,
             jsonb_build_object('nome', $4::text), false, false, now(), now()
           )`,
          [id, emailNormalizado, password, nomeNormalizado],
        );
        // O trigger migrado cria public.profiles automaticamente.
        await client.query(
          `INSERT INTO auth.identities (
             id, user_id, provider_id, identity_data, provider, created_at, updated_at
           ) VALUES (
             $1::uuid, $1::uuid, ($1::uuid)::text, jsonb_build_object('sub', ($1::uuid)::text, 'email', $2::text, 'email_verified', true),
             'email', now(), now()
           )`,
          [id, emailNormalizado],
        );
        return this.createSession(
          { id, email: emailNormalizado, nome: nomeNormalizado },
          client,
        );
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictException("Este e-mail já está cadastrado.");
      }
      this.logDatabaseError("cadastro", error);
      throw new ServiceUnavailableException(
        "Não foi possível criar a conta. Verifique a estrutura de autenticação.",
      );
    }
  }

  async userByCookie(cookie: string | undefined): Promise<SessionUser | null> {
    const token = getSessionToken(cookie);
    if (!token) return null;
    try {
      const result = await this.database.query<UserRow>(
        `SELECT u.id, u.email, p.nome
           FROM public.app_sessions s
           JOIN auth.users u ON u.id = s.user_id
           LEFT JOIN public.profiles p ON p.id = u.id
          WHERE s.token_hash = $1
            AND s.expires_at > now()
            AND u.deleted_at IS NULL
            AND (u.banned_until IS NULL OR u.banned_until < now())
          LIMIT 1`,
        [hashToken(token)],
      );
      return result.rows[0] ? normalizeUser(result.rows[0]) : null;
    } catch (error) {
      this.logDatabaseError("validar sessão", error);
      throw new ServiceUnavailableException(
        "Não foi possível validar a sessão.",
      );
    }
  }

  async logout(cookie: string | undefined): Promise<void> {
    const token = getSessionToken(cookie);
    if (token) {
      await this.database.query(
        "DELETE FROM public.app_sessions WHERE token_hash = $1",
        [hashToken(token)],
      );
    }
  }
}
