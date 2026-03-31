import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ACUITY_BASE = "https://acuityscheduling.com/api/v1";

function acuityAuth(): string {
  const userId = Deno.env.get("ACUITY_USER_ID") || "";
  const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
  return "Basic " + btoa(userId + ":" + apiKey);
}

async function acuityGet(path: string): Promise<any> {
  const resp = await fetch(`${ACUITY_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: acuityAuth(),
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Acuity GET ${path} failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  return resp.json();
}

function normalizeSlot(time: string): string | null {
  // Acuity returns ISO datetime like "2026-04-01T10:00:00-0500"
  const match = String(time).match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  // No auth check — guest-safe endpoint
  try {
    const body = await req.json();
    const { serviceId, dates, providerId } = body;

    if (!serviceId) {
      return Response.json({ error: "serviceId required" }, { status: 400 });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return Response.json({ error: "dates[] required (array of YYYY-MM-DD)" }, { status: 400 });
    }
    if (dates.length > 60) {
      return Response.json({ error: "Maximum 60 dates per request" }, { status: 400 });
    }

    for (const d of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return Response.json({ error: `Invalid date format: ${d}` }, { status: 400 });
      }
    }

    const userId = Deno.env.get("ACUITY_USER_ID") || "";
    const apiKey = Deno.env.get("ACUITY_API_KEY") || "";

    if (!userId || !apiKey) {
      return Response.json({ error: "Acuity credentials not configured" }, { status: 500 });
    }

    // Determine which calendars (providers) to check
    let calendarIds: string[] = [];
    if (providerId) {
      calendarIds = [String(providerId)];
    } else {
      // Fetch all calendars
      const calendars: any[] = await acuityGet("/calendars");
      calendarIds = calendars.map((c: any) => String(c.id));
    }

    // Get calendar names for response
    let calendarNames: Record<string, string> = {};
    if (!providerId) {
      const calendars: any[] = await acuityGet("/calendars");
      for (const c of calendars) {
        calendarNames[String(c.id)] = c.name || `Provider ${c.id}`;
      }
    }

    const sortedDates = [...dates].sort();

    // For each date × calendar, fetch availability times
    // Acuity doesn't have a range endpoint for times, so we fetch per date
    const fetchPromises: Promise<{ calendarId: string; date: string; slots: string[] }>[] = [];

    for (const calId of calendarIds) {
      for (const date of sortedDates) {
        fetchPromises.push(
          (async () => {
            try {
              let url = `/availability/times?appointmentTypeID=${serviceId}&date=${date}&calendarID=${calId}`;
              const times: any[] = await acuityGet(url);
              const slots = (Array.isArray(times) ? times : [])
                .map((t: any) => normalizeSlot(t.time))
                .filter(Boolean) as string[];
              return { calendarId: calId, date, slots: slots.sort() };
            } catch {
              return { calendarId: calId, date, slots: [] };
            }
          })()
        );
      }
    }

    const results = await Promise.all(fetchPromises);

    // Build availability map: { date -> { hasAvailability, providers, allSlots, totalSlots } }
    const availability: Record<string, any> = {};

    for (const date of sortedDates) {
      const dateProviders: any[] = [];
      const allSlots = new Set<string>();

      for (const { calendarId, date: d, slots } of results) {
        if (d !== date) continue;
        if (slots.length > 0) {
          dateProviders.push({
            id: calendarId,
            name: calendarNames[calendarId] || `Provider ${calendarId}`,
            slots,
          });
          slots.forEach((s: string) => allSlots.add(s));
        }
      }

      availability[date] = {
        hasAvailability: dateProviders.length > 0,
        totalSlots: allSlots.size,
        providers: dateProviders,
        allSlots: [...allSlots].sort(),
      };
    }

    const datesWithAvailability = sortedDates.filter(d => availability[d]?.hasAvailability);
    const datesWithoutAvailability = sortedDates.filter(d => !availability[d]?.hasAvailability);

    return Response.json({
      serviceId,
      availability,
      summary: {
        totalDates: sortedDates.length,
        availableDates: datesWithAvailability.length,
        unavailableDates: datesWithoutAvailability.length,
        datesWithAvailability,
        datesWithoutAvailability,
      },
    });
  } catch (e: any) {
    console.error("guestGetMultiDayAvailability error:", e);
    return Response.json({ error: e.message || "Failed to fetch availability" }, { status: 500 });
  }
});
