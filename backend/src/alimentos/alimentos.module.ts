import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { DatabaseService } from "../database/database.service.js";
import { AlimentosController } from "./alimentos.controller.js";
import { AlimentosRepository } from "./alimentos.repository.js";
import { AlimentosTacoRepository } from "./alimentos-taco.repository.js";
import { AlimentosPostgresRepository } from "./alimentos-postgres.repository.js";
import { AlimentosService } from "./alimentos.service.js";
import { RapidApiAlimentosService } from "./rapidapi-alimentos.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AlimentosController],
  providers: [
    AlimentosService,
    RapidApiAlimentosService,
    {
      provide: AlimentosRepository,
      inject: [DatabaseService],
      useFactory: (database: DatabaseService): AlimentosRepository => {
        const fonte = (process.env.ALIMENTOS_SOURCE || "taco").toLowerCase();
        if (fonte === "taco") return new AlimentosTacoRepository();
        if (fonte === "postgres")
          return new AlimentosPostgresRepository(database);
        throw new Error('ALIMENTOS_SOURCE deve ser "taco" ou "postgres".');
      },
    },
  ],
})
export class AlimentosModule {}
