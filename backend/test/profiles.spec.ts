import "reflect-metadata";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, it } from "node:test";
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
function databaseWithRepository(repository: object) {
  return {
    isConfigured: () => true,
    withManager: async (operation: (manager: unknown) => unknown) =>
      operation({ getRepository: () => repository }),
  };
}
describe("Profiles API", () => {
  it("uses the authenticated UUID as the only profile lookup parameter", async () => {
    let criteria: unknown;
    const database = databaseWithRepository({
      findOneBy: async (where: unknown) => {
        criteria = where;
        return profile;
      },
    });
    assert.deepEqual(
      await new ProfilesService(database as never).getOwnProfile(userId),
      profile,
    );
    assert.deepEqual(criteria, { id: userId });
  });
  it("updates only the authenticated profile and validated name", async () => {
    let changes: unknown, predicate: unknown;
    const builder = {
      update: () => builder,
      set: (data: unknown) => {
        changes = data;
        return builder;
      },
      where: (sql: string, values: unknown) => {
        predicate = { sql, values };
        return builder;
      },
      returning: () => builder,
      execute: async () => ({ raw: [profile] }),
    };
    const service = new ProfilesService(
      databaseWithRepository({ createQueryBuilder: () => builder }) as never,
    );
    const controller = new ProfilesController(service);
    const body = plainToInstance(UpdateProfileDto, {
      nome: "  Nome atualizado  ",
    });
    assert.equal((await validate(body)).length, 0);
    await controller.updateMe({ id: userId } as AuthenticatedUser, body);
    assert.deepEqual(changes, { nome: "Nome atualizado" });
    assert.deepEqual(predicate, { sql: "id = :id", values: { id: userId } });
  });
  it("rejects blank names and additional identity fields", async () => {
    assert.ok(
      (await validate(plainToInstance(UpdateProfileDto, { nome: "   " })))
        .length > 0,
    );
    const errors = await validate(
      plainToInstance(UpdateProfileDto, { nome: "Nome", id: "another-user" }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    assert.ok(errors.some((error) => error.property === "id"));
  });
  it("returns a clear dependency error when the profile table is missing", async () => {
    const database = databaseWithRepository({
      findOneBy: async () => {
        throw Object.assign(new Error("database detail"), { code: "42P01" });
      },
    });
    await assert.rejects(
      new ProfilesService(database as never).getOwnProfile(userId),
      {
        status: 503,
        response: {
          message:
            "A estrutura de perfis ainda não está aplicada. Aplique a migration de perfis.",
          error: "Service Unavailable",
          statusCode: 503,
        },
      },
    );
  });
});
