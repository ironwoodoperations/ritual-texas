import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// SimplyBook JSON-RPC auth then availability fetch
async function sbRPC(url, method, params, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await resp.json();
  return json?.result ?? json;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { date } = await req.json();
    if (!date) return Response.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });

    // Check cache first (2 min TTL for availability)
    const cacheKey = `simplybook:availability:${date}`;
    try {
      const cacheRows = await base44.asServiceRole.entities.ApiCache.filter({ cache_key: cacheKey });
      const cacheRow = cacheRows?.[0];
      if (cacheRow && new Date(cacheRow.expires_at) > new Date()) {
        return Response.json(JSON.parse(cacheRow.payload));
      }
    } catch { /* non-fatal, proceed to API */ }

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const userLogin = Deno.env.get("SIMPLYBOOK_USER_LOGIN") || Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const userPassword = Deno.env.get("SIMPLYBOOK_USER_PASSWORD") || Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";
    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";

    if (!company) {
      return Response.json({ error: "SIMPLYBOOK_COMPANY_LOGIN not set" }, { status: 500 });
    }

    // Step 1: get token — try user token first (admin), fall back to API key token
    const loginUrl = "https://user-api.simplybook.me/login";
    let token = null;

    if (userLogin && userPassword) {
      const result = await sbRPC(loginUrl, "getUserToken", [company, userLogin, userPassword]);
      if (result && typeof result === "string") token = result;
    }

    if (!token && apiKey) {
      const result = await sbRPC(loginUrl, "getToken", [company, apiKey]);
      token = typeof result === "string" ? result : result?.token || null;
    }

    if (!token) {
      return Response.json({ error: "Failed to get SimplyBook token — check credentials" }, { status: 500 });
    }

    const apiUrl = "https://user-api.simplybook.me";
    const sbHeaders = { "X-Company-Login": company, "X-User-Token": token, "X-Token": token };

    // Step 2: get services and performers in parallel
    const [services, performers] = await Promise.all([
      sbRPC(apiUrl, "getEventList", [], sbHeaders),
      sbRPC(apiUrl, "getUnitList", [], sbHeaders),
    ]);

    const servicesMap = typeof services === "object" && !Array.isArray(services) ? services : {};
    const performersMap = typeof performers === "object" && !Array.isArray(performers) ? performers : {};

    // Build performer lookup by id
    const performerById = {};
    for (const [id, p] of Object.entries(performersMap)) {
      performerById[String(id)] = p;
    }

    // Build list of active/public services with their unit IDs
    const activeServices = Object.entries(servicesMap)
      .filter(([, svc]) => svc.is_active && svc.is_public)
      .map(([svcId, svc]) => {
        let unitId = null;
        if (svc.unit_map && svc.unit_map.length > 0) {
          unitId = String(svc.unit_map[0]);
        } else {
          const firstPerf = Object.keys(performersMap)[0];
          if (firstPerf) unitId = String(firstPerf);
        }
        return { svcId, svc, unitId };
      });

    // Fetch all slot matrices in parallel
    const slotResults = await Promise.all(
      activeServices.map(async ({ svcId, unitId }) => {
        try {
          const matrix = await sbRPC(apiUrl, "getStartTimeMatrix", [date, date, svcId, unitId, 1], sbHeaders);
          if (matrix && typeof matrix === "object" && matrix[date]) {
            const slots = Array.isArray(matrix[date]) ? matrix[date] : Object.values(matrix[date]);
            return { svcId, slots };
          }
        } catch {
          // ignore
        }
        return { svcId, slots: [] };
      })
    );

    const slotMap = {};
    for (const { svcId, slots } of slotResults) slotMap[svcId] = slots;

    const results = activeServices
      .filter(({ svcId }) => slotMap[svcId]?.length > 0)
      .map(({ svcId, svc, unitId }) => ({
        id: String(svcId),
        name: svc.name || "",
        duration: Number(svc.duration || 60),
        price: Number(svc.price || 0),
        staffId: unitId,
        staffName: unitId ? (performerById[unitId]?.name || "") : "",
        slots: slotMap[svcId],
      }));

    return Response.json({ services: results, date });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});