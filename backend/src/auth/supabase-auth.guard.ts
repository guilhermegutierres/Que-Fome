import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "./authenticated-user.js";
import { SupabaseAuthService } from "./supabase-auth.service.js";

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseAuth: SupabaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) throw new UnauthorizedException("Autenticação necessária.");

    const user = await this.supabaseAuth.validateAccessToken(match[1]);
    if (!user) throw new UnauthorizedException("Sessão inválida ou expirada.");

    request.user = user;
    return true;
  }
}
