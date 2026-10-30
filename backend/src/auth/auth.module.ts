import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AuthController } from "./auth.controller.js";
import { LocalAuthService } from "./local-auth.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [LocalAuthService],
  exports: [LocalAuthService],
})
export class AuthModule {}
