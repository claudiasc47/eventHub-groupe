import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator'

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  ticketTypeId: string

  @IsNumber()
  @Min(1)
  quantity: number

  @IsString()
  @IsOptional()
  notes?: string
}
