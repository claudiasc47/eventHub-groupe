import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class UpdateCategoryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name?: string;
}
