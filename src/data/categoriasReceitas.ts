const CATEGORIAS_RECEITAS: string[] = [
  "Entradas",
  "Pratos principais",
  "Acompanhamentos",
  "Sobremesas",
  "Bebidas",
  "Lanches",
  "Saladas",
  "Sopas",
  "Petiscos",
  "Massas",
  "Peixes",
  "Aves",
  "Bolos",
  "Doces",
  "Sucos",
];

const GRUPOS_CATEGORIAS: Record<string, string[]> = {
  entradas: ["Saladas", "Sopas", "Petiscos"],
  sobremesas: ["Bolos", "Doces"],
  bebidas: ["Bebidas", "Sucos"],
};

export { CATEGORIAS_RECEITAS, GRUPOS_CATEGORIAS };
