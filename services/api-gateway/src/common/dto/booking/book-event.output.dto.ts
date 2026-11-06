export class BookEventOutputDto {
  id: string
  userId: string
  quantity: number
  totalPrice: number
  status: string
  bookingReference: string
  ticketType: TicketTypeDto
  qrCode: string
  paymentId: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  usedAt: string | null
  notes?: string
}

class TicketTypeDto {
  id: string
  eventId: string
  name: string
  description: string
  price: number
  totalCapacity: number
  soldCount: number
  status: string
  createdAt: string
  updatedAt: string
}
