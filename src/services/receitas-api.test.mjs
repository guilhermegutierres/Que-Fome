import assert from "node:assert/strict";
import test from "node:test";
import { criarServicoReceitas } from "./receitas.ts";

function criarResposta(dados, status = 200) {
  return new Response(dados == null ? null : JSON.stringify(dados), { status });
}

test("consulta receitas públicas sem sessão e percorre todas as páginas", async () => {
  const chamadas = [];
  const servico = criarServicoReceitas({
    baseUrl: "/api",
    fetchImpl: async (url, options) => {
      chamadas.push({ url, options });
      const page = Number(
        new URL(url, "http://local").searchParams.get("page"),
      );
      return criarResposta({
        items: [
          {
            id: `uuid-${page}`,
            imagemPath:
              page === 1 ? "lasanha.jpg" : "https://externa.test/img.jpg",
            ingredientesDetalhados: [
              {
                tacoId: 10,
                textoExibicao: "2 colheres de azeite",
                gramasEstimadas: true,
              },
            ],
            porcoes: 4,
            modoPreparo: ["Misture."],
          },
        ],
        totalPages: 2,
      });
    },
  });

  const receitas = await servico.obterReceitas();

  assert.equal(chamadas.length, 2);
  assert.ok(
    chamadas.every(({ options }) => !options.headers.has("Authorization")),
  );
  assert.equal(receitas[0].id, "uuid-1");
  assert.equal(receitas[0].imagem, "/images/receitas/lasanha.jpg");
  assert.equal(receitas[1].imagem, "https://externa.test/img.jpg");
  assert.equal(
    receitas[0].ingredientesDetalhados[0].textoExibicao,
    "2 colheres de azeite",
  );
  assert.equal(receitas[0].ingredientesDetalhados[0].gramasEstimadas, true);
  assert.equal(receitas[0].porcoes, 4);
});

test("consulta detalhe público preservando o UUID como string sem token", async () => {
  let chamada;
  const servico = criarServicoReceitas({
    fetchImpl: async (url, options) => {
      chamada = { url, options };
      return criarResposta({ id: "a1b2c3d4-uuid", ingredientesDetalhados: [] });
    },
  });

  const receita = await servico.obterReceita("a1b2c3d4-uuid");

  assert.equal(receita.id, "a1b2c3d4-uuid");
  assert.equal(chamada.url, "/api/recipes/a1b2c3d4-uuid");
  assert.equal(chamada.options.headers.has("Authorization"), false);
});

test("usa cookie de sessão em /recipes/mine e nas operações de escrita", async () => {
  const chamadas = [];
  const servico = criarServicoReceitas({
    baseUrl: "/api",
    fetchImpl: async (url, options) => {
      chamadas.push({ url, options });
      return options.method === "DELETE"
        ? criarResposta(null, 204)
        : criarResposta(
            url.includes("/mine")
              ? { items: [{ id: "receita-uuid" }], totalPages: 1 }
              : {
                  id: "receita-uuid",
                  tipo: "usuario",
                  autorId: "usuario-uuid",
                },
          );
    },
  });

  assert.equal((await servico.obterReceitasPorAutor())[0].id, "receita-uuid");
  await servico.salvarReceita({ titulo: "Teste" });
  await servico.atualizarReceita("receita-uuid", { titulo: "Atualizada" });
  await servico.excluirReceita("receita-uuid");

  assert.deepEqual(
    chamadas.map(({ options }) => options.method || "GET"),
    ["GET", "POST", "PATCH", "DELETE"],
  );
  assert.ok(chamadas.every(({ options }) => options.credentials === "include"));
  assert.match(chamadas[0].url, /\/recipes\/mine\?/);
});

test("exibe a mensagem do backend quando a sessão é inválida", async () => {
  let chamadas = 0;
  const servico = criarServicoReceitas({
    fetchImpl: async () => {
      chamadas += 1;
      return criarResposta({ message: "Sua sessão expirou." }, 401);
    },
  });

  await assert.rejects(servico.salvarReceita({}), /sessão expirou/i);
  assert.equal(chamadas, 1);
});

test("envia imagem para o backend local", async () => {
  let chamada;
  const servico = criarServicoReceitas({
    fetchImpl: async (url, init) => {
      chamada = { url, init };
      return criarResposta({ imagemPath: "/uploads/receitas/uuid/foto.jpg" });
    },
  });
  const imagemPath = await servico.enviarImagem(new Blob(["abc"], { type: "image/jpeg" }), "uuid");
  assert.equal(imagemPath, "/uploads/receitas/uuid/foto.jpg");
  assert.equal(chamada.url, "/api/uploads/receitas");
  assert.equal(chamada.init.credentials, "include");
  assert.ok(chamada.init.body instanceof FormData);
});
