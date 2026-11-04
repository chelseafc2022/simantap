import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdatePencairanDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  nominal: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  catatan: string;
}
