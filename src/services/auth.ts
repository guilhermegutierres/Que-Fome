// Autenticação local: API NestJS -> PostgreSQL. As telas permanecem iguais.
const API = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");
export const AUTH_EVENT = "que-fome-auth-changed";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
}

type ResultadoFalha = { sucesso: false; mensagem: string };
type ResultadoLogin = ResultadoFalha | { sucesso: true };
type ResultadoCadastro = ResultadoFalha | { sucesso: true; sessaoLiberada: boolean };
type ResultadoLogout = ResultadoFalha | { sucesso: true };

async function requisitar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${caminho}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor.");
  }
  const json: { message?: string | string[] } & T = response.status === 204
    ? ({} as { message?: string | string[] } & T)
    : await response.json().catch(() => ({} as { message?: string | string[] } & T));
  if (!response.ok) {
    throw new Error(Array.isArray(json.message)
      ? json.message.join(" ")
      : json.message || "Não foi possível concluir a operação.");
  }
  return json;
}

export async function consultarUsuario(): Promise<Usuario | null> {
  const result = await requisitar<{ usuario: Usuario | null }>("/auth/me");
  return result.usuario;
}

export async function login(email: string, senha: string): Promise<ResultadoLogin> {
  try {
    await requisitar("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    window.dispatchEvent(new Event(AUTH_EVENT));
    return { sucesso: true };
  } catch (error) {
    return { sucesso: false, mensagem: (error as Error).message };
  }
}

export async function cadastrar(
  nome: string, email: string, senha: string,
): Promise<ResultadoCadastro> {
  try {
    await requisitar("/auth/register", {
      method: "POST",
      body: JSON.stringify({ nome, email, senha }),
    });
    window.dispatchEvent(new Event(AUTH_EVENT));
    return { sucesso: true, sessaoLiberada: true };
  } catch (error) {
    return { sucesso: false, mensagem: (error as Error).message };
  }
}

export async function logout(): Promise<ResultadoLogout> {
  try {
    await requisitar("/auth/logout", { method: "POST" });
    window.dispatchEvent(new Event(AUTH_EVENT));
    return { sucesso: true };
  } catch (error) {
    return { sucesso: false, mensagem: (error as Error).message };
  }
}
