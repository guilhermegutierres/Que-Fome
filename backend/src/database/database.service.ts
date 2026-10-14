import { Injectable, OnModuleDestroy } from "@nestjs/common";
import pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

const { Pool } = pg;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: pg.Pool | null;

  constructor() {
    // Sem banco, a API pode rodar diretamente do TACO.json para desenvolvimento.
    if ((process.env.ALIMENTOS_SOURCE || "taco").toLowerCase() !== "postgres") {
      this.pool = null;
      return;
    }
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "Para ALIMENTOS_SOURCE=postgres, configure DATABASE_URL em backend/.env.",
      );
    }
    this.pool = new Pool({ connectionString, max: 10 });
  }

  query<T extends QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (!this.pool)
      throw new Error(
        "Consulta ao PostgreSQL indisponível no modo TACO local.",
      );
    return this.pool.query<T>(sql, params);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) await this.pool.end();
  }
}
