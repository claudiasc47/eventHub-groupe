import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator'

export class BookEventInputDto {
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
