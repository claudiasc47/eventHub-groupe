import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { BookingsService } from './bookings.service';
import { toBookingResponse } from './dto/booking.response';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('events/:id/bookings')
  async create(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return toBookingResponse(
      await this.bookings.create(user.id, eventId, dto.quantity),
    );
  }

  @Get('me/bookings')
  async mine(@CurrentUser() user: AuthUser) {
    const list = await this.bookings.findMine(user.id);
    return list.map(toBookingResponse);
  }

  @Patch('bookings/:id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return toBookingResponse(await this.bookings.cancel(user.id, id));
  }
}
