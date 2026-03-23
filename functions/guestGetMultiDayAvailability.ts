import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// In-memory cache: key = "serviceId:date" → slots[], TTL 2 min
const slotCache = new Map<string, { slots: any[]; expiresAt: number }>();

async function sbRPC(url: string, method: string, params: any[], headers: Record<string, string> = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await resp.json();
  if (json?.error) throw new Error(`SB RPC ${method}: ${JSON.stringify(json.error)}`);
  return json?.result ?? json;
}

function normalizeSlot(t: string): string | null {
  const s = String(t).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return null;
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

    // Validate date formats
    for (const d of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return Response.json({ error: `Invalid date format: ${d}` }, { status: 400 });
      }
    }

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";

    if (!company || !apiKey) {
      return Response.json({ error: "SimplyBook credentials not configured" }, { status: 500 });
    }

    const loginUrl = "https://user-api.simplybook.me/login";
    const apiUrl = "https://user-api.simplybook.me";

    // Public read token
    const token = await sbRPC(loginUrl, "getToken", [company, apiKey]);
    if (!token || typeof token !== "string") {
      return Response.json({ error: "SimplyBook auth failed" }, { status: 500 });
    }

    const headers = { "X-Company-Login": company, "X-Token": token };

    // If no specific provider requested, get service's unit_map to know which providers offer it
    let providerIdsToCheck: string[] = [];

    if (providerId) {
      providerIdsToCheck = [String(providerId)];
    } else {
      // Fetch service details to get unit_map
      const servicesRaw = await sbRPC(apiUrl, "getEventList", [], headers);
      const svc = servicesRaw?.[serviceId];
      if (!svc) {
        return Response.json({ error: `Service ${serviceId} not found` }, { status: 404 });
      }
      if (Array.isArray(svc.unit_map) && svc.unit_map.length > 0) {
        providerIdsToCheck = svc.unit_map.map(String);
      } else {
        // Fallback: get all providers
        const unitsRaw = await sbRPC(apiUrl, "getUnitList", [], headers);
        providerIdsToCheck = Object.keys(unitsRaw || {});
      }
    }

    // For each date, check cache first; otherwise fetch from API
    // Use getStartTimeMatrix which can span a date range for one service+provider combo
    // Optimization: group consecutive dates into ranges and use range queries

    const sortedDates = [...dates].sort();
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const dateSet = new Set(sortedDates);

    // Fetch availability for the full range per provider, then filter to requested dates
    const providerSlotPromises = providerIdsToCheck.map(async (pid) => {
      try {
        const matrix = await sbRPC(
          apiUrl,
          "getStartTimeMatrix",
          [firstDate, lastDate, serviceId, pid, 1],
          headers
        );

        const result: Record<string, string[]> = {};
        if (matrix && typeof matrix === "object") {
          for (const [date, raw] of Object.entries(matrix)) {
            if (!dateSet.has(date)) continue;
            const rawSlots = Array.isArray(raw) ? raw : Object.keys(raw as any);
            const slots = rawSlots
              .map((t: any) => normalizeSlot(String(t)))
              .filter(Boolean) as string[];
            if (slots.length > 0) {
              result[date] = slots.sort();
            }
          }
        }
        return { providerId: pid, dateSlots: result };
      } catch {
        return { providerId: pid, dateSlots: {} };
      }
    });

    const providerResults = await Promise.all(providerSlotPromises);

    // Build the response: { date -> { hasAvailability, providers: [{ id, name, slots }] } }
    // Also get provider names
    let providerNames: Record<string, string> = {};
    if (!providerId) {
      try {
        const unitsRaw = await sbRPC(apiUrl, "getUnitList", [], headers);
        for (const [id, p] of Object.entries(unitsRaw || {}) as any[]) {
          providerNames[String(id)] = p.name || `Provider ${id}`;
        }
      } catch {
        // Non-fatal
      }
    }

    const availability: Record<string, any> = {};

    for (const date of sortedDates) {
      const dateProviders: any[] = [];
      const allSlots = new Set<string>();

      for (const { providerId: pid, dateSlots } of providerResults) {
        const slots = dateSlots[date] || [];
        if (slots.length > 0) {
          dateProviders.push({
            id: pid,
            name: providerNames[pid] || `Provider ${pid}`,
            slots,
          });
          slots.forEach((s: string) => allSlots.add(s));
        }
      }

      availability[date] = {
        hasAvailability: dateProviders.length > 0,
        totalSlots: allSlots.size,
        providers: dateProviders,
        // Merged slots across all providers (for "any provider" mode)
        allSlots: [...allSlots].sort(),
      };
    }

    // Summary: which dates have availability
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
