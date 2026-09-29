function obterUsuarios() {
  return JSON.parse(localStorage.getItem("usuarios")) || [];
}

function cadastrar(nome, email, senha) {
  const usuarios = obterUsuarios();

  const emailExiste = usuarios.some(
    (usuario) => usuario.email.toLowerCase() === email.toLowerCase()
  );

  if (emailExiste) {
    return {
      sucesso: false,
      mensagem: "Este e-mail já está cadastrado.",
    };
  }

  const novoUsuario = {
    id: Date.now(),
    nome,
    email,
    senha,
  };

  usuarios.push(novoUsuario);

  localStorage.setItem("usuarios", JSON.stringify(usuarios));

  return {
    sucesso: true,
    mensagem: "Conta criada com sucesso.",
  };
}

function login(email, senha) {
  const usuarios = obterUsuarios();

  const usuario = usuarios.find(
    (item) =>
      item.email.toLowerCase() === email.toLowerCase() &&
      item.senha === senha
  );

  if (!usuario) {
    return false;
  }

  localStorage.setItem(
    "usuario",
    JSON.stringify({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    })
  );

  return true;
}

function logout() {
  localStorage.removeItem("usuario");
}

function estaLogado() {
  return localStorage.getItem("usuario") !== null;
}

function getUsuario() {
  return JSON.parse(localStorage.getItem("usuario"));
}

export {
  cadastrar,
  login,
  logout,
  estaLogado,
  getUsuario,
};