import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { QueryResultRow } from "pg";
import type { DatabaseTransaction } from "../database/database.service.js";
import { DatabaseService } from "../database/database.service.js";
import { Recipe } from "../database/entities.js";
import type { CreateRecipeDto } from "./dto/create-recipe.dto.js";
import type { ListRecipesQueryDto } from "./dto/list-recipes-query.dto.js";
import type { RecipeIngredientDto } from "./dto/recipe-ingredient.dto.js";
import type { UpdateRecipeDto } from "./dto/update-recipe.dto.js";

interface RecipeRow extends QueryResultRow {
  id: string;
  tipo: "oficial" | "usuario";
  autor_id: string | null;
  autor_nome: string | null;
  titulo: string;
  categoria: string;
  descricao: string;
  descricao_completa: string;
  tempo_minutos: number;
  porcoes: number | null;
  dificuldade: string;
  custo: string | null;
  imagem_path: string | null;
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
  ingredientes_detalhados: unknown;
  modo_preparo: unknown;
}

interface CountRow extends QueryResultRow {
  total: string | number;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface IngredientRecord {
  nome: string;
  quantidade: string;
  tacoId: number | null;
  tacoDescricao: string | null;
  gramas: number | string | null;
  textoExibicao: string | null;
  gramasEstimadas: boolean;
}

export interface RecipeResponse {
  id: string;
  tipo: "oficial" | "usuario";
  autorId: string | null;
  autorNome: string | null;
  titulo: string;
  categoria: string;
  descricao: string;
  descricaoCompleta: string;
  tempo: string;
  tempoMinutos: number;
  porcoes: number | null;
  dificuldade: string;
  custo: string | null;
  imagem: string | null;
  imagemPath: string | null;
  tags: string[];
  ingredientes: string[];
  ingredientesDetalhados: IngredientRecord[];
  modoPreparo: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipePage {
  items: RecipeResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const recipeSelect = `
  SELECT
    r.id,
    r.tipo,
    r.autor_id,
    p.nome AS autor_nome,
    r.titulo,
    r.categoria,
    r.descricao,
    r.descricao_completa,
    r.tempo_minutos,
    r.porcoes,
    r.dificuldade,
    r.custo,
    r.imagem_path,
    r.tags,
    r.created_at,
    r.updated_at,
    COALESCE((
      SELECT json_agg(
        json_build_object(
          'nome', ri.nome,
          'quantidade', ri.quantidade,
          'tacoId', ri.taco_id,
          'tacoDescricao', a.descricao,
          'gramas', ri.gramas,
          'textoExibicao', ri.texto_exibicao,
          'gramasEstimadas', ri.gramas_estimadas
        ) ORDER BY ri.ordem
      )
      FROM public.receita_ingredientes AS ri
      LEFT JOIN public.alimentos AS a ON a.taco_id = ri.taco_id
      WHERE ri.receita_id = r.id
    ), '[]'::json) AS ingredientes_detalhados,
    COALESCE((
      SELECT json_agg(re.instrucao ORDER BY re.ordem)
      FROM public.receita_etapas AS re
      WHERE re.receita_id = r.id
    ), '[]'::json) AS modo_preparo
  FROM public.receitas AS r
  LEFT JOIN public.profiles AS p ON p.id = r.autor_id`;

@Injectable()
export class RecipesService {
  constructor(private readonly database: DatabaseService) {}

  async listPublished(query: ListRecipesQueryDto): Promise<RecipePage> {
    return this.list(query, null);
  }

  async listMine(
    authorId: string,
    query: ListRecipesQueryDto,
  ): Promise<RecipePage> {
    return this.list(query, authorId);
  }

  async getById(id: string): Promise<RecipeResponse> {
    try {
      const entity = await this.database.withManager((manager) =>
        manager.getRepository(Recipe).findOne({
          where: { id },
          relations: {
            autor: true,
            ingredientes: { alimento: true },
            etapas: true,
          },
          order: { ingredientes: { ordem: "ASC" }, etapas: { ordem: "ASC" } },
        }),
      );
      if (!entity) throw new NotFoundException("Receita não encontrada.");
      return this.toResponse({
        ...entity,
        autor_nome: entity.autor?.nome ?? null,
        ingredientes_detalhados: (entity.ingredientes ?? []).map(
          (ingredient) => ({
            nome: ingredient.nome,
            quantidade: ingredient.quantidade,
            tacoId: ingredient.taco_id,
            tacoDescricao: ingredient.alimento?.descricao ?? null,
            gramas: ingredient.gramas,
            textoExibicao: ingredient.texto_exibicao,
            gramasEstimadas: ingredient.gramas_estimadas,
          }),
        ),
        modo_preparo: (entity.etapas ?? []).map((step) => step.instrucao),
      });
    } catch (error) {
      this.handleDatabaseError(error, "consultar receitas");
    }
  }

  async create(
    authorId: string,
    dto: CreateRecipeDto,
  ): Promise<RecipeResponse> {
    this.validateImageOwner(dto.imagemPath, authorId);
    try {
      const created = await this.database.transaction(async (client) => {
        const inserted = await client.query<IdRow>(
          `INSERT INTO public.receitas (
             tipo, autor_id, titulo, categoria, descricao,
             descricao_completa, tempo_minutos, porcoes, dificuldade, custo, imagem_path, tags
           ) VALUES (
             'usuario', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
           )
           RETURNING id`,
          [
            authorId,
            dto.titulo,
            dto.categoria,
            dto.descricao ?? "",
            dto.descricaoCompleta ?? "",
            dto.tempo,
            dto.porcoes ?? null,
            dto.dificuldade,
            dto.custo ?? null,
            dto.imagemPath ?? null,
            dto.tags ?? [],
          ],
        );
        const id = inserted.rows[0].id;
        await this.insertIngredients(client, id, dto.ingredientesDetalhados);
        await this.insertSteps(client, id, dto.modoPreparo);
        const result = await client.query<RecipeRow>(
          `${recipeSelect}\nWHERE r.id = $1\nLIMIT 1`,
          [id],
        );
        if (!result.rows[0]) throw new Error("Created recipe row unavailable.");
        return result.rows[0];
      });

      return this.toResponse(created);
    } catch (error) {
      this.handleDatabaseError(error, "criar a receita");
    }
  }

  async update(
    id: string,
    authorId: string,
    dto: UpdateRecipeDto,
  ): Promise<RecipeResponse> {
    this.validateImageOwner(dto.imagemPath, authorId);
    if (
      dto.ingredientes !== undefined &&
      dto.ingredientesDetalhados === undefined
    ) {
      throw new BadRequestException(
        "Envie ingredientesDetalhados para atualizar os ingredientes.",
      );
    }

    const hasUpdate =
      dto.titulo !== undefined ||
      dto.categoria !== undefined ||
      dto.descricao !== undefined ||
      dto.descricaoCompleta !== undefined ||
      dto.tempo !== undefined ||
      dto.porcoes !== undefined ||
      dto.dificuldade !== undefined ||
      dto.custo !== undefined ||
      dto.imagemPath !== undefined ||
      dto.ingredientesDetalhados !== undefined ||
      dto.modoPreparo !== undefined;
    const includesTags = dto.tags !== undefined;
    const hasAnyUpdate = hasUpdate || includesTags;
    if (!hasAnyUpdate)
      throw new BadRequestException("Nenhuma alteração enviada.");

    try {
      const updatedRecipe = await this.database.transaction(async (client) => {
        const values: unknown[] = [id, authorId];
        const assignments: string[] = [];
        const addAssignment = (column: string, value: unknown): void => {
          values.push(value);
          assignments.push(`${column} = $${values.length}`);
        };

        if (dto.titulo !== undefined) addAssignment("titulo", dto.titulo);
        if (dto.categoria !== undefined)
          addAssignment("categoria", dto.categoria);
        if (dto.descricao !== undefined)
          addAssignment("descricao", dto.descricao);
        if (dto.descricaoCompleta !== undefined)
          addAssignment("descricao_completa", dto.descricaoCompleta);
        if (dto.tempo !== undefined) addAssignment("tempo_minutos", dto.tempo);
        if (dto.porcoes !== undefined) addAssignment("porcoes", dto.porcoes);
        if (dto.dificuldade !== undefined)
          addAssignment("dificuldade", dto.dificuldade);
        if (dto.custo !== undefined) addAssignment("custo", dto.custo ?? null);
        if (dto.imagemPath !== undefined)
          addAssignment("imagem_path", dto.imagemPath ?? null);
        if (dto.tags !== undefined) addAssignment("tags", dto.tags);
        assignments.push("updated_at = pg_catalog.now()");

        const updated = await client.query<IdRow>(
          `UPDATE public.receitas
           SET ${assignments.join(", ")}
           WHERE id = $1 AND tipo = 'usuario' AND autor_id = $2
           RETURNING id`,
          values,
        );
        if (!updated.rows[0])
          throw new NotFoundException("Receita não encontrada.");

        if (dto.ingredientesDetalhados !== undefined) {
          await client.query(
            "DELETE FROM public.receita_ingredientes WHERE receita_id = $1",
            [id],
          );
          await this.insertIngredients(client, id, dto.ingredientesDetalhados);
        }

        if (dto.modoPreparo !== undefined) {
          await client.query(
            "DELETE FROM public.receita_etapas WHERE receita_id = $1",
            [id],
          );
          await this.insertSteps(client, id, dto.modoPreparo);
        }

        const result = await client.query<RecipeRow>(
          `${recipeSelect}\nWHERE r.id = $1\nLIMIT 1`,
          [id],
        );
        if (!result.rows[0]) throw new Error("Updated recipe row unavailable.");
        return result.rows[0];
      });

      return this.toResponse(updatedRecipe);
    } catch (error) {
      this.handleDatabaseError(error, "atualizar a receita");
    }
  }

  async delete(id: string, authorId: string): Promise<void> {
    try {
      await this.database.transaction(async (client) => {
        const result = await client.query<IdRow>(
          `DELETE FROM public.receitas
           WHERE id = $1 AND tipo = 'usuario' AND autor_id = $2
           RETURNING id`,
          [id, authorId],
        );
        if (!result.rows[0])
          throw new NotFoundException("Receita não encontrada.");
      });
    } catch (error) {
      this.handleDatabaseError(error, "excluir a receita");
    }
  }

  private validateImageOwner(
    path: string | null | undefined,
    authorId: string,
  ): void {
    if (!path?.startsWith("/uploads/")) return;
    const prefix = `/uploads/receitas/${authorId}/`;
    const filename = path.slice(prefix.length);
    if (
      !path.startsWith(prefix) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(
        filename,
      )
    ) {
      throw new BadRequestException("Use uma imagem enviada pela sua conta.");
    }
  }

  private async list(
    query: ListRecipesQueryDto,
    authorId: string | null,
  ): Promise<RecipePage> {
    const page = query.page;
    const limit = query.limit;
    const offset = (page - 1) * limit;
    const where = authorId
      ? "WHERE r.tipo = 'usuario' AND r.autor_id = $1"
      : "";
    const countValues = authorId ? [authorId] : [];
    const pageValues = authorId ? [authorId, limit, offset] : [limit, offset];
    const limitPlaceholder = authorId ? "$2" : "$1";
    const offsetPlaceholder = authorId ? "$3" : "$2";

    try {
      const [count, result] = await Promise.all([
        this.database.query<CountRow>(
          `SELECT COUNT(*) AS total FROM public.receitas AS r ${where}`,
          countValues,
        ),
        this.database.query<RecipeRow>(
          `${recipeSelect}\n${where}
           ORDER BY r.created_at DESC, r.id DESC
           LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
          pageValues,
        ),
      ]);
      const total = Number(count.rows[0]?.total ?? 0);
      return {
        items: result.rows.map((row) => this.toResponse(row)),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handleDatabaseError(error, "listar receitas");
    }
  }

  private async insertIngredients(
    client: DatabaseTransaction,
    recipeId: string,
    ingredients: RecipeIngredientDto[],
  ): Promise<void> {
    for (const [index, ingredient] of ingredients.entries()) {
      await client.query(
        `INSERT INTO public.receita_ingredientes (
           receita_id, ordem, nome, quantidade, taco_id, gramas,
           texto_exibicao, gramas_estimadas
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          recipeId,
          index + 1,
          ingredient.nome,
          ingredient.quantidade,
          ingredient.tacoId ?? null,
          ingredient.gramas ?? null,
          ingredient.textoExibicao ?? null,
          ingredient.gramasEstimadas ?? false,
        ],
      );
    }
  }

  private async insertSteps(
    client: DatabaseTransaction,
    recipeId: string,
    steps: string[],
  ): Promise<void> {
    for (const [index, instruction] of steps.entries()) {
      await client.query(
        `INSERT INTO public.receita_etapas (receita_id, ordem, instrucao)
         VALUES ($1, $2, $3)`,
        [recipeId, index + 1, instruction.trim()],
      );
    }
  }

  private toResponse(row: RecipeRow): RecipeResponse {
    const ingredients = Array.isArray(row.ingredientes_detalhados)
      ? (row.ingredientes_detalhados as IngredientRecord[]).map((item) => ({
          ...item,
          tacoId: item.tacoId === null ? null : Number(item.tacoId),
          gramas:
            item.gramas === null
              ? null
              : Number.parseFloat(String(item.gramas)),
        }))
      : [];
    const steps = Array.isArray(row.modo_preparo)
      ? (row.modo_preparo as string[])
      : [];

    return {
      id: row.id,
      tipo: row.tipo,
      autorId: row.autor_id,
      autorNome: row.autor_nome ?? (row.tipo === "oficial" ? "Que-Fome" : null),
      titulo: row.titulo,
      categoria: row.categoria,
      descricao: row.descricao,
      descricaoCompleta: row.descricao_completa,
      tempo: `${row.tempo_minutos} min`,
      tempoMinutos: row.tempo_minutos,
      porcoes: row.porcoes,
      dificuldade: row.dificuldade,
      custo: row.custo,
      imagem: row.imagem_path,
      imagemPath: row.imagem_path,
      tags: Array.isArray(row.tags) ? row.tags : [],
      ingredientes: ingredients.map(
        (ingredient) =>
          ingredient.textoExibicao ??
          `${ingredient.quantidade} ${ingredient.nome}`.trim(),
      ),
      ingredientesDetalhados: ingredients,
      modoPreparo: steps,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    if (error instanceof HttpException) throw error;

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      ["42P01", "42703"].includes(String(error.code))
    ) {
      throw new ServiceUnavailableException(
        "A estrutura de receitas ainda não está disponível no banco.",
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      ["23503", "23514", "22003"].includes(String(error.code))
    ) {
      throw new BadRequestException(
        "Os dados da receita contêm uma referência ou valor inválido.",
      );
    }

    if (!this.database.isConfigured()) {
      throw new ServiceUnavailableException(
        "O banco de dados não está configurado para operações de receitas.",
      );
    }
    throw new InternalServerErrorException(`Não foi possível ${operation}.`);
  }
}
