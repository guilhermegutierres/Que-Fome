import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { QueryResultRow } from "pg";
import { DatabaseService } from "../database/database.service.js";

export interface ProfileRecord extends QueryResultRow {
  id: string;
  nome: string;
  avatar_path: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly database: DatabaseService) {}

  async getOwnProfile(userId: string): Promise<ProfileRecord> {
    try {
      const result = await this.database.query<ProfileRecord>(
        `SELECT id, nome, avatar_path, created_at, updated_at
         FROM public.profiles
         WHERE id = $1
         LIMIT 1`,
        [userId],
      );
      if (!result.rows[0])
        throw new NotFoundException("Perfil não encontrado.");
      return result.rows[0];
    } catch (error) {
      this.handleDatabaseError(error, "consultar");
    }
  }

  async updateOwnProfile(userId: string, nome: string): Promise<ProfileRecord> {
    try {
      const result = await this.database.query<ProfileRecord>(
        `UPDATE public.profiles
         SET nome = $2
         WHERE id = $1
         RETURNING id, nome, avatar_path, created_at, updated_at`,
        [userId, nome],
      );
      if (!result.rows[0])
        throw new NotFoundException("Perfil não encontrado.");
      return result.rows[0];
    } catch (error) {
      this.handleDatabaseError(error, "atualizar");
    }
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    if (error instanceof NotFoundException) throw error;

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      ["42P01", "42703"].includes(String(error.code))
    ) {
      throw new ServiceUnavailableException(
        "A estrutura de perfis ainda não está aplicada. Aplique a migration de perfis.",
      );
    }

    if (!this.database.isConfigured()) {
      throw new ServiceUnavailableException(
        "O banco de dados não está configurado para operações de perfil.",
      );
    }
    throw new InternalServerErrorException(
      `Não foi possível ${operation} o perfil.`,
    );
  }
}
