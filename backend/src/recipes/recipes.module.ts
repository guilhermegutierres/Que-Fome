import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { LocalAuthGuard } from "../auth/local-auth.guard.js";
import { DatabaseModule } from "../database/database.module.js";
import { RecipesController } from "./recipes.controller.js";
import { RecipesService } from "./recipes.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [RecipesController],
  providers: [RecipesService, LocalAuthGuard],
})
export class RecipesModule {}
