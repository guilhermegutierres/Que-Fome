import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
  Matches,
  Max,
} from "class-validator";
import { RecipeIngredientDto } from "./recipe-ingredient.dto.js";
import { RECIPE_TAG_IDS, normalizarTagsReceita } from "../recipe-tags.js";

function parseMinutes(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const match = value.trim().match(/^(\d+)\s*(?:min(?:utos?)?)?$/i);
  return match ? Number(match[1]) : value;
}

function blankToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

export class CreateRecipeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titulo!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoria!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  descricao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  descricaoCompleta?: string | null;

  @Transform(({ value }: { value: unknown }) => parseMinutes(value))
  @IsInt()
  @Min(3)
  tempo!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  porcoes?: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsIn(["Muito fácil", "Fácil", "Médio", "Difícil"])
  dificuldade!: string;

  @Transform(({ value }: { value: unknown }) => blankToNull(value))
  @IsOptional()
  @IsIn(["Baixo", "Médio", "Alto"])
  custo?: string | null;

  @Transform(({ value }: { value: unknown }) => blankToNull(value))
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(500)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/)
  imagemPath?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredientesDetalhados!: RecipeIngredientDto[];

  // Compatibilidade com o formato exibido atualmente; os dados persistidos são
  // derivados de ingredientesDetalhados para evitar divergência entre campos.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(300, { each: true })
  ingredientes?: string[] | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === "string" ? item.trim() : item))
      : value,
  )
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(2000, { each: true })
  modoPreparo!: string[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizarTagsReceita(value))
  @IsArray()
  @ArrayMaxSize(12)
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(RECIPE_TAG_IDS, { each: true })
  tags?: string[];
}
