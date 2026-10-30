import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { LocalAuthGuard } from "../auth/local-auth.guard.js";
import { UploadsController } from "./uploads.controller.js";

@Module({ imports: [AuthModule], controllers: [UploadsController], providers: [LocalAuthGuard] })
export class UploadsModule {}
