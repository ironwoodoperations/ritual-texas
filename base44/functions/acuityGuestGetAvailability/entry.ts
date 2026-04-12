const ACUITY_BASE = "https://acuityscheduling.com/api/v1";

function acuityAuth() {
  const userId = Deno.env.get("ACUITY_USER_ID") || "";
  const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
  return "Basic " + btoa(userId + ":" + apiKey);
}

async function acuityGet(path) {
  const resp = await fetch(`${ACUITY_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: acuityAuth(), "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Acuity GET ${path} failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  return resp.json();
}

function normalizeSlot(time) {
  const match = String(time).match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { serviceId, dates, providerId } = body;

    if (!serviceId) return Response.json({ error: "serviceId required" }, { status: 400 });
    if (!Array.isArray(dates) || dates.length === 0) return Response.json({ error: "dates[] required" }, { status: 400 });
    if (dates.length > 60) return Response.json({ error: "Maximum 60 dates per request" }, { status: 400 });

    const userId = Deno.env.get("ACUITY_USER_ID") || "";
    const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
    if (!userId || !apiKey) return Response.json({ error: "Acuity credentials not configured" }, { status: 500 });

    const calendars = await acuityGet("/calendars");
    const calendarIds = providerId ? [String(providerId)] : calendars.map((c) => String(c.id));
    const calendarNames = {};
    for (const c of calendars) {
      calendarNames[String(c.id)] = c.name || `Provider ${c.id}`;
    }

    const sortedDates = [...dates].sort();
    const fetchPromises = [];

    for (const calId of calendarIds) {
      for (const date of sortedDates) {
        fetchPromises.push(
          (async () => {
            try {
              const times = await acuityGet(`/availability/times?appointmentTypeID=${serviceId}&date=${date}&calendarID=${calId}`);
              const slots = (Array.isArray(times) ? times : [])
                .map((t) => normalizeSlot(t.time))
                .filter(Boolean)
                .sort();
              return { calendarId: calId, date, slots };
            } catch {
              return { calendarId: calId, date, slots: [] };
            }
          })()
        );
      }
    }

    const results = await Promise.all(fetchPromises);

    const availability = {};
    for (const date of sortedDates) {
      const dateProviders = [];
      const allSlots = new Set();
      for (const { calendarId, date: d, slots } of results) {
        if (d !== date || !slots.length) continue;
        dateProviders.push({ id: calendarId, name: calendarNames[calendarId] || `Provider ${calendarId}`, slots });
        slots.forEach((s) => allSlots.add(s));
      }
      availability[date] = {
        hasAvailability: dateProviders.length > 0,
        totalSlots: allSlots.size,
        providers: dateProviders,
        allSlots: [...allSlots].sort(),
      };
    }

    return Response.json({ serviceId, availability });
  } catch (e) {
    console.error("acuityGuestGetAvailability error:", e);
    return Response.json({ error: e.message || "Failed to fetch availability" }, { status: 500 });
  }
});