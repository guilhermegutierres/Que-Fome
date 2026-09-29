import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { login } from "../services/auth";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    setErro("");

    if (!email || !senha) {
      setErro("Preencha seu e-mail e sua senha.");
      return;
    }

    const sucesso = login(email, senha);

    if (!sucesso) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    navigate("/");
  }

  return (
    <>
      <Navbar compact />

      <main className="login-page">
        <section className="login-card">
          <h1>Entrar</h1>

          <p className="login-subtitulo">
            Acesse sua conta para salvar suas receitas favoritas.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">
              E-mail
            </label>

            <input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />

            <label htmlFor="senha">
              Senha
            </label>

            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) =>
                setSenha(event.target.value)
              }
            />

            {erro && (
              <p className="login-erro">
                {erro}
              </p>
            )}

            <button type="submit">
              Entrar
            </button>
          </form>

          <p className="login-cadastro">
            Ainda não possui uma conta?
            <Link to="/cadastro">
              {" "}Criar conta
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}

export default Login;