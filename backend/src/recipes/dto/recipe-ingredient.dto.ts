import { Transform, Type } from "class-transformer";
import {
  IsInt,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from "class-validator";

interface IngredientLike {
  gramas?: number | null;
}

interface EstimatedIngredientLike extends IngredientLike {
  gramasEstimadas?: boolean;
}

@ValidatorConstraint({ name: "tacoIngredientRequiresGrams", async: false })
class TacoIngredientRequiresGrams implements ValidatorConstraintInterface {
  validate(tacoId: unknown, args: ValidationArguments): boolean {
    if (tacoId === undefined || tacoId === null) return true;
    const { gramas } = args.object as IngredientLike;
    return typeof gramas === "number" && Number.isFinite(gramas) && gramas > 0;
  }

  defaultMessage(): string {
    return "Ingredientes vinculados à TACO precisam de gramas positivas e finitas.";
  }
}

@ValidatorConstraint({ name: "estimatedGramsRequiresValue", async: false })
class EstimatedGramsRequiresValue implements ValidatorConstraintInterface {
  validate(gramasEstimadas: unknown, args: ValidationArguments): boolean {
    if (gramasEstimadas !== true) return true;
    const { gramas } = args.object as EstimatedIngredientLike;
    return typeof gramas === "number" && Number.isFinite(gramas) && gramas > 0;
  }

  defaultMessage(): string {
    return "Pesos marcados como estimados precisam de gramas positivas e finitas.";
  }
}

export class RecipeIngredientDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  quantidade!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  textoExibicao?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Validate(TacoIngredientRequiresGrams)
  tacoId?: number | null;

  // Recebido somente para compatibilidade de payload; o valor devolvido pela API
  // sempre vem de public.alimentos, nunca deste campo enviado pelo cliente.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tacoDescricao?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.001)
  @Max(999999999.999)
  gramas?: number | null;

  @IsOptional()
  @IsBoolean()
  @Validate(EstimatedGramsRequiresValue)
  gramasEstimadas?: boolean;
}
