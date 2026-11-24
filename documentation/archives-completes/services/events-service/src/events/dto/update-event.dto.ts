import { IsString, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator'
import { EventStatus } from '../../entity/event.entity'

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  nom?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  @IsOptional()
  date_debut?: string

  @IsDateString()
  @IsOptional()
  date_fin?: string

  @IsUUID()
  @IsOptional()
  locationId?: string

  @IsUUID()
  @IsOptional()
  categoryId?: string

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus
}
