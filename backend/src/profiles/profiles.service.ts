import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { QueryResultRow } from "pg";
import { DatabaseService } from "../database/database.service.js";
import { Profile } from "../database/entities.js";

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
      const profile = await this.database.withManager((manager) =>
        manager.getRepository(Profile).findOneBy({ id: userId }),
      );
      if (!profile) throw new NotFoundException("Perfil não encontrado.");
      return profile;
    } catch (error) {
      this.handleDatabaseError(error, "consultar");
    }
  }

  async updateOwnProfile(userId: string, nome: string): Promise<ProfileRecord> {
    try {
      const result = await this.database.withManager((manager) =>
        manager
          .getRepository(Profile)
          .createQueryBuilder()
          .update()
          .set({ nome })
          .where("id = :id", { id: userId })
          .returning(["id", "nome", "avatar_path", "created_at", "updated_at"])
          .execute(),
      );
      if (!result.raw[0]) throw new NotFoundException("Perfil não encontrado.");
      return result.raw[0] as ProfileRecord;
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
