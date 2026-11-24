import { IsString, IsOptional, IsEnum } from 'class-validator'
import { BookingStatus } from '../../entity/booking.entity'

export class FilterBookingDto {
  @IsString()
  @IsOptional()
  userId?: string

  @IsString()
  @IsOptional()
  ticketTypeId?: string

  @IsString()
  @IsOptional()
  eventId?: string

  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus

  @IsString()
  @IsOptional()
  bookingReference?: string
}
