import { base44 } from '@/api/base44Client';

export interface SimplyBookProvider {
  id: string;
  name: string;
  phone: string;
  position: string;
  description: string;
  picture: string;
}

export interface SimplyBookService {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  category: string[];
  picture: string;
  position: number;
  providers: SimplyBookProvider[];
  providerIds: string[];
}

export interface ServicesResponse {
  services: SimplyBookService[];
  providers: SimplyBookProvider[];
  totalServices: number;
  totalProviders: number;
}

/**
 * Fetch all active, public services (treatments) with their providers.
 * Cached server-side for 5 minutes.
 * No authentication required — safe for guest-facing pages.
 */
export async function getServices(): Promise<ServicesResponse> {
  const res = await base44.functions.invoke('guestGetServices', {});
  if (res.data?.error) {
    throw new Error(res.data.error);
  }
  return res.data as ServicesResponse;
}

/**
 * Fetch all staff/providers.
 * Convenience wrapper that extracts providers from getServices().
 */
export async function getStaff(serviceId?: string): Promise<SimplyBookProvider[]> {
  const data = await getServices();
  if (serviceId) {
    const svc = data.services.find(s => s.id === serviceId);
    return svc?.providers || [];
  }
  return data.providers;
}
