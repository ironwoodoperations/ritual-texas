import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// In-memory cache with 5-minute TTL (services change infrequently)
let servicesCache: { data: any; expiresAt: number } | null = null;

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

Deno.serve(async (req) => {
  // No auth check — guest-safe endpoint (read-only)
  try {
    // Return cached if fresh
    if (servicesCache && Date.now() < servicesCache.expiresAt) {
      return Response.json(servicesCache.data);
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

    // Fetch services and providers in parallel
    const [servicesRaw, unitsRaw] = await Promise.all([
      sbRPC(apiUrl, "getEventList", [], headers),
      sbRPC(apiUrl, "getUnitList", [], headers),
    ]);

    const servicesMap = (typeof servicesRaw === "object" && !Array.isArray(servicesRaw)) ? servicesRaw : {};
    const unitsMap = (typeof unitsRaw === "object" && !Array.isArray(unitsRaw)) ? unitsRaw : {};

    // Build provider lookup
    const providers: Record<string, any> = {};
    for (const [id, p] of Object.entries(unitsMap) as any[]) {
      if (p.is_visible === false) continue;
      providers[String(id)] = {
        id: String(id),
        name: p.name || `Provider ${id}`,
        phone: p.phone || "",
        position: p.position || "",
        description: p.description || "",
        picture: p.picture || p.picture_path || "",
      };
    }

    // Build services list — only active + public
    const services = Object.entries(servicesMap)
      .filter(([, svc]: any) => svc.is_active && svc.is_public)
      .map(([svcId, svc]: any) => {
        // Map providers for this service
        // unit_map can be an array [1,2,3], an object {"1":"1","2":"2"}, or empty/null
        let providerIds: string[];
        if (Array.isArray(svc.unit_map) && svc.unit_map.length > 0) {
          providerIds = svc.unit_map.map(String);
        } else if (svc.unit_map && typeof svc.unit_map === 'object' && Object.keys(svc.unit_map).length > 0) {
          providerIds = Object.keys(svc.unit_map).map(String);
        } else {
          providerIds = [];
        }

        const serviceProviders = providerIds
          .filter((pid: string) => providers[pid])
          .map((pid: string) => providers[pid]);

        return {
          id: String(svcId),
          name: svc.name || "",
          duration: Number(svc.duration || 60),
          price: Number(svc.price || 0),
          description: svc.description || "",
          category: svc.categories || [],
          picture: svc.picture || svc.picture_path || "",
          position: Number(svc.position || 0),
          providers: serviceProviders,
          providerIds,
        };
      })
      .sort((a, b) => a.position - b.position);

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
