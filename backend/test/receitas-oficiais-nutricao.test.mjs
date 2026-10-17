import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const recipesPath = new URL("../data/receitas-oficiais.json", import.meta.url);
const tacoPath = new URL("../data/taco/TACO.json", import.meta.url);
const loaderPath = new URL(
  "../scripts/carregar-receitas-oficiais.mjs",
  import.meta.url,
);

test("suco de laranja usa registro TACO de suco e peso estimado do líquido", async () => {
  const [recipesText, tacoText, loaderText] = await Promise.all([
    readFile(recipesPath, "utf8"),
    readFile(tacoPath, "utf8"),
    readFile(loaderPath, "utf8"),
  ]);
  const recipes = JSON.parse(recipesText);
  const taco = JSON.parse(tacoText);
  const recipe = recipes.find((item) => item.titulo === "Suco de Laranja");
  const ingredient = recipe?.ingredientes?.[0];
  const food = taco.find((item) => item.id === ingredient?.tacoId);

  assert.equal(ingredient?.quantidade, "4 unidades");
  assert.equal(ingredient?.textoExibicao, "4 laranjas");
  assert.equal(ingredient?.tacoId, 215);
  assert.equal(food?.description, "Laranja, pêra, suco");
  assert.match(food.description, /suco$/i);
  assert.equal(ingredient?.gramas, 300);
  assert.equal(ingredient?.gramasEstimadas, true);
  assert.match(ingredient?.observacao || "", /suco extraído/i);
  assert.match(loaderText, /\[215,\s*"Laranja, pêra, suco"\]/);
});
