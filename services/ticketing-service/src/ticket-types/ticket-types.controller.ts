import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common'
import { TicketTypesService } from './ticket-types.service'
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto'
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto'
import { FilterTicketTypeDto } from './dto/filter-ticket-type.dto'

@Controller('ticket-types')
export class TicketTypesController {
  constructor(private readonly ticketTypesService: TicketTypesService) {}

  @Post()
  create(@Body() createTicketTypeDto: CreateTicketTypeDto) {
    return this.ticketTypesService.create(createTicketTypeDto)
  }

  @Get()
  findAll(@Query() filter: FilterTicketTypeDto) {
    return this.ticketTypesService.findAll(filter)
  }

  @Get('event/:eventId')
  findByEventId(@Param('eventId') eventId: string) {
    return this.ticketTypesService.findByEventId(eventId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketTypesService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTicketTypeDto: UpdateTicketTypeDto) {
    return this.ticketTypesService.update(id, updateTicketTypeDto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketTypesService.remove(id)
  }
}
