import { base44 } from '@/api/base44Client';

export interface BookingRequest {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  serviceId: string;
  providerId?: string; // null/undefined = "any available provider"
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM or HH:MM:SS
}

export interface BookingResult {
  bookingId: string;
  bookingHash: string;
  serviceName: string;
  serviceId: string;
  providerId: string;
  providerName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  clientId: number;
  guestName: string;
  guestEmail: string;
}

export interface BookingResponse {
  success: boolean;
  booking: BookingResult;
}

/**
 * Create a booking in SimplyBook.
 * Handles client creation, provider resolution, and the actual booking.
 *
 * Error codes in response:
 * - "slot_taken" (409): The selected time slot is no longer available
 * - Generic errors (500): Server/auth issues
 *
 * @throws Error with message from the API
 */
export async function createBooking(data: BookingRequest): Promise<BookingResponse> {
  const res = await base44.functions.invoke('guestCreateBooking', data);

  if (res.data?.error === 'slot_taken') {
    const err = new Error(res.data.message || 'That time slot is no longer available.');
    (err as any).code = 'SLOT_TAKEN';
    throw err;
  }

  if (res.data?.error) {
    throw new Error(res.data.error);
  }

  return res.data as BookingResponse;
}

/**
 * Cancel an existing booking by its SimplyBook booking ID.
 */
export async function cancelBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
  const res = await base44.functions.invoke('guestCancelBooking', { bookingId });
  if (res.data?.error) {
    throw new Error(res.data.error);
  }
  return res.data;
}

/**
 * Look up booking details. Uses the simplybookCallback's getBookingDetails pattern.
 * This is an admin-only operation used by staff.
 */
export async function getBooking(bookingId: string, bookingHash?: string): Promise<any> {
  // For now, booking details are fetched through the SpaBooking entity
  // which is synced by simplybookCallback webhook
  const res = await base44.entities.SpaBooking.filter({
    simplybookBookingId: bookingId,
  });
  return res?.[0] || null;
}
