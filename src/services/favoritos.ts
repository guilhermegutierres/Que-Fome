type IdReceita = string | number;

const EVENTO_FAVORITOS_ATUALIZADOS = "favoritos-atualizados";

function obterChaveFavoritos(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  return `favoritos_${email}`;
}

function obterFavoritos(email: string | null | undefined): IdReceita[] {
  const chave = obterChaveFavoritos(email);

  if (!chave) {
    return [];
  }

  return (JSON.parse(localStorage.getItem(chave) as string) || []) as IdReceita[];
}

function estaFavorito(
  id: IdReceita,
  email: string | null | undefined,
): boolean {
  const favoritos = obterFavoritos(email);

  return favoritos.includes(id);
}

function alternarFavorito(
  id: IdReceita,
  email: string | null | undefined,
): boolean {
  const chave = obterChaveFavoritos(email);

  if (!chave) {
    return false;
  }

  const favoritos = obterFavoritos(email);
  const indice = favoritos.indexOf(id);

  if (indice >= 0) {
    favoritos.splice(indice, 1);
  } else {
    favoritos.push(id);
  }

  localStorage.setItem(chave, JSON.stringify(favoritos));
  window.dispatchEvent(new Event(EVENTO_FAVORITOS_ATUALIZADOS));

  return favoritos.includes(id);
}

function removerReceitaDosFavoritos(id: IdReceita): void {
  const chavesFavoritos = Object.keys(localStorage).filter((chave) =>
    chave.startsWith("favoritos_"),
  );

  chavesFavoritos.forEach((chave) => {
    try {
      const favoritos =
        (JSON.parse(localStorage.getItem(chave) as string) || []) as IdReceita[];
      if (Array.isArray(favoritos)) {
        const favoritosAtualizados = favoritos.filter(
          (idFavorito) => idFavorito !== id,
        );
        if (favoritosAtualizados.length !== favoritos.length) {
          localStorage.setItem(chave, JSON.stringify(favoritosAtualizados));
        }
      }
    } catch {
      // Uma lista inválida não deve impedir a exclusão da receita.
    }
  });

  window.dispatchEvent(new Event(EVENTO_FAVORITOS_ATUALIZADOS));
}

export {
  obterFavoritos,
  estaFavorito,
  alternarFavorito,
  removerReceitaDosFavoritos,
  EVENTO_FAVORITOS_ATUALIZADOS,
};
