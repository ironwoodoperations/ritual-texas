import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

let servicesCache = null;

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

Deno.serve(async (req) => {
  try {
    if (servicesCache && Date.now() < servicesCache.expiresAt) {
      return Response.json(servicesCache.data);
    }

    const userId = Deno.env.get("ACUITY_USER_ID") || "";
    const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
    if (!userId || !apiKey) {
      return Response.json({ error: "Acuity credentials not configured" }, { status: 500 });
    }

    const [appointmentTypes, calendars] = await Promise.all([
      acuityGet("/appointment-types"),
      acuityGet("/calendars"),
    ]);

    // TEMP DIAGNOSTIC — remove in cleanup pass once verified. Logs each appointment
    // type's calendarIDs so we can confirm in Base44 function logs whether this
    // account actually populates calendarIDs per type.
    console.log("acuity-type-calendarIDs", JSON.stringify(appointmentTypes.map((at) => ({
      id: at.id, name: at.name, calendarIDs: at.calendarIDs,
    }))));

    const providers = {};
    for (const cal of calendars) {
      providers[String(cal.id)] = {
        id: String(cal.id),
        name: cal.name || `Provider ${cal.id}`,
        picture: cal.image || "",
      };
    }

    const services = appointmentTypes.map((at) => {
      // Acuity returns each appointment type's authoritative provider assignment in
      // `calendarIDs` (array of numbers). Filter the global providers map down to those.
      // The providers map is keyed by String(cal.id), so String()-normalize each id.
      const calendarIDs = Array.isArray(at.calendarIDs) ? at.calendarIDs : [];
      let svcProviders = calendarIDs
        .map((cid) => providers[String(cid)]) // numbers → String to match map keys
        .filter(Boolean);                      // drop ids not present in /calendars

      // FALLBACK: if calendarIDs is missing/empty (unconfigured type) or filtered to
      // nothing, preserve the original behavior (all providers) so nothing breaks.
      if (svcProviders.length === 0) {
        svcProviders = Object.values(providers);
      }

      return {
        id: String(at.id),
        name: at.name || "",
        duration: Number(at.duration || 60),
        price: Number(at.price || 0),
        description: at.description || "",
        private: Boolean(at.private),
        providers: svcProviders,
        providerIds: svcProviders.map((p) => p.id), // already String-normalized
      };
    });

    const result = {
      services,
      providers: Object.values(providers),
      totalServices: services.length,
      totalProviders: Object.keys(providers).length,
    };

    servicesCache = { data: result, expiresAt: Date.now() + 5 * 60 * 1000 };
    return Response.json(result);
  } catch (e) {
    console.error("acuityGuestGetServices error:", e);
    return Response.json({ error: e.message || "Failed to fetch services" }, { status: 500 });
  }
});