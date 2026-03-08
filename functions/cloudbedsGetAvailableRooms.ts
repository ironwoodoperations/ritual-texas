import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function getSettingValue(base44, key) {
  const rows = await base44.asServiceRole.entities.SiteSettings.filter({ key });
  return rows.length ? rows[0].value : null;
}

async function upsertSetting(base44, key, value) {
  const rows = await base44.asServiceRole.entities.SiteSettings.filter({ key });
  if (rows.length) {
    await base44.asServiceRole.entities.SiteSettings.update(rows[0].id, { value });
  } else {
    await base44.asServiceRole.entities.SiteSettings.create({ key, value });
  }
}

async function refreshToken(base44) {
  const storedRefresh = await getSettingValue(base44, 'CLOUDBEDS_REFRESH_TOKEN');
  if (!storedRefresh) throw new Error('Missing CLOUDBEDS_REFRESH_TOKEN');
  const clientId = Deno.env.get('CLOUDBEDS_CLIENT_ID');
  const clientSecret = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');
  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);
  form.set('refresh_token', storedRefresh);
  const resp = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const json = await resp.json();
  const newAccess = json?.access_token || json?.data?.access_token;
  const newRefresh = json?.refresh_token || json?.data?.refresh_token || storedRefresh;
  if (!newAccess) throw new Error('No access_token in refresh response');
  await upsertSetting(base44, 'CLOUDBEDS_ACCESS_TOKEN', newAccess);
  await upsertSetting(base44, 'CLOUDBEDS_REFRESH_TOKEN', newRefresh);
  return newAccess;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return Response.json({ success: false, error: 'startDate and endDate required' }, { status: 400 });
    }

    let accessToken = await getSettingValue(base44, 'CLOUDBEDS_ACCESS_TOKEN');
    const propertyId = Deno.env.get('CLOUDBEDS_PROPERTY_ID') || await getSettingValue(base44, 'CLOUDBEDS_PROPERTY_ID');

    if (!accessToken || !propertyId) {
      return Response.json({ success: false, error: 'Cloudbeds not configured. Please connect first.' });
    }

    const doFetch = async (token) => {
      const params = new URLSearchParams({ propertyID: propertyId, startDate, endDate });
      const resp = await fetch(`https://hotels.cloudbeds.com/api/v1.1/getAvailableRoomTypes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { ok: resp.ok, status: resp.status, json: await resp.json() };
    };

    let result = await doFetch(accessToken);
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      accessToken = await refreshToken(base44);
      result = await doFetch(accessToken);
    }

    if (!result.json?.success) {
      return Response.json({ success: false, error: result.json?.message || 'Cloudbeds API error', raw: result.json });
    }

    // Log the first item to inspect real field names
    const rawData = result.json?.data || [];
    console.log('RAW FIRST ROOM:', JSON.stringify(rawData[0], null, 2));

    const rooms = rawData.map(rt => ({
      roomTypeID: String(rt.roomTypeID || rt.id || rt.room_type_id || Object.keys(rt)[0]),
      name: rt.roomTypeName || rt.name || rt.title || rt.roomName,
      maxOccupancy: rt.maxOccupancy || rt.max_occupancy,
      price: rt.totalRate || rt.total_rate || rt.price || rt.rate,
    }));

    return Response.json({ success: true, rooms, _raw_keys: rawData[0] ? Object.keys(rawData[0]) : [] });
  } catch (e) {
    return Response.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
});