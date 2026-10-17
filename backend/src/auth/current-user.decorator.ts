import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from "./authenticated-user.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user)
      throw new UnauthorizedException("Autenticação necessária.");
    return request.user;
  },
);
