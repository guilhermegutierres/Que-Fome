import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  atualizarParametrosTag,
  receitaCorrespondeTags,
} from "../data/tagsReceitas.js";
import { CATEGORIAS_RECEITAS } from "../data/categoriasReceitas.js";
import {
  receitaCorrespondeBusca,
  receitaCorrespondeCategoria,
} from "./filtros-receitas.js";

test("atalhos filtram por tags e preservam categoria e demais filtros", () => {
  const atuais = new URLSearchParams(
    "categoria=Acompanhamentos&busca=caseira&tempo=30&custo=Baixo&dificuldade=F%C3%A1cil&origem=menu",
  );

  const proximos = atualizarParametrosTag(atuais, "Carnes");
  assert.equal(proximos.get("tag"), "carnes");
  assert.equal(proximos.get("categoria"), "Acompanhamentos");
  assert.equal(proximos.get("busca"), "caseira");
  assert.equal(proximos.get("tempo"), "30");
  assert.equal(proximos.get("custo"), "Baixo");
  assert.equal(proximos.get("dificuldade"), "Fácil");
  assert.equal(proximos.get("origem"), "menu");
});

test("busca é insensível a maiúsculas e acentos nos campos da API", () => {
  const arrozCarreteiro = {
    titulo: "Arroz carreteiro",
    categoria: "Pratos principais",
    ingredientes: ["Arroz, carne-seca e temperos"],
    ingredientesDetalhados: [
      {
        nome: "Pimentão",
        textoExibicao: "Pimentão picado",
        tacoDescricao: "Pimentão verde, cru",
      },
    ],
  };

  assert.equal(receitaCorrespondeBusca(arrozCarreteiro, "ARROZ"), true);
  assert.equal(receitaCorrespondeBusca(arrozCarreteiro, "pimentao"), true);
  assert.equal(receitaCorrespondeBusca(arrozCarreteiro, "verde cru"), true);
  assert.equal(
    receitaCorrespondeCategoria(arrozCarreteiro, "Pratos principais"),
    true,
  );
  assert.equal(
    receitaCorrespondeCategoria(arrozCarreteiro, "Acompanhamentos"),
    false,
  );
});

test("busca de ingrediente encontra receita de outra categoria", () => {
  const galinhada = {
    titulo: "Galinhada",
    categoria: "Pratos principais",
    ingredientes: ["Arroz", "Frango"],
  };

  assert.equal(receitaCorrespondeBusca(galinhada, "arroz"), true);
});

test("categorias oficiais e grupos culinários filtram sem reclassificar receitas", () => {
  assert.equal(new Set(CATEGORIAS_RECEITAS).size, CATEGORIAS_RECEITAS.length);
  for (const categoria of [
    "Entradas",
    "Pratos principais",
    "Acompanhamentos",
    "Sobremesas",
    "Bebidas",
    "Lanches",
  ]) {
    assert.ok(CATEGORIAS_RECEITAS.includes(categoria));
  }

  assert.equal(
    receitaCorrespondeCategoria({ categoria: "Petiscos" }, "Entradas"),
    true,
  );
  assert.equal(
    receitaCorrespondeCategoria({ categoria: "Bolos" }, "Sobremesas"),
    true,
  );
  assert.equal(
    receitaCorrespondeCategoria({ categoria: "Sucos" }, "Bebidas"),
    true,
  );
  assert.equal(
    receitaCorrespondeCategoria({ categoria: "Pratos principais" }, "Lanches"),
    false,
  );
});

test("o seletor inclui todas as categorias atuais do catálogo oficial", async () => {
  const receitas = JSON.parse(
    await readFile(
      new URL("../../backend/data/receitas-oficiais.json", import.meta.url),
      "utf8",
    ),
  );

  for (const categoria of new Set(
    receitas.map((receita) => receita.categoria),
  )) {
    assert.ok(CATEGORIAS_RECEITAS.includes(categoria), categoria);
  }
});

test("Tomate é uma tag canônica selecionável e pesquisável", () => {
  assert.equal(receitaCorrespondeTags({ tags: ["tomate"] }, "Tomate"), true);
});

test("atalho Carnes encontra as proteínas do grupo sem mudar a categoria", () => {
  for (const tag of ["carne", "carne-seca", "frango", "peixe", "camarao"]) {
    assert.equal(
      receitaCorrespondeTags(
        { categoria: "Pratos principais", tags: [tag] },
        "carnes",
      ),
      true,
    );
  }

  assert.equal(
    receitaCorrespondeTags(
      { categoria: "Acompanhamentos", tags: ["arroz"] },
      "carnes",
    ),
    false,
  );
  assert.equal(receitaCorrespondeTags({ tags: ["batata"] }, "batatas"), true);
});
