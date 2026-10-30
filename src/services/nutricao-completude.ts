type ChaveNutriente =
  | "kcal"
  | "protein"
  | "carbohydrate"
  | "lipids"
  | "fiber"
  | "calcium"
  | "iron"
  | "phosphorus";

interface DadosNutricionais {
  unavailableNutrients?: {
    macros?: unknown;
    micros?: unknown;
  } | null;
}

interface ResultadoCompletude {
  incompleto: boolean;
  metadataValida: boolean;
  nutrientesAusentes: ChaveNutriente[];
}

const CHAVES_NUTRIENTES: ChaveNutriente[] = [
  "kcal",
  "protein",
  "carbohydrate",
  "lipids",
  "fiber",
  "calcium",
  "iron",
  "phosphorus",
];

function avaliarCompletudeNutricional(
  dados: DadosNutricionais | null | undefined,
  possuiIngredienteSemVinculo: boolean,
): ResultadoCompletude {
  const ausentes = dados?.unavailableNutrients;
  const metadataValida =
    Array.isArray(ausentes?.macros) && Array.isArray(ausentes?.micros);
  const nutrientesAusentes: unknown[] = metadataValida
    ? [
        ...(ausentes?.macros as unknown[]),
        ...(ausentes?.micros as unknown[]),
      ]
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
