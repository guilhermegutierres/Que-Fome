import { BadRequestException, Injectable } from '@nestjs/common';
import { AlimentosRepository } from './alimentos.repository.js';
import type { AlimentoBusca, AlimentoRow, RefeicaoCalculada } from './alimentos.types.js';
import type { CalcularAlimentosDto } from './dto/calcular-alimentos.dto.js';

function numero(valor: string | number | null): number | null {
  if (valor === null) return null;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : null;
}

type LinhaPonderada = { alimento: AlimentoRow; grams: number };

// Retorna null quando todos os valores da fonte estão ausentes;
// se algum ingrediente não tem dado, não o confundimos com zero medido.
function somarPorPeso(linhas: LinhaPonderada[], campo: keyof AlimentoRow): number | null {
  let total = 0;
  let temDado = false;
  for (const { alimento, grams } of linhas) {
    const valor = alimento[campo];
    const medida = (typeof valor === 'string' || typeof valor === 'number') ? numero(valor) : null;
    if (medida !== null) {
      total += (medida * grams) / 100;
      temDado = true;
    }
  }
  return temDado ? total : null;
}

@Injectable()
export class AlimentosService {
  constructor(private readonly repository: AlimentosRepository) {}

  async buscar(busca: string): Promise<AlimentoBusca[]> {
    const alimentos = await this.repository.buscar(busca);
    return alimentos.map((alimento) => ({
      id: alimento.taco_id,
      descricao: alimento.descricao,
      kcal: numero(alimento.energia_kcal),
    }));
  }

  async calcular(dados: CalcularAlimentosDto): Promise<RefeicaoCalculada> {
    const ids = [...new Set(dados.items.map((item) => item.id))];
    const encontrados = await this.repository.obterPorIds(ids);
    const porId = new Map(encontrados.map((item) => [item.taco_id, item]));
    const ausentes = ids.filter((id) => !porId.has(id));
    if (ausentes.length > 0) {
      throw new BadRequestException(`IDs TACO não encontrados: ${ausentes.join(', ')}`);
    }

    const linhas: LinhaPonderada[] = dados.items.map((item) => ({
      alimento: porId.get(item.id)!,
      grams: item.grams,
    }));
    return {
      items: linhas.map(({ alimento, grams }) => ({
        id: alimento.taco_id,
        grams,
        kcal: somarPorPeso([{ alimento, grams }], 'energia_kcal'),
      })),
      totals: {
        grams: dados.items.reduce((total, item) => total + item.grams, 0),
        macros: {
          kcal: somarPorPeso(linhas, 'energia_kcal'),
          protein: somarPorPeso(linhas, 'proteina_g'),
          carbohydrate: somarPorPeso(linhas, 'carboidratos_g'),
          lipids: somarPorPeso(linhas, 'lipidios_g'),
          fiber: somarPorPeso(linhas, 'fibras_g'),
        },
        micros: {
          calcium: somarPorPeso(linhas, 'calcio_mg'),
          iron: somarPorPeso(linhas, 'ferro_mg'),
          phosphorus: somarPorPeso(linhas, 'fosforo_mg'),
        },
      },
    };
  }
}
