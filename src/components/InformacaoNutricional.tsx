import { useEffect, useState } from "react";
import { apiConfigurada, calcularNutricao } from "../services/nutricao";
import { avaliarCompletudeNutricional } from "../services/nutricao-completude";
import "./InformacaoNutricional.css";

type ResultadoRefeicao = NonNullable<
  Awaited<ReturnType<typeof calcularNutricao>>
>;
type ChaveMacro = keyof ResultadoRefeicao["totals"]["macros"];
type ChaveMicro = keyof ResultadoRefeicao["totals"]["micros"];
type ChaveNutriente = ChaveMacro | ChaveMicro;

interface IngredienteNutricional {
  tacoId?: number | null;
  gramas?: unknown;
  nome?: string;
  quantidade?: string | null;
  tacoDescricao?: string | null;
}

interface InformacaoNutricionalProps {
  ingredientes: IngredienteNutricional[];
}

interface ResultadoSalvo {
  chave: string;
  status: "sucesso" | "erro";
  dados?: ResultadoRefeicao | null;
  erro?: string;
}

const NUTRIENTES: Array<{
  grupo: "macros" | "micros";
  chave: Exclude<ChaveMacro, "kcal"> | ChaveMicro;
  nome: string;
  unidade: string;
}> = [
  { grupo: "macros", chave: "protein", nome: "Proteínas", unidade: "g" },
  {
    grupo: "macros",
    chave: "carbohydrate",
    nome: "Carboidratos",
    unidade: "g",
  },
  { grupo: "macros", chave: "lipids", nome: "Gorduras", unidade: "g" },
  { grupo: "macros", chave: "fiber", nome: "Fibras", unidade: "g" },
  { grupo: "micros", chave: "calcium", nome: "Cálcio", unidade: "mg" },
  { grupo: "micros", chave: "iron", nome: "Ferro", unidade: "mg" },
  { grupo: "micros", chave: "phosphorus", nome: "Fósforo", unidade: "mg" },
];

const NOMES_NUTRIENTES: Record<ChaveNutriente, string> = {
  kcal: "calorias",
  protein: "proteínas",
  carbohydrate: "carboidratos",
  lipids: "gorduras",
  fiber: "fibras",
  calcium: "cálcio",
  iron: "ferro",
  phosphorus: "fósforo",
};

function formatarNumero(valor: unknown, casasDecimais = 1): string {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "—";

  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: casasDecimais,
  });
}

function estaVinculado(
  ingrediente: IngredienteNutricional,
): ingrediente is IngredienteNutricional & { tacoId: number } {
  return Boolean(ingrediente.tacoId) && Number(ingrediente.gramas) > 0;
}

