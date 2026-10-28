import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { LocalAuthGuard } from "../auth/local-auth.guard.js";

function uploadDirectory(): string {
  return resolve(
    process.env.UPLOAD_DIR ||
      resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "uploads"),
    "receitas",
  );
}
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const nameRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

function imagemTipo(buffer: Buffer): "jpg" | "png" | "webp" | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "jpg";
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}

@Controller("uploads")
export class UploadsController {
  @Post("receitas")
  @UseGuards(LocalAuthGuard)
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file?.buffer || file.size < 1)
      throw new BadRequestException("Selecione uma imagem.");
    const ext = imagemTipo(file.buffer);
    const mime = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    } as const;
    if (!ext || file.mimetype !== mime[ext])
      throw new BadRequestException("Imagem inválida. Use JPG, PNG ou WEBP.");
    const nome = `${randomUUID()}.${ext}`;
    const destino = join(uploadDirectory(), user.id);
    await mkdir(destino, { recursive: true });
    await writeFile(join(destino, nome), file.buffer, { flag: "wx" });
    return { imagemPath: `/uploads/receitas/${user.id}/${nome}` };
  }

  @Get("receitas/:userId/:filename")
  async servir(
    @Param("userId") userId: string,
    @Param("filename") filename: string,
    @Res() res: Response,
  ) {
    if (!uuidRegex.test(userId) || !nameRegex.test(filename))
      throw new NotFoundException();
    const caminho = join(uploadDirectory(), userId, filename);
    if (!existsSync(caminho)) throw new NotFoundException();
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(caminho);
  }
}
