import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class ItemAlimentoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(50000)
  grams!: number;
}

export class CalcularAlimentosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ItemAlimentoDto)
  items!: ItemAlimentoDto[];
}
