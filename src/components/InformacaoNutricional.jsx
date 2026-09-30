import { useEffect, useState } from "react";
import { apiConfigurada, calcularNutricao } from "../services/nutricao";
import "./InformacaoNutricional.css";

const NUTRIENTES = [
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

function formatarNumero(valor, casasDecimais = 1) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "—";

  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: casasDecimais,
  });
}

function estaVinculado(ingrediente) {
  return Boolean(ingrediente.tacoId) && Number(ingrediente.gramas) > 0;
}

function InformacaoNutricional({ ingredientes }) {
  const vinculados = ingredientes.filter(estaVinculado);
  const itens = vinculados.map((ingrediente) => ({
    id: ingrediente.tacoId,
    grams: Number(ingrediente.gramas),
  }));
  const chaveItens = JSON.stringify(itens);

  // O resultado guarda a chave dos itens calculados; se os itens mudarem,
  // o resultado antigo é ignorado até a nova resposta chegar.
  const [resultadoSalvo, setResultadoSalvo] = useState(null);
  const resultado =
    resultadoSalvo?.chave === chaveItens
      ? resultadoSalvo
      : { status: "carregando" };

  useEffect(() => {
    const itensParaCalcular = JSON.parse(chaveItens);
    if (itensParaCalcular.length === 0 || !apiConfigurada()) return;

    let cancelado = false;

    calcularNutricao(itensParaCalcular)
      .then((dados) => {
        if (!cancelado) {
          setResultadoSalvo({ chave: chaveItens, status: "sucesso", dados });
        }
      })
      .catch((falha) => {
        if (!cancelado) {
          setResultadoSalvo({
            chave: chaveItens,
            status: "erro",
            erro: falha.message,
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
        Nenhum ingrediente desta receita está vinculado à tabela nutricional.
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
    const { items: itensCalculados = [], totals } = resultado.dados;
    let indiceVinculado = 0;

    conteudo = (
      <>
        <table className="nutricao-tabela">
          <thead>
            <tr>
              <th scope="col">Ingrediente</th>
              <th scope="col">Peso</th>
              <th scope="col">Calorias</th>
            </tr>
          </thead>

          <tbody>
            {ingredientes.map((ingrediente, index) => {
              // A API devolve os itens na mesma ordem em que foram enviados.
              const calculado = estaVinculado(ingrediente)
                ? itensCalculados[indiceVinculado++]
                : null;

              return (
                <tr key={index}>
                  <td>
                    {ingrediente.quantidade} {ingrediente.nome}
                    {ingrediente.tacoDescricao && (
                      <small>TACO: {ingrediente.tacoDescricao}</small>
                    )}
                  </td>
                  <td>
                    {calculado ? `${formatarNumero(calculado.grams)} g` : "—"}
                  </td>
                  <td>
                    {calculado
                      ? `${formatarNumero(calculado.kcal, 0)} kcal`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{formatarNumero(totals.grams)} g</td>
              <td>{formatarNumero(totals.macros.kcal, 0)} kcal</td>
            </tr>
          </tfoot>
        </table>

        <h3 className="nutricao-subtitulo">Total de nutrientes</h3>

        <dl className="nutricao-nutrientes">
          <div className="nutricao-destaque">
            <dt>Calorias</dt>
            <dd>{formatarNumero(totals.macros.kcal, 0)} kcal</dd>
          </div>

          {NUTRIENTES.map(({ grupo, chave, nome, unidade }) => (
            <div key={chave}>
              <dt>{nome}</dt>
              <dd>
                {formatarNumero(totals[grupo]?.[chave])} {unidade}
              </dd>
            </div>
          ))}
        </dl>

        {vinculados.length < ingredientes.length && (
          <p className="nutricao-observacao">
            Ingredientes marcados com “—” não entram no cálculo.
          </p>
        )}
      </>
    );
  }

  return (
    <section className="receita-secao informacao-nutricional">
      <h2>Informação nutricional</h2>
      {conteudo}
      <p className="nutricao-fonte">
        Valores calculados com base na Tabela Brasileira de Composição de
        Alimentos (TACO/Unicamp).
      </p>
    </section>
  );
}

export default InformacaoNutricional;
