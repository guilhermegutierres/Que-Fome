import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedRequest } from "./authenticated-user.js";
import { LocalAuthService } from "./local-auth.service.js";

@Injectable()
export class LocalAuthGuard implements CanActivate {
  constructor(private readonly auth: LocalAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.auth.userByCookie(request.headers.cookie);
    if (!user) throw new UnauthorizedException("Entre na sua conta para continuar.");
    request.user = user;
    return true;
  }
}
