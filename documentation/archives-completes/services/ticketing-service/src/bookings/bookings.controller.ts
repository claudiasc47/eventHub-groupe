import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common'
import { BookingsService } from './bookings.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'
import { FilterBookingDto } from './dto/filter-booking.dto'

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto)
  }

  @Get()
  findAll(@Query() filter: FilterBookingDto) {
    return this.bookingsService.findAll(filter)
  }

  @Get('reference/:reference')
  findByReference(@Param('reference') reference: string) {
    return this.bookingsService.findByReference(reference)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id)
  }

  @Get(':id/qrcode')
  getQRCode(@Param('id') id: string) {
    return this.bookingsService.getQRCode(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingsService.update(id, updateBookingDto)
  }

  @Patch(':id/confirm')
  confirmBooking(@Param('id') id: string, @Body('paymentId') paymentId: string) {
    return this.bookingsService.confirmBooking(id, paymentId)
  }

  @Patch(':id/cancel')
  cancelBooking(@Param('id') id: string) {
    return this.bookingsService.cancelBooking(id)
  }

  @Patch(':id/validate')
  validateBooking(@Param('id') id: string) {
    return this.bookingsService.validateBooking(id)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingsService.remove(id)
  }
}
