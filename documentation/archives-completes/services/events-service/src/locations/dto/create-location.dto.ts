import { IsNotEmpty, IsString, IsInt } from 'class-validator'

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  nom: string

  @IsString()
  @IsNotEmpty()
  adresse: string

  @IsString()
  @IsNotEmpty()
  ville: string

  @IsString()
  @IsNotEmpty()
  code_postal: string

  @IsInt()
  capacite: number
}
