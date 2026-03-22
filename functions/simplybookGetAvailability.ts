import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// In-memory cache with 2-minute TTL
const cache = new Map();

async function sbRPC(url, method, params, headers = {}) {
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
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: true, message: "Admin only" }, { status: 403 });

    const { date } = await req.json();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: true, message: "date required (YYYY-MM-DD)" }, { status: 400 });
    }

    // Check in-memory cache
    const cached = cache.get(date);
    if (cached && Date.now() < cached.expiresAt) {
      return Response.json(cached.data);
    }

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const apiKey  = Deno.env.get("SIMPLYBOOK_API_KEY") || "";

    if (!company || !apiKey) {
      return Response.json({ error: true, message: "SIMPLYBOOK_COMPANY_LOGIN / SIMPLYBOOK_API_KEY not set" }, { status: 500 });
    }

    const loginUrl = "https://user-api.simplybook.me/login";
    const apiUrl   = "https://user-api.simplybook.me";

    // Auth — read-only, use getToken only
    const token = await sbRPC(loginUrl, "getToken", [company, apiKey]);
    if (!token || typeof token !== "string") {
      return Response.json({ error: true, message: "SimplyBook auth failed" }, { status: 500 });
    }
    const headers = { "X-Company-Login": company, "X-Token": token, "X-User-Token": token };

    // Fetch services and providers in parallel
    const [servicesRaw, unitsRaw] = await Promise.all([
      sbRPC(apiUrl, "getEventList", [], headers),
      sbRPC(apiUrl, "getUnitList", [], headers),
    ]);

    const servicesMap = (typeof servicesRaw === "object" && !Array.isArray(servicesRaw)) ? servicesRaw : {};
    const unitsMap    = (typeof unitsRaw === "object" && !Array.isArray(unitsRaw)) ? unitsRaw : {};

    // Build provider lookup
    const providerById = {};
    for (const [id, p] of Object.entries(unitsMap)) {
      providerById[String(id)] = p;
    }

    // Build list of active public services with all their provider IDs
    const activeServices = Object.entries(servicesMap)
      .filter(([, svc]) => svc.is_active && svc.is_public)
      .map(([svcId, svc]) => {
        const providerIds = Array.isArray(svc.unit_map) && svc.unit_map.length > 0
          ? svc.unit_map.map(String)
          : Object.keys(unitsMap);
        return { svcId, svc, providerIds };
      });

    // Fire all service × provider availability calls in parallel
    const allCombos = [];
    for (const { svcId, svc, providerIds } of activeServices) {
      for (const providerId of providerIds) {
        allCombos.push({ svcId, svc, providerId });
      }
    }

    const comboResults = await Promise.all(
      allCombos.map(async ({ svcId, providerId }) => {
        try {
          const matrix = await sbRPC(apiUrl, "getStartTimeMatrix", [date, date, svcId, providerId, 1], headers);
          if (matrix && typeof matrix === "object" && matrix[date]) {
            const raw = matrix[date];
            const slots = (Array.isArray(raw) ? raw : Object.keys(raw))
              .map(t => {
                const s = String(t).trim();
                if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
                if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
                return null;
              })
              .filter(Boolean)
              .sort();
            return { svcId, providerId, slots };
          }
        } catch {
          // Non-fatal: provider may not offer this service
        }
        return { svcId, providerId, slots: [] };
      })
    );

    // Group: service → providers with slots
    const serviceProviderMap = {};
    for (const { svcId, providerId, slots } of comboResults) {
      if (!slots.length) continue;
      if (!serviceProviderMap[svcId]) serviceProviderMap[svcId] = [];
      serviceProviderMap[svcId].push({
        id: providerId,
        name: providerById[providerId]?.name || `Provider ${providerId}`,
        slots,
      });
    }

    // Build final response — only services with at least one available provider
    const services = activeServices
      .filter(({ svcId }) => serviceProviderMap[svcId]?.length > 0)
      .map(({ svcId, svc }) => ({
        id: String(svcId),
        name: svc.name || "",
        duration: Number(svc.duration || 60),
        price: Number(svc.price || 0),
        providers: serviceProviderMap[svcId],
      }));

    const result = { date, services };

    // Store in in-memory cache with 2-min TTL
    cache.set(date, { data: result, expiresAt: Date.now() + 2 * 60 * 1000 });

    return Response.json(result);

  } catch (e) {
    console.error("simplybookGetAvailability error:", e);
    return Response.json({ error: true, message: e.message || "SimplyBook availability fetch failed" }, { status: 500 });
  }
});