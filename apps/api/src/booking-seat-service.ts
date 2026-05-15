import { prisma } from "./db";
import { ApiError } from "./errors";

export const BOOKING_STATUSES = ["reserved", "arrived", "completed", "cancelled", "no_show", "released"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type SeatAvailabilitySnapshot = {
  tenantId: string;
  outletId: string;
  checkedAt: string;
  totalSeats: number;
  defaultHoldMinutes: number;
  current: SeatAvailabilityPoint;
  nextTwoHours: SeatAvailabilityPoint[];
  activeBookings: BookingSummary[];
  upcomingBookings: BookingSummary[];
};

export type SeatAvailabilityPoint = {
  at: string;
  reservedSeats: number;
  availableSeats: number;
  occupancyRate: number;
};

export type BookingSummary = {
  id: string;
  customerName: string;
  customerContact: string | null;
  partySize: number;
  bookingStart: string;
  bookingEnd: string;
  status: string;
  tableLabel: string | null;
  notes: string | null;
};

export function outletSeatCapacity() {
  return Number(process.env.BOOKING_DEFAULT_SEAT_CAPACITY ?? 24);
}

export function bookingHoldMinutes() {
  return Number(process.env.BOOKING_DEFAULT_HOLD_MINUTES ?? 90);
}

function overlapWhere(input: { tenantId: string; outletId: string; start: Date; end: Date; excludeId?: string }) {
  return {
    tenantId: input.tenantId,
    outletId: input.outletId,
    status: { in: ["reserved", "arrived"] },
    ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    bookingStart: { lt: input.end },
    bookingEnd: { gt: input.start },
  };
}

function toSummary(booking: {
  id: string;
  customerName: string;
  customerContact: string | null;
  partySize: number;
  bookingStart: Date;
  bookingEnd: Date;
  status: string;
  tableLabel: string | null;
  notes: string | null;
}): BookingSummary {
  return {
    id: booking.id,
    customerName: booking.customerName,
    customerContact: booking.customerContact,
    partySize: booking.partySize,
    bookingStart: booking.bookingStart.toISOString(),
    bookingEnd: booking.bookingEnd.toISOString(),
    status: booking.status,
    tableLabel: booking.tableLabel,
    notes: booking.notes,
  };
}

export async function reservedSeatsDuring(input: { tenantId: string; outletId: string; start: Date; end: Date; excludeId?: string }) {
  const bookings = await prisma.booking.findMany({ where: overlapWhere(input), select: { partySize: true } });
  return bookings.reduce((sum, booking) => sum + booking.partySize, 0);
}

export async function assertSeatAvailability(input: { tenantId: string; outletId: string; start: Date; end: Date; partySize: number; excludeId?: string }) {
  if (input.partySize <= 0) throw new ApiError("INVALID_PAYLOAD", "party_size must be greater than 0", 400);
  if (input.end <= input.start) throw new ApiError("INVALID_PAYLOAD", "booking_end must be after booking_start", 400);
  const capacity = outletSeatCapacity();
  const reserved = await reservedSeatsDuring(input);
  const available = capacity - reserved;
  if (available < input.partySize) {
    throw new ApiError("SEAT_UNAVAILABLE", `Seat unavailable: ${available} seat(s) left for this time window, requested ${input.partySize}`, 409, {
      totalSeats: capacity,
      reservedSeats: reserved,
      availableSeats: available,
      requestedSeats: input.partySize,
    });
  }
  return { totalSeats: capacity, reservedSeats: reserved, availableSeats: available };
}

export async function createBooking(input: {
  tenantId: string;
  outletId: string;
  customerName: string;
  customerContact?: string | null;
  partySize: number;
  bookingStart: Date;
  bookingEnd?: Date;
  tableLabel?: string | null;
  notes?: string | null;
}) {
  const bookingEnd = input.bookingEnd ?? new Date(input.bookingStart.getTime() + bookingHoldMinutes() * 60_000);
  const availability = await assertSeatAvailability({ ...input, start: input.bookingStart, end: bookingEnd });
  const booking = await prisma.booking.create({
    data: {
      tenantId: input.tenantId,
      outletId: input.outletId,
      customerName: input.customerName,
      customerContact: input.customerContact,
      partySize: input.partySize,
      bookingStart: input.bookingStart,
      bookingEnd,
      tableLabel: input.tableLabel,
      notes: input.notes,
      status: "reserved",
    },
  });
  return { booking, availabilityAfterBooking: { ...availability, availableSeats: availability.availableSeats - input.partySize } };
}

export async function getSeatAvailabilitySnapshot(input: { tenantId: string; outletId: string; at?: Date }): Promise<SeatAvailabilitySnapshot> {
  const at = input.at ?? new Date();
  const totalSeats = outletSeatCapacity();
  const windowStart = new Date(at.getTime() - 30 * 60_000);
  const windowEnd = new Date(at.getTime() + 2 * 60 * 60_000);
  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: input.tenantId,
      outletId: input.outletId,
      status: { in: ["reserved", "arrived"] },
      bookingStart: { lt: windowEnd },
      bookingEnd: { gt: windowStart },
    },
    orderBy: { bookingStart: "asc" },
  });

  function point(date: Date): SeatAvailabilityPoint {
    const reservedSeats = bookings
      .filter((booking) => booking.bookingStart <= date && booking.bookingEnd > date)
      .reduce((sum, booking) => sum + booking.partySize, 0);
    return {
      at: date.toISOString(),
      reservedSeats,
      availableSeats: Math.max(0, totalSeats - reservedSeats),
      occupancyRate: totalSeats <= 0 ? 0 : reservedSeats / totalSeats,
    };
  }

  const nextTwoHours = Array.from({ length: 9 }, (_, index) => point(new Date(at.getTime() + index * 15 * 60_000)));
  return {
    tenantId: input.tenantId,
    outletId: input.outletId,
    checkedAt: at.toISOString(),
    totalSeats,
    defaultHoldMinutes: bookingHoldMinutes(),
    current: point(at),
    nextTwoHours,
    activeBookings: bookings.filter((booking) => booking.bookingStart <= at && booking.bookingEnd > at).map(toSummary),
    upcomingBookings: bookings.filter((booking) => booking.bookingStart > at).map(toSummary),
  };
}
