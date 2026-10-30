import "reflect-metadata";
import { DataSource } from "typeorm";
import { DATABASE_ENTITIES } from "./entities.js";

export function createDatabaseSource(url: string): DataSource {
  return new DataSource({
    type: "postgres",
    url,
    entities: DATABASE_ENTITIES,
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    installExtensions: false,
    logging: false,
    extra: { max: 10, connectionTimeoutMillis: 5000 },
  });
}
