import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { AuthenticatedUser } from "./authenticated-user.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class SupabaseAuthService {
  async validateAccessToken(token: string): Promise<AuthenticatedUser | null> {
    const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!supabaseUrl || !publishableKey) {
      throw new ServiceUnavailableException(
        "A autenticação do servidor não está configurada.",
      );
    }

    let response: Response;
    try {
      response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: "GET",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Não foi possível validar a sessão de autenticação.",
      );
    }

    if (response.status === 429) {
      throw new ServiceUnavailableException(
        "O serviço de autenticação está temporariamente indisponível.",
      );
    }
    if (response.status >= 400 && response.status < 500) {
      return null;
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        "O serviço de autenticação está temporariamente indisponível.",
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ServiceUnavailableException(
        "Resposta inválida do serviço de autenticação.",
      );
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("id" in payload) ||
      typeof payload.id !== "string" ||
      !UUID_PATTERN.test(payload.id)
    ) {
      throw new ServiceUnavailableException(
        "Resposta inválida do serviço de autenticação.",
      );
    }

    return {
      id: payload.id,
      ...("email" in payload && typeof payload.email === "string"
        ? { email: payload.email }
        : {}),
    };
  }
}
