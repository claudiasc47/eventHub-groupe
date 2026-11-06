import { IsOptional, IsString } from 'class-validator'

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  libelle?: string
}
