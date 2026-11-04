import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePencairanDto {
  @IsUUID()
  id: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  bulan: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  nominal: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  catatan: string;
}
