import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// In-memory cache with 2-minute TTL
const cache = new Map<string, { data: any; expiresAt: number }>();

const ACUITY_BASE = "https://acuityscheduling.com/api/v1";

function acuityAuth(): string {
  const userId = Deno.env.get("ACUITY_USER_ID") || "";
  const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
  return "Basic " + btoa(userId + ":" + apiKey);
}

function acuityHeaders(): Record<string, string> {
  return {
    Authorization: acuityAuth(),
    "Content-Type": "application/json",
  };
}

async function acuityGet(path: string): Promise<any> {
  const resp = await fetch(`${ACUITY_BASE}${path}`, {
    method: "GET",
    headers: acuityHeaders(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Acuity GET ${path} failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  return resp.json();
}

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: true, message: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { serviceId, staffId, date, includePrivate } = body || {};

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: true, message: "date required (YYYY-MM-DD)" }, { status: 400 });
    }

    const userId = Deno.env.get("ACUITY_USER_ID") || "";
    const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
    if (!userId || !apiKey) {
      return Response.json(
        { services: [], providers: [], slots: [], error: "ACUITY_USER_ID / ACUITY_API_KEY not set" },
      );
    }

    // Check in-memory cache
    const cacheKey = `${date}:${serviceId || "all"}:${staffId || "all"}:${includePrivate ? "1" : "0"}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return Response.json(cached.data);
    }

    // Fetch appointment types and calendars in parallel
    const [appointmentTypes, calendars]: [any[], any[]] = await Promise.all([
      acuityGet("/appointment-types"),
      acuityGet("/calendars"),
    ]);

    // Build provider lookup
    const providerById: Record<string, { id: string; name: string }> = {};
    for (const cal of calendars) {
      providerById[String(cal.id)] = {
        id: String(cal.id),
        name: cal.name || `Provider ${cal.id}`,
      };
    }

    // Filter appointment types
    let activeTypes = appointmentTypes;
    if (!includePrivate) {
      activeTypes = activeTypes.filter((at: any) => !at.private);
    }

    // If a specific serviceId is given, filter to only that type
    if (serviceId) {
      activeTypes = activeTypes.filter((at: any) => String(at.id) === String(serviceId));
    }

    // Build all service × calendar combos for availability fetching
    const allCombos: { typeId: string; calendarId: string; type: any }[] = [];
    for (const at of activeTypes) {
      if (staffId) {
        allCombos.push({ typeId: String(at.id), calendarId: String(staffId), type: at });
      } else {
        // Check all calendars
        for (const cal of calendars) {
          allCombos.push({ typeId: String(at.id), calendarId: String(cal.id), type: at });
        }
      }
    }

    // Fetch all availability slots in parallel
    const comboResults = await Promise.all(
      allCombos.map(async ({ typeId, calendarId, type }) => {
        try {
          const slots: any[] = await acuityGet(
            `/availability/times?appointmentTypeID=${typeId}&date=${date}&calendarID=${calendarId}`
          );
          const validSlots = (Array.isArray(slots) ? slots : [])
            .filter((s: any) => s.time)
            .map((s: any) => {
              // Extract HH:MM:SS from ISO datetime like "2026-04-01T10:00:00-0500"
              const match = String(s.time).match(/T(\d{2}:\d{2}:\d{2})/);
              return match ? match[1] : null;
            })
            .filter(Boolean)
            .sort();
          return { typeId, calendarId, slots: validSlots };
        } catch {
          return { typeId, calendarId, slots: [] };
        }
      })
    );

    // Group: service → providers with slots
    const serviceProviderMap: Record<string, any[]> = {};
    for (const { typeId, calendarId, slots } of comboResults) {
      if (!slots.length) continue;
      if (!serviceProviderMap[typeId]) serviceProviderMap[typeId] = [];
      serviceProviderMap[typeId].push({
        id: calendarId,
        name: providerById[calendarId]?.name || `Provider ${calendarId}`,
        slots,
      });
    }

    // Build final response matching TreatmentSlotPicker expected shape:
    // { date, services: [{ id, name, duration, price, private, providers: [{ id, name, slots }] }] }
    const services = activeTypes
      .filter((at: any) => serviceProviderMap[String(at.id)]?.length > 0)
      .map((at: any) => ({
        id: String(at.id),
        name: at.name || "",
        duration: Number(at.duration || 60),
        price: Number(at.price || 0),
        private: Boolean(at.private),
        providers: serviceProviderMap[String(at.id)],
      }));

    const result = { date, services, error: null };

    // Store in cache with 2-min TTL
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + 2 * 60 * 1000 });

    return Response.json(result);
  } catch (e: any) {
    console.error("acuityGetAvailability error:", e);
    return Response.json({
      services: [],
      providers: [],
      slots: [],
      error: e.message || "Acuity availability fetch failed",
    });
  }
});
