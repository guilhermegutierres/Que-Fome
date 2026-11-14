import {
  Body, Controller, Delete, Get, Header, HttpCode, Module, Param,
  ParseUUIDPipe, Patch, Post, Query, Req, Res, UseGuards,
} from "@nestjs/common";
import { IsString, Length } from "class-validator";
import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { CreateRecipeDto } from "../recipes/dto/create-recipe.dto.js";
import { ListRecipesQueryDto } from "../recipes/dto/list-recipes-query.dto.js";
import { UpdateRecipeDto } from "../recipes/dto/update-recipe.dto.js";
import { DatabaseModule } from "../database/database.module.js";
import { RecipesService } from "../recipes/recipes.service.js";
import { AdminAuth, AdminGuard } from "./admin-auth.js";

class AdminLoginDto {
  @IsString()
  @Length(1, 100)
  username!: string;

  @IsString()
  @Length(1, 256)
  password!: string;
}

@Controller()
class AdminPage {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  page() {
    return readFile(new URL("../../admin/index.html", import.meta.url), "utf8");
  }

  @Get("panel.js")
  @Header("Content-Type", "text/javascript; charset=utf-8")
  script() {
    return readFile(new URL("../../admin/panel.js", import.meta.url), "utf8");
  }

  @Get("panel.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  style() {
    return readFile(new URL("../../admin/panel.css", import.meta.url), "utf8");
  }
}

@Controller("admin-api")
class AdminSession {
  constructor(private readonly auth: AdminAuth) {}

  @Post("login")
  @HttpCode(200)
  login(@Body() body: AdminLoginDto, @Res({ passthrough: true }) response: Response) {
    return this.auth.login(body.username, body.password, response);
  }

  @Get("session")
  @UseGuards(AdminGuard)
  session() {
    return { authenticated: true };
  }

  @Post("logout")
  @UseGuards(AdminGuard)
  @HttpCode(204)
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.auth.logout(request, response);
  }
}

@Controller("admin-api/receitas")
@UseGuards(AdminGuard)
class AdminRecipes {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  list(@Query() query: ListRecipesQueryDto) {
    return this.recipes.listPublished(query);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.recipes.getById(id);
  }

  @Post()
  create(@Body() body: CreateRecipeDto) {
    return this.recipes.create(null, body);
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() body: UpdateRecipeDto) {
    return this.recipes.update(id, null, body);
  }

  @Delete(":id")
  @HttpCode(204)
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.recipes.delete(id, null);
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [AdminPage, AdminSession, AdminRecipes],
  providers: [AdminAuth, RecipesService],
})
export class AdminModule {}
