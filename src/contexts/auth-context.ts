import { createContext, useContext } from "react";

interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
}

interface ValorAuthContext {
  usuario: UsuarioAutenticado | null;
  carregando: boolean;
}

const AuthContext = createContext<ValorAuthContext | null>(null);

function useAuth(): ValorAuthContext {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  }
  return contexto;
}

export { AuthContext, useAuth };