function InformacaoNutricional({ ingredientes }: InformacaoNutricionalProps) {
  const vinculados = ingredientes.filter(estaVinculado);
  const possuiIngredienteSemVinculo = vinculados.length < ingredientes.length;
  const itens = vinculados.map((ingrediente) => ({
    id: ingrediente.tacoId,
    grams: Number(ingrediente.gramas),
  }));
  const chaveItens = JSON.stringify(itens);

  // O resultado guarda a chave dos itens calculados; se os itens mudarem,
  // o resultado antigo é ignorado até a nova resposta chegar.
  const [resultadoSalvo, setResultadoSalvo] = useState<ResultadoSalvo | null>(
    null,
  );
  const resultado =
    resultadoSalvo?.chave === chaveItens
      ? resultadoSalvo
      : { status: "carregando" as const };

  useEffect(() => {
    const itensParaCalcular = JSON.parse(chaveItens);
    if (itensParaCalcular.length === 0 || !apiConfigurada()) return;

    let cancelado = false;

    calcularNutricao(itensParaCalcular)
      .then((dados) => {
        if (!cancelado) {
          setResultadoSalvo({
            chave: chaveItens,
            status: "sucesso",
            dados,
          });
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setResultadoSalvo({
            chave: chaveItens,
            status: "erro",
            erro: (falha as Error).message,
          });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [chaveItens]);

  let conteudo;

  if (vinculados.length === 0) {
    conteudo = (
      <p className="receita-lista-vazia">
        Nenhum ingrediente foi vinculado à tabela TACO. A receita continua
        disponível, mas não há dados para estimar seus nutrientes.
      </p>
    );
  } else if (!apiConfigurada()) {
    conteudo = (
      <p className="receita-lista-vazia">
        Informação nutricional indisponível: a chave da API não foi configurada.
      </p>
    );
  } else if (resultado.status === "carregando") {
    conteudo = (
      <p className="receita-lista-vazia">
        Calculando informação nutricional...
      </p>
    );
  } else if (resultado.status === "erro") {
    conteudo = <p className="nutricao-erro">{resultado.erro}</p>;
  } else {
    const dados = resultado.dados!;
    const { items: itensCalculados = [], totals } = dados;
    const completude = avaliarCompletudeNutricional(
      dados,
      possuiIngredienteSemVinculo,
    );

    conteudo = (
      <>
        <div className="nutricao-tabela-container">
          <table className="nutricao-tabela">
            <thead>
              <tr>
                <th scope="col">Ingrediente</th>
                <th scope="col">Quantidade na receita</th>
                <th scope="col">Peso</th>
                <th scope="col">Calorias estimadas</th>
              </tr>
            </thead>

            <tbody>
              {vinculados.map((ingrediente, index) => {
                const calculado = itensCalculados[index];

                return (
                  <tr key={`${ingrediente.tacoId}-${index}`}>
                    <td>
                      {ingrediente.nome}
                      {ingrediente.tacoDescricao && (
                        <small>
                          Alimento TACO: {ingrediente.tacoDescricao}
                        </small>
                      )}
                    </td>
                    <td>{ingrediente.quantidade || "—"}</td>
                    <td>{formatarNumero(Number(ingrediente.gramas))} g</td>
                    <td>
                      {calculado?.kcal === null ||
                      calculado?.kcal === undefined ? (
                        <>
                          —<small>Valor numérico indisponível na TACO</small>
                        </>
                      ) : (
                        `${formatarNumero(calculado.kcal, 0)} kcal`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>
                  {completude.incompleto
                    ? "Subtotal dos dados nutricionais disponíveis"
                    : "Totais da receita"}
                </th>
                <td>{formatarNumero(totals.grams)} g no cálculo</td>
                <td>{formatarNumero(totals.macros.kcal, 0)} kcal</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <h3 className="nutricao-subtitulo">
          {completude.incompleto
            ? "Nutrientes disponíveis no cálculo"
            : "Total de nutrientes"}
        </h3>

        <dl className="nutricao-nutrientes">
          <div className="nutricao-destaque">
            <dt>Calorias</dt>
            <dd>{formatarNumero(totals.macros.kcal, 0)} kcal</dd>
          </div>

          {NUTRIENTES.map(({ grupo, chave, nome, unidade }) => (
            <div key={chave}>
              <dt>{nome}</dt>
              <dd>
                {formatarNumero(
                  (
                    totals as unknown as Record<
                      string,
                      Record<string, number | null>
                    >
                  )[grupo]?.[chave],
                )}{" "}
                {unidade}
              </dd>
            </div>
          ))}
        </dl>

        {possuiIngredienteSemVinculo && (
          <p className="nutricao-observacao">
            Cálculo parcial: considera somente os ingredientes vinculados à
            tabela TACO. Não representa o total nutricional completo da receita.
          </p>
        )}
        {completude.nutrientesAusentes.length > 0 && (
          <p className="nutricao-observacao">
            A TACO não fornece valores numéricos de{" "}
            {completude.nutrientesAusentes
              .map((chave) => NOMES_NUTRIENTES[chave])
              .join(", ")}{" "}
            para todos os alimentos vinculados. Os subtotais consideram apenas
            os valores numéricos disponíveis; campos sem valor numérico não
            foram convertidos em zero.
          </p>
        )}
        {!completude.metadataValida && (
          <p className="nutricao-observacao">
            A fonte não informou se há valores numéricos ausentes. Trate os
            valores exibidos como potencialmente parciais.
          </p>
        )}
      </>
    );
  }

  return (
    <section className="receita-secao informacao-nutricional">
      <h2>Informação nutricional</h2>
      <p className="nutricao-introducao">
        Valores estimados com base nos alimentos selecionados e nos pesos
        informados.
      </p>
      {conteudo}
      <p className="nutricao-fonte">
        Valores calculados com base na Tabela Brasileira de Composição de
        Alimentos (TACO/Unicamp).
      </p>
    </section>
  );
}

export default InformacaoNutricional;
