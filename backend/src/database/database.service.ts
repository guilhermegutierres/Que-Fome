import { Injectable, OnModuleDestroy } from "@nestjs/common";
import pg from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

const { Pool } = pg;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: pg.Pool | null;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    this.pool = connectionString
      ? new Pool({ connectionString, max: 10 })
      : null;
  }

  isConfigured(): boolean {
    return this.pool !== null;
  }

  query<T extends QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (!this.pool)
      throw new Error("PostgreSQL indisponível. Configure DATABASE_URL.");
    return this.pool.query<T>(sql, params);
  }

  async transaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    if (!this.pool)
      throw new Error("PostgreSQL indisponível. Configure DATABASE_URL.");

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) await this.pool.end();
  }
}
