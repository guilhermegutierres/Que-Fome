import { useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "./auth-context";
import { AUTH_EVENT, consultarUsuario, type Usuario } from "../services/auth";

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    let revisao = 0;
    async function atualizarSessao() {
      const id = ++revisao;
      try {
        const usuarioAtual = await consultarUsuario();
        if (ativo && revisao === id) setUsuario(usuarioAtual);
      } catch {
        if (ativo && revisao === id) setUsuario(null);
      } finally {
        if (ativo && revisao === id) setCarregando(false);
      }
    }
    void atualizarSessao();
    window.addEventListener(AUTH_EVENT, atualizarSessao);
    return () => {
      ativo = false;
      window.removeEventListener(AUTH_EVENT, atualizarSessao);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
