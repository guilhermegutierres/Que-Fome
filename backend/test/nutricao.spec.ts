import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AlimentosService } from "../src/alimentos/alimentos.service.js";
import { AlimentosRepository } from "../src/alimentos/alimentos.repository.js";
import { AlimentosTacoRepository } from "../src/alimentos/alimentos-taco.repository.js";
import type { AlimentoRow } from "../src/alimentos/alimentos.types.js";
import { avaliarCompletudeNutricional } from "../../src/services/nutricao-completude.js";

const alimentoBase: AlimentoRow = {
  taco_id: 1,
  descricao: "Alimento de teste",
  energia_kcal: 100,
  proteina_g: 10,
  carboidratos_g: 20,
  lipidios_g: 3,
  fibras_g: 2,
  calcio_mg: 30,
  ferro_mg: 1,
  fosforo_mg: 40,
};

class RepositorioDeTeste extends AlimentosRepository {
  constructor(private readonly alimentos: AlimentoRow[]) {
    super();
  }

  async buscar() {
    return [];
  }

  async obterPorIds(ids: number[]) {
    return this.alimentos.filter((alimento) => ids.includes(alimento.taco_id));
  }
}

describe("completude nutricional", () => {
  it("mantém cálculo completo quando todos os nutrientes estão disponíveis", async () => {
    const service = new AlimentosService(
      new RepositorioDeTeste([alimentoBase]),
    );
    const resultado = await service.calcular({
      items: [{ id: alimentoBase.taco_id, grams: 100 }],
    });

    assert.deepEqual(resultado.unavailableNutrients, {
      macros: [],
      micros: [],
    });
    assert.equal(resultado.totals.macros.kcal, 100);
    assert.equal(resultado.totals.macros.protein, 10);
    assert.equal(
      avaliarCompletudeNutricional(resultado, false).incompleto,
      false,
    );
  });

  it("marca subtotais quando um alimento não tem alguns nutrientes", async () => {
    const segundoAlimento = {
      ...alimentoBase,
      taco_id: 2,
      descricao: "Alimento com dados ausentes",
      energia_kcal: null,
      proteina_g: null,
    };
    const service = new AlimentosService(
      new RepositorioDeTeste([alimentoBase, segundoAlimento]),
    );
    const resultado = await service.calcular({
      items: [
        { id: alimentoBase.taco_id, grams: 100 },
        { id: segundoAlimento.taco_id, grams: 100 },
      ],
    });

    assert.equal(resultado.items[1].kcal, null);
    assert.equal(resultado.totals.macros.kcal, 100);
    assert.equal(resultado.totals.macros.protein, 10);
    assert.deepEqual(resultado.unavailableNutrients?.macros, [
      "kcal",
      "protein",
    ]);
    assert.equal(
      avaliarCompletudeNutricional(resultado, false).incompleto,
      true,
    );
  });

  it("preserva valores totalmente ausentes como null na TACO local", async () => {
    const service = new AlimentosService(new AlimentosTacoRepository());
    const resultado = await service.calcular({
      items: [{ id: 458, grams: 100 }],
    });

    assert.equal(resultado.items[0].kcal, null);
    assert.equal(resultado.totals.macros.kcal, null);
    assert.equal(resultado.totals.macros.protein, null);
    assert.ok(resultado.unavailableNutrients?.macros.includes("kcal"));
    assert.ok(resultado.unavailableNutrients?.macros.includes("protein"));
  });

  it("marca como parcial uma receita com ingredientes sem vínculo TACO", () => {
    const resultado = {
      unavailableNutrients: { macros: [], micros: [] },
    };
    assert.equal(
      avaliarCompletudeNutricional(resultado, true).incompleto,
      true,
    );
  });

  it("não presume completude quando a fonte não envia metadata", () => {
    const status = avaliarCompletudeNutricional({}, false);
    assert.equal(status.incompleto, true);
    assert.equal(status.metadataValida, false);
  });
});
