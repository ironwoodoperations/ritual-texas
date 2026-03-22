import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { date } = await req.json();
    if (!date) return Response.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });

    // Cache with 2-min TTL — key includes date and v2 to bust old cache shape
    const cacheKey = `simplybook:availability:v2:${date}`;
    try {
      const cacheRows = await base44.asServiceRole.entities.ApiCache.filter({ cache_key: cacheKey });
      const cacheRow = cacheRows?.[0];
      if (cacheRow && new Date(cacheRow.expires_at) > new Date()) {
        return Response.json(JSON.parse(cacheRow.payload));
      }
    } catch { /* non-fatal */ }

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const apiKey  = Deno.env.get("SIMPLYBOOK_API_KEY") || "";

    if (!company || !apiKey) {
      return Response.json({ error: "SIMPLYBOOK_COMPANY_LOGIN / SIMPLYBOOK_API_KEY not set" }, { status: 500 });
    }

    const loginUrl = "https://user-api.simplybook.me/login";
    const apiUrl   = "https://user-api.simplybook.me";

    const token = await sbRPC(loginUrl, "getToken", [company, apiKey]);
    if (!token || typeof token !== "string") {
      return Response.json({ error: "SimplyBook auth failed" }, { status: 500 });
    }
    const headers = { "X-Company-Login": company, "X-Token": token, "X-User-Token": token };

    // Load services and performers
    const [servicesRaw, performersRaw] = await Promise.all([
      sbRPC(apiUrl, "getEventList", [], headers),
      sbRPC(apiUrl, "getUnitList", [], headers),
    ]);

    const servicesMap   = (typeof servicesRaw === "object" && !Array.isArray(servicesRaw)) ? servicesRaw : {};
    const performersMap = (typeof performersRaw === "object" && !Array.isArray(performersRaw)) ? performersRaw : {};

    // Build performer lookup
    const performerById = {};
    for (const [id, p] of Object.entries(performersMap)) {
      performerById[String(id)] = p;
    }

    // Build list of active public services with ALL their provider IDs
    const activeServices = Object.entries(servicesMap)
      .filter(([, svc]) => svc.is_active && svc.is_public)
      .map(([svcId, svc]) => {
        const providerIds = Array.isArray(svc.unit_map) && svc.unit_map.length > 0
          ? svc.unit_map.map(String)
          : Object.keys(performersMap);
        return { svcId, svc, providerIds };
      });

    // For each service × provider combo, fetch availability in parallel
    const allCombos = [];
    for (const { svcId, svc, providerIds } of activeServices) {
      for (const providerId of providerIds) {
        allCombos.push({ svcId, svc, providerId });
      }
    }

    const comboResults = await Promise.all(
      allCombos.map(async ({ svcId, providerId }) => {
        try {
          const matrix = await sbRPC(
            apiUrl,
            "getStartTimeMatrix",
            [date, date, svcId, providerId, 1],
            headers
          );
          if (matrix && typeof matrix === "object" && matrix[date]) {
            const raw = matrix[date];
            const slots = (Array.isArray(raw) ? raw : Object.values(raw))
              .map(t => {
                const s = String(t).trim();
                if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
                if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
                return s;
              })
              .filter(Boolean);
            return { svcId, providerId, slots };
          }
        } catch {
          // Non-fatal: provider may not offer this service
        }
        return { svcId, providerId, slots: [] };
      })
    );

    // Group results: service → providers with slots
    const serviceProviderMap = {};
    for (const { svcId, providerId, slots } of comboResults) {
      if (!slots.length) continue;
      if (!serviceProviderMap[svcId]) serviceProviderMap[svcId] = [];
      serviceProviderMap[svcId].push({
        id: providerId,
        name: performerById[providerId]?.name || `Provider ${providerId}`,
        slots,
      });
    }

    // Build final response — only services with at least one available provider
    const results = activeServices
      .filter(({ svcId }) => serviceProviderMap[svcId]?.length > 0)
      .map(({ svcId, svc }) => ({
        id: String(svcId),
        name: svc.name || "",
        duration: Number(svc.duration || 60),
        price: Number(svc.price || 0),
        providers: serviceProviderMap[svcId],
      }));

    const finalResult = { services: results, date };

    // Write to cache
    try {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      const cacheRows = await base44.asServiceRole.entities.ApiCache.filter({ cache_key: cacheKey });
      const cacheData = {
        source_system: "simplybook",
        endpoint: "availability_v2",
        cache_key: cacheKey,
        payload: JSON.stringify(finalResult),
        expires_at: expiresAt,
        last_synced: new Date().toISOString(),
      };
      if (cacheRows?.[0]) {
        await base44.asServiceRole.entities.ApiCache.update(cacheRows[0].id, cacheData);
      } else {
        await base44.asServiceRole.entities.ApiCache.create(cacheData);
      }
    } catch { /* non-fatal */ }

    return Response.json(finalResult);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});