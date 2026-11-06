import { IsOptional, IsString, IsInt } from 'class-validator'

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  nom?: string

  @IsString()
  @IsOptional()
  adresse?: string

  @IsString()
  @IsOptional()
  ville?: string

  @IsString()
  @IsOptional()
  code_postal?: string

  @IsInt()
  @IsOptional()
  capacite?: number
}
