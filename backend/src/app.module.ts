import { Module } from "@nestjs/common";
import { AlimentosModule } from "./alimentos/alimentos.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ProfilesModule } from "./profiles/profiles.module.js";
import { RecipesModule } from "./recipes/recipes.module.js";

@Module({
  imports: [DatabaseModule, AlimentosModule, ProfilesModule, RecipesModule],
})
export class AppModule {}
