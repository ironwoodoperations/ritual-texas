import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function readKey(base44, entityName, key) {
  try {
    const rows = await base44.asServiceRole.entities[entityName].filter({ key });
    return rows?.[0]?.value ?? null;
  } catch { return null; }
}

async function getAnySetting(base44, keys) {
  for (const key of keys) {
    const v = (await readKey(base44, "SiteSettings", key)) ?? (await readKey(base44, "AppSetting", key)) ?? null;
    if (v) return v;
  }
  return null;
}

// Cache helpers
async function getCache(base44, cacheKey) {
  try {
    const rows = await base44.asServiceRole.entities.ApiCache.filter({ cache_key: cacheKey });
    const row = rows?.[0];
    if (!row) return null;
    if (new Date(row.expires_at) < new Date()) return null; // expired
    return JSON.parse(row.payload);
  } catch { return null; }
}

async function setCache(base44, cacheKey, sourceSystem, endpoint, payload, ttlMinutes) {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const rows = await base44.asServiceRole.entities.ApiCache.filter({ cache_key: cacheKey });
    const data = {
      source_system: sourceSystem,
      endpoint,
      cache_key: cacheKey,
      payload: JSON.stringify(payload),
      expires_at: expiresAt,
      last_synced: new Date().toISOString(),
    };
    if (rows?.[0]) {
      await base44.asServiceRole.entities.ApiCache.update(rows[0].id, data);
    } else {
      await base44.asServiceRole.entities.ApiCache.create(data);
    }
  } catch { /* non-fatal */ }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const [accessToken, propertyId] = await Promise.all([
      getAnySetting(base44, ["CLOUDBEDS_ACCESS_TOKEN", "cloudbeds_access_token"]),
      getAnySetting(base44, ["CLOUDBEDS_PROPERTY_ID", "cloudbeds_property_id"]).then(v => v || Deno.env.get("CLOUDBEDS_PROPERTY_ID")),
    ]);

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";

    // Try cache first for both, then fetch in parallel if needed
    const CB_KEY = "cloudbeds:room_types:all";
    const SB_KEY = "simplybook:services_staff:all";

    const [cachedCb, cachedSb, dbTreatments] = await Promise.all([
      getCache(base44, CB_KEY),
      getCache(base44, SB_KEY),
      base44.asServiceRole.entities.Treatment.list("sort_order", 100).catch(() => []),
    ]);

    // Fetch from APIs only if cache miss
    const [cbResult, sbResult] = await Promise.all([
      cachedCb ? Promise.resolve(cachedCb) : (async () => {
        if (!accessToken || !propertyId) return { roomTypes: [], error: "Cloudbeds not connected" };
        try {
          const resp = await fetch(`https://hotels.cloudbeds.com/api/v1.1/getRoomTypes?propertyID=${propertyId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const json = await resp.json();
          const roomTypes = (json?.data || []).map(rt => ({
            id: String(rt.roomTypeID),
            name: rt.roomTypeName,
            maxOccupancy: rt.maxGuests || 2,
          }));
          const result = { roomTypes };
          await setCache(base44, CB_KEY, "cloudbeds", "room_types", result, 24 * 60); // 24h TTL
          return result;
        } catch (e) {
          return { roomTypes: [], error: e.message };
        }
      })(),

      cachedSb ? Promise.resolve(cachedSb) : (async () => {
        if (!apiKey || !company) return { services: [], staff: [], error: "SimplyBook not configured" };
        try {
          const base = `https://user-api.simplybook.me/api/v3/${company}`;
          const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
          const [svcResp, staffResp] = await Promise.all([
            fetch(`${base}/services`, { headers }),
            fetch(`${base}/staff`, { headers }),
          ]);
          const services = await svcResp.json();
          const staff = await staffResp.json();
          const result = {
            services: Array.isArray(services) ? services.map(s => ({
              id: String(s.id || s.service_id),
              name: s.name,
              duration: s.duration,
              price: s.price,
            })) : [],
            staff: Array.isArray(staff) ? staff.map(s => ({
              id: String(s.id || s.staff_id),
              name: s.name,
            })) : [],
          };
          await setCache(base44, SB_KEY, "simplybook", "services_staff", result, 24 * 60); // 24h TTL
          return result;
        } catch (e) {
          return { services: [], staff: [], error: e.message };
        }
      })(),
    ]);

    return Response.json({
      cloudbeds: cbResult,
      simplybook: sbResult,
      dbTreatments: dbTreatments.filter(t => t.is_available !== false).map(t => ({
        id: t.id,
        name: t.name,
        duration: t.duration_minutes,
        price: t.price,
      })),
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});