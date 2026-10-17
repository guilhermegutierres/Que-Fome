import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalogPath = new URL("../data/receitas-oficiais.json", import.meta.url);
const tagsPath = new URL("../data/tags-receitas.json", import.meta.url);
const loaderPath = new URL(
  "../scripts/carregar-receitas-oficiais.mjs",
  import.meta.url,
);
const migrationPath = new URL(
  "../../supabase/migrations/20261016040000_add_recipe_tags.sql",
  import.meta.url,
);

test("catálogo oficial contém tags canônicas em 22 UUIDs exclusivos", async () => {
  const [catalogText, tagsText] = await Promise.all([
    readFile(catalogPath, "utf8"),
    readFile(tagsPath, "utf8"),
  ]);
  const recipes = JSON.parse(catalogText);
  const { tags, aliases, atalhos } = JSON.parse(tagsText);
  const allowedTags = new Set(tags.map((tag) => tag.id));

  assert.equal(recipes.length, 22);
  assert.equal(new Set(recipes.map((recipe) => recipe.id)).size, 22);
  assert.equal(allowedTags.size, tags.length);
  assert.equal(new Set(Object.keys(aliases)).size, Object.keys(aliases).length);

  for (const recipe of recipes) {
    assert.equal(recipe.tipo, "oficial");
    assert.equal(recipe.autorId, null);
    assert.ok(Array.isArray(recipe.tags));
    assert.ok(recipe.tags.every((tag) => allowedTags.has(tag)));
    assert.equal(new Set(recipe.tags).size, recipe.tags.length);
  }

  for (const title of ["Arroz carreteiro", "Galinhada"]) {
    assert.equal(
      recipes.find((recipe) => recipe.titulo === title)?.categoria,
      "Pratos principais",
    );
  }

  assert.deepEqual(atalhos.find((atalho) => atalho.id === "carnes")?.tags, [
    "carne",
    "carne-seca",
    "frango",
    "peixe",
    "camarao",
  ]);
});

test("migration é aditiva e loader atualiza tags somente do catálogo oficial", async () => {
  const [loader, migration] = await Promise.all([
    readFile(loaderPath, "utf8"),
    readFile(migrationPath, "utf8"),
  ]);

  assert.match(
    migration,
    /ALTER TABLE public\.receitas\s+ADD COLUMN tags TEXT\[\] NOT NULL DEFAULT '\{\}'/i,
  );
  assert.match(loader, /tags = EXCLUDED\.tags/);
  assert.match(loader, /String\(error\.code\) === "42703"/);
  assert.match(loader, /20261016040000_add_recipe_tags\.sql/);
  assert.match(
    loader,
    /WHERE public\.receitas\.tipo = 'oficial'\s+AND public\.receitas\.autor_id IS NULL/,
  );
  assert.match(loader, /tags:\s*recipe\.tags|recipe\.tags,/);
});
