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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Fetch Cloudbeds room types and SimplyBook services in parallel
    const [accessToken, propertyId] = await Promise.all([
      getAnySetting(base44, ["CLOUDBEDS_ACCESS_TOKEN", "cloudbeds_access_token"]),
      getAnySetting(base44, ["CLOUDBEDS_PROPERTY_ID", "cloudbeds_property_id"]).then(v => v || Deno.env.get("CLOUDBEDS_PROPERTY_ID")),
    ]);

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";

    const [cbResult, sbResult, dbTreatments] = await Promise.all([
      // Cloudbeds room types
      (async () => {
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
          return { roomTypes };
        } catch (e) {
          return { roomTypes: [], error: e.message };
        }
      })(),

      // SimplyBook services
      (async () => {
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
          return {
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
        } catch (e) {
          return { services: [], staff: [], error: e.message };
        }
      })(),

      // DB treatments as fallback
      base44.asServiceRole.entities.Treatment.list("sort_order", 100).catch(() => []),
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