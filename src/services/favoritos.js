function obterChaveFavoritos() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario) {
    return null;
  }

  return `favoritos_${usuario.email}`;
}

function obterFavoritos() {
  const chave = obterChaveFavoritos();

  if (!chave) {
    return [];
  }

  return JSON.parse(localStorage.getItem(chave)) || [];
}

function estaFavorito(id) {
  const favoritos = obterFavoritos();

  return favoritos.includes(id);
}

function alternarFavorito(id) {
  const chave = obterChaveFavoritos();

  if (!chave) {
    return false;
  }

  const favoritos = obterFavoritos();
  const indice = favoritos.indexOf(id);

  if (indice >= 0) {
    favoritos.splice(indice, 1);
  } else {
    favoritos.push(id);
  }

  localStorage.setItem(chave, JSON.stringify(favoritos));

  return favoritos.includes(id);
}

export {
  obterFavoritos,
  estaFavorito,
  alternarFavorito,
};