import type { AlimentoBuscaRow, AlimentoRow } from './alimentos.types.js';

// Contrato de acesso aos dados. O Service não precisa saber se a fonte é
// um arquivo local (modo desenvolvimento) ou o PostgreSQL do Supabase.
export abstract class AlimentosRepository {
  abstract buscar(busca: string): Promise<AlimentoBuscaRow[]>;
  abstract obterPorIds(ids: number[]): Promise<AlimentoRow[]>;
}

export function normalizarTermo(termo: string): string[] {
  return termo.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim().split(/\s+/).filter(Boolean);
}
