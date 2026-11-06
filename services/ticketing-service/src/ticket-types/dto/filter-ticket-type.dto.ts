import { IsString, IsOptional, IsEnum } from 'class-validator'
import { TicketTypeStatus } from '../../entity/ticket-type.entity'

export class FilterTicketTypeDto {
  @IsString()
  @IsOptional()
  eventId?: string

  @IsEnum(TicketTypeStatus)
  @IsOptional()
  status?: TicketTypeStatus

  @IsString()
  @IsOptional()
  search?: string
}
