import { Module } from "@nestjs/common";
import { AlimentosModule } from "./alimentos/alimentos.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ProfilesModule } from "./profiles/profiles.module.js";
import { RecipesModule } from "./recipes/recipes.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { UploadsModule } from "./uploads/uploads.module.js";

@Module({
  imports: [DatabaseModule, AuthModule, AlimentosModule, ProfilesModule, RecipesModule, UploadsModule],
})
export class AppModule {}
