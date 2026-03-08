import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function getSettingValue(base44, key) {
  const rows = await base44.asServiceRole.entities.SiteSettings.filter({ key });
  return rows.length ? rows[0].value : null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const accessToken = await getSettingValue(base44, 'CLOUDBEDS_ACCESS_TOKEN');
  const propertyId = Deno.env.get('CLOUDBEDS_PROPERTY_ID');

  const url = `https://hotels.cloudbeds.com/api/v1.1/getReservations?propertyID=${propertyId}&checkInFrom=2026-03-01&checkInTo=2026-03-15&pageSize=2&pageNumber=1`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await resp.json();
  // Return first reservation raw so we can see the shape
  return Response.json({ raw: json?.data?.[0] ?? json });
});