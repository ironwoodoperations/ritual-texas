import { base44 } from '@/api/base44Client';

export interface ProviderSlots {
  id: string;
  name: string;
  slots: string[];
}

export interface DateAvailability {
  hasAvailability: boolean;
  totalSlots: number;
  providers: ProviderSlots[];
  allSlots: string[];
}

export interface MultiDayAvailabilityResponse {
  serviceId: string;
  availability: Record<string, DateAvailability>;
  summary: {
    totalDates: number;
    availableDates: number;
    unavailableDates: number;
    datesWithAvailability: string[];
    datesWithoutAvailability: string[];
  };
}

/**
 * Fetch availability for a service across multiple dates.
 * Returns a map of date → availability info (providers + time slots).
 * No authentication required — safe for guest-facing pages.
 *
 * @param serviceId - SimplyBook service/event ID
 * @param dates - Array of YYYY-MM-DD date strings (max 60)
 * @param providerId - Optional: filter to specific provider
 */
export async function getAvailability(
  serviceId: string,
  dates: string[],
  providerId?: string
): Promise<MultiDayAvailabilityResponse> {
  const res = await base44.functions.invoke('guestGetMultiDayAvailability', {
    serviceId,
    dates,
    providerId: providerId || undefined,
  });
  if (res.data?.error) {
    throw new Error(res.data.error);
  }
  return res.data as MultiDayAvailabilityResponse;
}

/**
 * Generate an array of date strings between two dates (inclusive).
 * Useful for generating the dates array for a guest's stay.
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
