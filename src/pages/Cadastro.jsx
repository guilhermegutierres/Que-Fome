import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cadastrar } from "../services/auth";
import "./Cadastro.css";

function Cadastro() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    setErro("");

    if (!nome || !email || !senha || !confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    const resultado = cadastrar(nome, email, senha);

    if (!resultado.sucesso) {
      setErro(resultado.mensagem);
      return;
    }

    navigate("/login");
  }

  return (
    <main className="cadastro-page">
      <section className="cadastro-card">
        <Link to="/" className="cadastro-logo">
          Que Fome!
        </Link>

        <h1>Criar conta</h1>

        <p className="cadastro-subtitulo">
          Crie sua conta para salvar receitas e publicar suas próprias receitas.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="nome">Nome</label>

          <input
            id="nome"
            type="text"
            placeholder="Digite seu nome"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
          />

          <label htmlFor="email">E-mail</label>

          <input
            id="email"
            type="email"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="senha">Senha</label>

          <input
            id="senha"
            type="password"
            placeholder="Mínimo de 6 caracteres"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
          />

          <label htmlFor="confirmar-senha">Confirmar senha</label>

          <input
            id="confirmar-senha"
            type="password"
            placeholder="Digite a senha novamente"
            value={confirmarSenha}
            onChange={(event) =>
              setConfirmarSenha(event.target.value)
            }
          />

          {erro && <p className="cadastro-erro">{erro}</p>}

          <button type="submit">
            Criar conta
          </button>
        </form>

        <p className="cadastro-login">
          Já possui uma conta?
          <Link to="/login"> Entrar</Link>
        </p>
      </section>
    </main>
  );
}

export default Cadastro;