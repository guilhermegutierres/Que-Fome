import "reflect-metadata";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, it } from "node:test";
import type { QueryResult } from "pg";
import type { AuthenticatedUser } from "../src/auth/authenticated-user.js";
import { ProfilesController } from "../src/profiles/profiles.controller.js";
import { UpdateProfileDto } from "../src/profiles/dto/update-profile.dto.js";
import type { ProfileRecord } from "../src/profiles/profiles.service.js";
import { ProfilesService } from "../src/profiles/profiles.service.js";

const userId = "d9428888-122b-4fc5-8d2f-47f50f1c1f78";
const profile: ProfileRecord = {
  id: userId,
  nome: "Nome de teste",
  avatar_path: null,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-01-01T00:00:00.000Z"),
};

describe("Profiles API", () => {
  it("uses the authenticated UUID as the only profile lookup parameter", async () => {
    let queryText = "";
    let parameters: unknown[] = [];
    const database = {
      isConfigured: () => true,
      query: async (sql: string, params: unknown[]) => {
        queryText = sql;
        parameters = params;
        return { rows: [profile] } as QueryResult<ProfileRecord>;
      },
    };
    const service = new ProfilesService(database as never);

    assert.deepEqual(await service.getOwnProfile(userId), profile);
    assert.match(queryText, /WHERE id = \$1/);
    assert.deepEqual(parameters, [userId]);
  });

  it("updates only the authenticated profile and validated name", async () => {
    let queryText = "";
    let parameters: unknown[] = [];
    const database = {
      isConfigured: () => true,
      query: async (sql: string, params: unknown[]) => {
        queryText = sql;
        parameters = params;
        return { rows: [profile] } as QueryResult<ProfileRecord>;
      },
    };
    const service = new ProfilesService(database as never);
    const controller = new ProfilesController(service);
    const authenticatedUser: AuthenticatedUser = { id: userId };
    const body = plainToInstance(UpdateProfileDto, {
      nome: "  Nome atualizado  ",
    });
    const errors = await validate(body);
    assert.equal(errors.length, 0);

    await controller.updateMe(authenticatedUser, body);
    assert.match(queryText, /WHERE id = \$1/);
    assert.deepEqual(parameters, [userId, "Nome atualizado"]);
  });

  it("rejects blank names and additional identity fields", async () => {
    const blankName = plainToInstance(UpdateProfileDto, { nome: "   " });
    assert.ok((await validate(blankName)).length > 0);

    const withClientId = plainToInstance(UpdateProfileDto, {
      nome: "Nome",
      id: "another-user",
    });
    const errors = await validate(withClientId, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    assert.ok(errors.some((error) => error.property === "id"));
  });

  it("returns a clear dependency error when the profile table is missing", async () => {
    const database = {
      isConfigured: () => true,
      query: async () => {
        throw Object.assign(new Error("database detail"), { code: "42P01" });
      },
    };
    const service = new ProfilesService(database as never);

    await assert.rejects(service.getOwnProfile(userId), {
      status: 503,
      response: expectProfileMigrationMessage(),
    });
  });
});

function expectProfileMigrationMessage(): Record<string, unknown> {
  return {
    message:
      "A estrutura de perfis ainda não está aplicada. Aplique a migration de perfis.",
    error: "Service Unavailable",
    statusCode: 503,
  };
}
