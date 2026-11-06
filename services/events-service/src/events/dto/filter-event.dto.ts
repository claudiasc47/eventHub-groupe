import { IsString, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator'
import { EventStatus } from '../../entity/event.entity'

export class FilterEventDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string

  @IsOptional()
  @IsUUID()
  locationId?: string

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus

  @IsOptional()
  @IsString()
  search?: string
}
