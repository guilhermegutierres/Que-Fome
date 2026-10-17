import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { SupabaseAuthService } from "../src/auth/supabase-auth.service.js";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnvironment("SUPABASE_URL", originalUrl);
  restoreEnvironment("SUPABASE_PUBLISHABLE_KEY", originalKey);
});

describe("SupabaseAuthService", () => {
  it("validates the token through the Supabase Auth user endpoint", async () => {
    process.env.SUPABASE_URL = "https://supabase.example.test/";
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    globalThis.fetch = (async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return Response.json({
        id: "d9428888-122b-4fc5-8d2f-47f50f1c1f78",
        email: "user@example.test",
      });
    }) as typeof fetch;

    const result = await new SupabaseAuthService().validateAccessToken("token");

    assert.equal(requestedUrl, "https://supabase.example.test/auth/v1/user");
    assert.equal(requestedInit?.method, "GET");
    const headers = new Headers(requestedInit?.headers);
    assert.equal(headers.get("apikey"), "test-publishable-key");
    assert.equal(headers.get("authorization"), "Bearer token");
    assert.equal(result?.id, "d9428888-122b-4fc5-8d2f-47f50f1c1f78");
  });

  it("treats every 4xx response except 429 as an authentication failure", async () => {
    process.env.SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

    for (const status of [400, 401, 403, 422, 499]) {
      globalThis.fetch = (async () =>
        new Response(null, { status })) as typeof fetch;

      const result = await new SupabaseAuthService().validateAccessToken(
        "invalid-or-expired-token",
      );
      assert.equal(result, null, `status ${status} must be unauthenticated`);
    }
  });

  it("treats HTTP 429 and upstream errors as generic service unavailability", async () => {
    process.env.SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

    for (const status of [429, 500, 503]) {
      globalThis.fetch = (async () =>
        new Response(null, { status })) as typeof fetch;

      await assert.rejects(
        new SupabaseAuthService().validateAccessToken("sensitive-token"),
        (error: unknown) => {
          assert.ok(error instanceof ServiceUnavailableException);
          assert.equal(error.getStatus(), 503);
          assert.doesNotMatch(
            error.message,
            /sensitive-token|test-publishable-key/,
          );
          return true;
        },
      );
    }
  });

  it("hides details from unexpected network errors", async () => {
    process.env.SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    globalThis.fetch = (async () => {
      throw new Error("network detail includes sensitive-token");
    }) as typeof fetch;

    await assert.rejects(
      new SupabaseAuthService().validateAccessToken("sensitive-token"),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);
        assert.equal(error.getStatus(), 503);
        assert.doesNotMatch(error.message, /sensitive-token|network detail/);
        return true;
      },
    );
  });

  it("fails clearly when server authentication settings are absent", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;

    await assert.rejects(
      new SupabaseAuthService().validateAccessToken("token"),
      ServiceUnavailableException,
    );
  });
});

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
