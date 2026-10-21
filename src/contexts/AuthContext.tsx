import { useEffect, useState, type ContextType, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthContext } from "./auth-context";
import { supabase, supabaseConfigured } from "../services/supabase";

type UsuarioAutenticado = NonNullable<
  ContextType<typeof AuthContext>
>["usuario"];

interface AuthProviderProps {
  children: ReactNode;
}

function formatarUsuario(
  authUser: User | null | undefined,
): UsuarioAutenticado {
  if (!authUser) return null;

  const metadata = authUser.user_metadata || {};
  const nomeMetadata =
    typeof metadata.nome === "string"
      ? metadata.nome.trim()
      : typeof metadata.name === "string"
        ? metadata.name.trim()
        : "";
  return {
    id: authUser.id,
    nome: nomeMetadata || authUser.email?.split("@")[0] || "Usuário",
    email: authUser.email || "",
  };
}

function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado>(null);
  const [carregando, setCarregando] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) return undefined;

    let ativo = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!ativo) return;
      setUsuario(formatarUsuario(sessao?.user));
      setCarregando(false);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!ativo) return;
        setUsuario(error ? null : formatarUsuario(data.session?.user));
        setCarregando(false);
      })
      .catch(() => {
        if (!ativo) return;
        setUsuario(null);
        setCarregando(false);
      });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
