import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { LocalAuthService } from "./local-auth.service.js";
import { LoginDto, RegisterDto } from "./dto.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: LocalAuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(dto.email, dto.senha);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Set-Cookie", [
      this.auth.clearLegacySessionCookie(),
      this.auth.sessionCookie(session.token),
    ]);
    return { usuario: session.usuario };
  }

  @Post("register")
  @HttpCode(201)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.register(dto.nome, dto.email, dto.senha);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Set-Cookie", [
      this.auth.clearLegacySessionCookie(),
      this.auth.sessionCookie(session.token),
    ]);
    return { usuario: session.usuario };
  }

  @Get("me")
  async me(
    @Headers("cookie") cookie: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Cache-Control", "no-store");
    return { usuario: await this.auth.userByCookie(cookie) };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @Headers("cookie") cookie: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(cookie);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Set-Cookie", [
      this.auth.clearLegacySessionCookie(),
      this.auth.clearSessionCookie(),
    ]);
  }
}
