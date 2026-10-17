// Os NUMERIC do PostgreSQL chegam como string no driver pg; não altere para number no banco.
export interface AlimentoRow {
  taco_id: number;
  descricao: string;
  energia_kcal: string | number | null;
  proteina_g: string | number | null;
  carboidratos_g: string | number | null;
  lipidios_g: string | number | null;
  fibras_g: string | number | null;
  calcio_mg: string | number | null;
  ferro_mg: string | number | null;
  fosforo_mg: string | number | null;
}

export interface AlimentoBuscaRow {
  taco_id: number;
  descricao: string;
  energia_kcal: string | number | null;
}

export interface AlimentoBusca {
  id: number;
  descricao: string;
  kcal: number | null;
}

type Nutrientes = {
  kcal: number | null;
  protein: number | null;
  carbohydrate: number | null;
  lipids: number | null;
  fiber: number | null;
};

export type NutrienteMacro = keyof Nutrientes;
export type NutrienteMicro = "calcium" | "iron" | "phosphorus";

export interface NutrientesAusentes {
  macros: NutrienteMacro[];
  micros: NutrienteMicro[];
}

export interface RefeicaoCalculada {
  items: Array<{ id: number; grams: number; kcal: number | null }>;
  // Valores sem representação numérica são explicitados para que subtotais
  // nunca pareçam completos; inclui campos TACO NA, Tr, * ou vazios.
  // APIs externas antigas podem não fornecer essa metadata.
  unavailableNutrients?: NutrientesAusentes;
  totals: {
    grams: number;
    macros: Nutrientes;
    micros: {
      calcium: number | null;
      iron: number | null;
      phosphorus: number | null;
    };
  };
}
