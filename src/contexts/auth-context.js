import { createContext, useContext } from "react";

const AuthContext = createContext(null);

function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  }
  return contexto;
}

export { AuthContext, useAuth };
