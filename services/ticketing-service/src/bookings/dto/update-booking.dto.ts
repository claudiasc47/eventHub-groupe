import { PartialType } from '@nestjs/mapped-types'
import { CreateBookingDto } from './create-booking.dto'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { BookingStatus } from '../../entity/booking.entity'

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus

  @IsString()
  @IsOptional()
  paymentId?: string
}
