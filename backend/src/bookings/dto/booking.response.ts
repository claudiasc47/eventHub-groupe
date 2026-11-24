import { Booking } from '../booking.entity';

export function toBookingResponse(b: Booking) {
  return {
    id: b.id,
    event: {
      id: b.event.id,
      name: b.event.name,
      startDate: b.event.startDate,
      endDate: b.event.endDate,
      location: { id: b.event.location.id, name: b.event.location.name },
      status: b.event.status,
    },
    quantity: b.quantity,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}