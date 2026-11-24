import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator'
import { EventStatus } from '../../entity/event.entity'

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  nom: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  date_debut: string

  @IsDateString()
  date_fin: string

  @IsUUID()
  locationId: string

  @IsUUID()
  categoryId: string

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus
}
