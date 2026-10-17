import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import { CreateRecipeDto } from "./dto/create-recipe.dto.js";
import { ListRecipesQueryDto } from "./dto/list-recipes-query.dto.js";
import { UpdateRecipeDto } from "./dto/update-recipe.dto.js";
import { RecipesService } from "./recipes.service.js";

@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  list(@Query() query: ListRecipesQueryDto) {
    return this.recipes.listPublished(query);
  }

  @Get("mine")
  @UseGuards(SupabaseAuthGuard)
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRecipesQueryDto,
  ) {
    return this.recipes.listMine(user.id, query);
  }

  @Get(":id")
  getById(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.recipes.getById(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRecipeDto,
  ) {
    return this.recipes.create(user.id, body);
  }

  @Patch(":id")
  @UseGuards(SupabaseAuthGuard)
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateRecipeDto,
  ) {
    return this.recipes.update(id, user.id, body);
  }

  @Delete(":id")
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.recipes.delete(id, user.id);
  }
}
