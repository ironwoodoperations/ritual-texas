import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// In-memory cache with 5-minute TTL (services change infrequently)
let servicesCache: { data: any; expiresAt: number } | null = null;

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

Deno.serve(async (req) => {
  // No auth check — guest-safe endpoint (read-only)
  try {
    // Return cached if fresh
    if (servicesCache && Date.now() < servicesCache.expiresAt) {
      return Response.json(servicesCache.data);
    }

    const userId = Deno.env.get("ACUITY_USER_ID") || "";
    const apiKey = Deno.env.get("ACUITY_API_KEY") || "";

    if (!userId || !apiKey) {
      return Response.json({ error: "Acuity credentials not configured" }, { status: 500 });
    }

    // Fetch appointment types and calendars in parallel
    const [appointmentTypes, calendars]: [any[], any[]] = await Promise.all([
      acuityGet("/appointment-types"),
      acuityGet("/calendars"),
    ]);

    // Build provider lookup from calendars
    const providers: Record<string, any> = {};
    for (const cal of calendars) {
      providers[String(cal.id)] = {
        id: String(cal.id),
        name: cal.name || `Provider ${cal.id}`,
        phone: "",
        position: "",
        description: "",
        picture: cal.image || "",
      };
    }

    // Build services list — include all types, mark private flag
    // Guest-facing pages will filter out private ones
    const services = appointmentTypes.map((at: any) => ({
      id: String(at.id),
      name: at.name || "",
      duration: Number(at.duration || 60),
      price: Number(at.price || 0),
      description: at.description || "",
      category: at.category || [],
      picture: at.image || "",
      position: Number(at.sortOrder || 0),
      private: Boolean(at.private),
      // All calendars are potential providers for any appointment type
      providers: Object.values(providers),
      providerIds: Object.keys(providers),
    }));

    const result = {
      services,
      providers: Object.values(providers),
      totalServices: services.length,
      totalProviders: Object.keys(providers).length,
    };

    // Cache for 5 minutes
    servicesCache = { data: result, expiresAt: Date.now() + 5 * 60 * 1000 };

    return Response.json(result);
  } catch (e: any) {
    console.error("guestGetServices error:", e);
    return Response.json({ error: e.message || "Failed to fetch services" }, { status: 500 });
  }
});
