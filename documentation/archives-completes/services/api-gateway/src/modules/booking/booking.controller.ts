import { Controller, Get, Param, Post, Body } from '@nestjs/common'
import { BookingService } from './booking.service'
import { BookEventInputDto } from 'src/common/dto/booking/book-event.input.dto'

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('events')
  getAllAvailable() {
    return this.bookingService.getAvailableEvents()
  }

  @Get('events/:id')
  getOneEvent(@Param('id') id: string) {
    return this.bookingService.getEventById(id)
  }

  @Post('events/:id/book')
  bookEvent(@Param('id') id: string, @Body() dto: BookEventInputDto) {
    return this.bookingService.bookAvailableEvent(id, dto)
  }
}
