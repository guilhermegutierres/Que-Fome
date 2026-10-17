const CHAVES_NUTRIENTES = [
  "kcal",
  "protein",
  "carbohydrate",
  "lipids",
  "fiber",
  "calcium",
  "iron",
  "phosphorus",
];

function avaliarCompletudeNutricional(dados, possuiIngredienteSemVinculo) {
  const ausentes = dados?.unavailableNutrients;
  const metadataValida =
    Array.isArray(ausentes?.macros) && Array.isArray(ausentes?.micros);
  const nutrientesAusentes = metadataValida
    ? [...ausentes.macros, ...ausentes.micros]
    : [];

  return {
    incompleto:
      possuiIngredienteSemVinculo ||
      !metadataValida ||
      nutrientesAusentes.length > 0,
    metadataValida,
    nutrientesAusentes: CHAVES_NUTRIENTES.filter((chave) =>
      nutrientesAusentes.includes(chave),
    ),
  };
}

export { avaliarCompletudeNutricional };
