import { readFileSync } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { AlimentosRepository, normalizarTermo } from './alimentos.repository.js';
import type { AlimentoBuscaRow, AlimentoRow } from './alimentos.types.js';

interface TacoRegistro {
  id: number;
  description: string;
  energy_kcal?: unknown;
  protein_g?: unknown;
  carbohydrate_g?: unknown;
  lipid_g?: unknown;
  fiber_g?: unknown;
  calcium_mg?: unknown;
  iron_mg?: unknown;
  phosphorus_mg?: unknown;
}

function numeroOuNull(dado: unknown): number | null {
  if (typeof dado === 'number') return Number.isFinite(dado) ? dado : null;
  if (typeof dado !== 'string' || !dado.trim()) return null;
  const numero = Number(dado);
  return Number.isFinite(numero) ? numero : null; // "NA", "Tr" e vazios -> null.
}

function converter(registro: TacoRegistro): AlimentoRow {
  return {
    taco_id: registro.id,
    descricao: registro.description,
    energia_kcal: numeroOuNull(registro.energy_kcal),
    proteina_g: numeroOuNull(registro.protein_g),
    carboidratos_g: numeroOuNull(registro.carbohydrate_g),
    lipidios_g: numeroOuNull(registro.lipid_g),
    fibras_g: numeroOuNull(registro.fiber_g),
    calcio_mg: numeroOuNull(registro.calcium_mg),
    ferro_mg: numeroOuNull(registro.iron_mg),
    fosforo_mg: numeroOuNull(registro.phosphorus_mg),
  };
}

@Injectable()
export class AlimentosTacoRepository extends AlimentosRepository {
  private readonly alimentos: AlimentoRow[];
  private readonly porId: Map<number, AlimentoRow>;

  constructor() {
    super();
    // A mesma URL funciona em src/alimentos e no build dist/alimentos.
    const caminho = new URL('../../data/taco/TACO.json', import.meta.url);
    const conteudo = readFileSync(caminho, 'utf8');
    const registros = JSON.parse(conteudo) as TacoRegistro[];
    this.alimentos = registros.map(converter);
    this.porId = new Map(this.alimentos.map((alimento) => [alimento.taco_id, alimento]));
  }

  async buscar(busca: string): Promise<AlimentoBuscaRow[]> {
    const palavras = normalizarTermo(busca);
    if (palavras.length === 0) return [];

    return this.alimentos
      .filter((alimento) => {
        const descricao = normalizarTermo(alimento.descricao).join(' ');
        return palavras.every((palavra) => descricao.includes(palavra));
      })
      .sort((a, b) => {
        const aComeca = normalizarTermo(a.descricao).join(' ').startsWith(palavras[0]);
        const bComeca = normalizarTermo(b.descricao).join(' ').startsWith(palavras[0]);
        return Number(bComeca) - Number(aComeca) || a.descricao.localeCompare(b.descricao, 'pt-BR');
      })
      .slice(0, 8)
      .map(({ taco_id, descricao, energia_kcal }) => ({ taco_id, descricao, energia_kcal }));
  }

  async obterPorIds(ids: number[]): Promise<AlimentoRow[]> {
    return ids.map((id) => this.porId.get(id)).filter((dado): dado is AlimentoRow => dado !== undefined);
  }
}
