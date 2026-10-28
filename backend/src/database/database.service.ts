import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import type { DataSource, EntityManager, QueryRunner } from "typeorm";
import { createDatabaseSource } from "./data-source.js";

export interface DatabaseResult<T> {
  rows: T[];
  rowCount: number | null;
}
export interface DatabaseTransaction {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<DatabaseResult<T>>;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly dataSource: DataSource | null;

  constructor() {
    const url = process.env.DATABASE_URL;
    this.dataSource = url ? createDatabaseSource(url) : null;
  }

  isConfigured(): boolean {
    return this.dataSource !== null;
  }

  async onModuleInit(): Promise<void> {
    if (this.dataSource && !this.dataSource.isInitialized)
      await this.dataSource.initialize();
  }

  private runner(): QueryRunner {
    if (!this.dataSource?.isInitialized)
      throw new Error(
        "PostgreSQL indisponível. Configure DATABASE_URL e inicialize o backend.",
      );
    return this.dataSource.createQueryRunner();
  }

  private async execute<T>(
    runner: QueryRunner,
    sql: string,
    params: unknown[] = [],
  ): Promise<DatabaseResult<T>> {
    const result = await runner.query(sql, params, true);
    return { rows: result.records as T[], rowCount: result.affected ?? null };
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<DatabaseResult<T>> {
    const runner = this.runner();
    try {
      return await this.execute<T>(runner, sql, params);
    } finally {
      await runner.release();
    }
  }

  async withManager<T>(
    operation: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const runner = this.runner();
    try {
      return await operation(runner.manager);
    } finally {
      await runner.release();
    }
  }

  async transaction<T>(
    operation: (client: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    const runner = this.runner();
    try {
      await runner.connect();
      await runner.startTransaction();
      const result = await operation({
        query: (sql, params) => this.execute(runner, sql, params),
      });
      await runner.commitTransaction();
      return result;
    } catch (error) {
      if (runner.isTransactionActive)
        await runner.rollbackTransaction().catch(() => undefined);
      throw error;
    } finally {
      await runner.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dataSource?.isInitialized) await this.dataSource.destroy();
  }
}
