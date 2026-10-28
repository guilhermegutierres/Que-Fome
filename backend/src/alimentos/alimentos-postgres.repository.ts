import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { In } from "typeorm";
import { Food } from "../database/entities.js";
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
    if (!ids.length) return [];
    return this.database.withManager((manager) =>
      manager.getRepository(Food).find({
        select: {
          taco_id: true,
          descricao: true,
          energia_kcal: true,
          proteina_g: true,
          carboidratos_g: true,
          lipidios_g: true,
          fibras_g: true,
          calcio_mg: true,
          ferro_mg: true,
          fosforo_mg: true,
        },
        where: { taco_id: In(ids) },
      }),
    );
  }
}
