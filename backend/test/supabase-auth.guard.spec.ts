import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "../src/auth/authenticated-user.js";
import { SupabaseAuthGuard } from "../src/auth/supabase-auth.guard.js";
import { SupabaseAuthService } from "../src/auth/supabase-auth.service.js";

const validUser = {
  id: "d9428888-122b-4fc5-8d2f-47f50f1c1f78",
  email: "user@example.test",
};

function executionContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe("SupabaseAuthGuard", () => {
  it("rejects a request without a bearer token", async () => {
    const service = {
      validateAccessToken: async () => validUser,
    } as unknown as SupabaseAuthService;
    const guard = new SupabaseAuthGuard(service);

    await assert.rejects(
      guard.canActivate(executionContext({ headers: {} })),
      (error: unknown) =>
        error instanceof UnauthorizedException && error.getStatus() === 401,
    );
  });

  it("rejects a token that Supabase does not validate", async () => {
    const service = {
      validateAccessToken: async () => null,
    } as unknown as SupabaseAuthService;
    const guard = new SupabaseAuthGuard(service);

    await assert.rejects(
      guard.canActivate(
        executionContext({ headers: { authorization: "Bearer invalid" } }),
      ),
      (error: unknown) =>
        error instanceof UnauthorizedException && error.getStatus() === 401,
    );
  });

  it("attaches only the identity returned by Supabase", async () => {
    let receivedToken = "";
    const service = {
      validateAccessToken: async (token: string) => {
        receivedToken = token;
        return validUser;
      },
    } as unknown as SupabaseAuthService;
    const guard = new SupabaseAuthGuard(service);
    const request: AuthenticatedRequest = {
      headers: { authorization: "Bearer access-token" },
    };

    assert.equal(await guard.canActivate(executionContext(request)), true);
    assert.equal(receivedToken, "access-token");
    assert.equal(request.user?.id, validUser.id);
  });
});
