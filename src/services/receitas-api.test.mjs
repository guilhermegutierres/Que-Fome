import assert from "node:assert/strict";
import test from "node:test";
import { criarServicoReceitas } from "./receitas.js";

function criarResposta(dados, status = 200) {
  return new Response(dados == null ? null : JSON.stringify(dados), { status });
}

test("consulta receitas públicas sem sessão e percorre todas as páginas", async () => {
  const chamadas = [];
  const clienteSupabase = {
    storage: {
      from(bucket) {
        assert.equal(bucket, "receitas");
        return {
          getPublicUrl(path) {
            return { data: { publicUrl: `https://storage.test/${path}` } };
          },
        };
      },
    },
  };
  const servico = criarServicoReceitas({
    baseUrl: "/api",
    supabaseClient: clienteSupabase,
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
  assert.equal(receitas[0].imagem, "https://storage.test/lasanha.jpg");
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

test("usa token de sessão em /recipes/mine e nas operações de escrita", async () => {
  const chamadas = [];
  const servico = criarServicoReceitas({
    baseUrl: "/api",
    supabaseClient: {
      auth: {
        async getSession() {
          return {
            data: {
              session: {
                access_token: "token-de-teste",
                user: { id: "usuario-uuid" },
              },
            },
          };
        },
      },
    },
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
  assert.ok(
    chamadas.every(
      ({ options }) =>
        options.headers.get("Authorization") === "Bearer token-de-teste",
    ),
  );
  assert.match(chamadas[0].url, /\/recipes\/mine\?/);
});

test("não envia operações protegidas quando não há sessão", async () => {
  let chamadas = 0;
  const servico = criarServicoReceitas({
    supabaseClient: {
      auth: {
        async getSession() {
          return { data: { session: null }, error: null };
        },
      },
    },
    fetchImpl: async () => {
      chamadas += 1;
      return criarResposta({ id: "nao-esperado" });
    },
  });

  await assert.rejects(servico.salvarReceita({}), /sessão expirou/i);
  assert.equal(chamadas, 0);
});

test("envia imagens com caminho exclusivo do usuário e sem sobrescrita", async () => {
  let upload;
  const servico = criarServicoReceitas({
    supabaseClient: {
      auth: {
        async getSession() {
          return {
            data: {
              session: {
                access_token: "token",
                user: { id: "usuario-uuid" },
              },
            },
          };
        },
      },
      storage: {
        from(bucket) {
          assert.equal(bucket, "receitas");
          return {
            async upload(path, file, options) {
              upload = { path, file, options };
              return { error: null };
            },
          };
        },
      },
    },
    cryptoImpl: { randomUUID: () => "uuid-unico" },
  });

  const caminho = await servico.enviarImagem(
    { type: "image/jpeg" },
    "usuario-uuid",
  );

  assert.equal(caminho, "usuario-uuid/uuid-unico.jpg");
  assert.equal(upload.path, caminho);
  assert.equal(upload.options.upsert, false);
  assert.equal(upload.options.contentType, "image/jpeg");
  await assert.rejects(
    servico.enviarImagem({ type: "image/jpeg" }, "outro-usuario"),
    /confirmar a autoria/i,
  );
});
