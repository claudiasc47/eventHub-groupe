import { PartialType } from '@nestjs/mapped-types'
import { CreateTicketTypeDto } from './create-ticket-type.dto'
import { IsOptional, IsNumber, Min } from 'class-validator'

export class UpdateTicketTypeDto extends PartialType(CreateTicketTypeDto) {
  @IsNumber()
  @Min(0)
  @IsOptional()
  soldCount?: number
}
