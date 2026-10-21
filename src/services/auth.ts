import { supabase, supabaseConfigured } from "./supabase";

type AcaoAutenticacao = "login" | "cadastro";

interface ErroAutenticacao {
  code?: string;
  name?: string;
}

type ResultadoFalha = { sucesso: false; mensagem: string };
type ResultadoLogin = ResultadoFalha | { sucesso: true };
type ResultadoCadastro =
  | ResultadoFalha
  | { sucesso: true; sessaoLiberada: boolean };
type ResultadoLogout = ResultadoFalha | { sucesso: true };

function mensagemErro(
  erro: ErroAutenticacao | null | undefined,
  acao: AcaoAutenticacao,
): string {
  if (!supabaseConfigured) {
    return "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para usar a autenticação.";
  }

  const codigo = erro?.code || erro?.name;

  if (acao === "login" && codigo === "invalid_credentials") {
    return "E-mail ou senha incorretos.";
  }
  if (codigo === "user_already_exists" || codigo === "email_exists") {
    return "Este e-mail já está cadastrado.";
  }
  if (codigo === "weak_password") {
    return "A senha não atende aos requisitos de segurança do Supabase.";
  }
  if (codigo === "email_address_invalid") {
    return "Informe um endereço de e-mail válido.";
  }

  return acao === "cadastro"
    ? "Não foi possível criar sua conta. Tente novamente."
    : "Não foi possível entrar. Verifique sua conexão e tente novamente.";
}

async function login(email: string, senha: string): Promise<ResultadoLogin> {
  if (!supabase) {
    return {
      sucesso: false,
      mensagem: mensagemErro(null, "login"),
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) {
    return { sucesso: false, mensagem: mensagemErro(error, "login") };
  }

  return { sucesso: true };
}

async function cadastrar(
  nome: string,
  email: string,
  senha: string,
): Promise<ResultadoCadastro> {
  if (!supabase) {
    return {
      sucesso: false,
      mensagem: mensagemErro(null, "cadastro"),
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });

  if (error) {
    return { sucesso: false, mensagem: mensagemErro(error, "cadastro") };
  }

  return {
    sucesso: true,
    sessaoLiberada: Boolean(data.session),
  };
}

async function logout(): Promise<ResultadoLogout> {
  if (!supabase) return { sucesso: true };

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch {
    return {
      sucesso: false,
      mensagem: "Não foi possível encerrar sua sessão. Tente novamente.",
    };
  }

  return { sucesso: true };
}

export { cadastrar, login, logout };
