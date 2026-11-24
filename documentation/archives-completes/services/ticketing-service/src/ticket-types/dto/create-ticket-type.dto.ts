import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator'
import { TicketTypeStatus } from '../../entity/ticket-type.entity'

export class CreateTicketTypeDto {
  @IsString()
  @IsNotEmpty()
  eventId: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @Min(0)
  price: number

  @IsNumber()
  @Min(1)
  totalCapacity: number

  @IsEnum(TicketTypeStatus)
  @IsOptional()
  status?: TicketTypeStatus
}
