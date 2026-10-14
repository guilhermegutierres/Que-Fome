import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import {
  AlimentosRepository,
  normalizarTermo,
} from "./alimentos.repository.js";
import type { AlimentoBuscaRow, AlimentoRow } from "./alimentos.types.js";

// A extensão unaccent não é obrigatória no Supabase. Usamos translate para
// normalizar acentos comuns tanto nos registros como no termo buscado.
const DESCRICAO_NORMALIZADA = `translate(lower(descricao),
  'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;

function escaparLike(palavra: string): string {
  return palavra.replace(/[\\%_]/g, "\\$&");
}

@Injectable()
export class AlimentosPostgresRepository extends AlimentosRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async buscar(busca: string): Promise<AlimentoBuscaRow[]> {
    const palavras = normalizarTermo(busca);
    if (palavras.length === 0) return [];
    const parametros = palavras.map((palavra) => `%${escaparLike(palavra)}%`);
    const filtros = parametros
      .map((_, i) => `${DESCRICAO_NORMALIZADA} LIKE $${i + 1} ESCAPE '\\'`)
      .join(" AND ");

    const sql = `
      SELECT taco_id, descricao, energia_kcal
      FROM public.alimentos
      WHERE ${filtros}
      ORDER BY CASE WHEN ${DESCRICAO_NORMALIZADA} LIKE $${parametros.length + 1} ESCAPE '\\'
        THEN 0 ELSE 1 END, descricao ASC
      LIMIT 8
    `;
    const { rows } = await this.database.query<AlimentoBuscaRow>(sql, [
      ...parametros,
      `${escaparLike(palavras[0])}%`,
    ]);
    return rows;
  }

  async obterPorIds(ids: number[]): Promise<AlimentoRow[]> {
    const { rows } = await this.database.query<AlimentoRow>(
      `
      SELECT taco_id, descricao, energia_kcal, proteina_g, carboidratos_g,
        lipidios_g, fibras_g, calcio_mg, ferro_mg, fosforo_mg
      FROM public.alimentos WHERE taco_id = ANY($1::integer[])
    `,
      [ids],
    );
    return rows;
  }
}
