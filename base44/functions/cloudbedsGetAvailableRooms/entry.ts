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

async function getCache(base44, cacheKey) {
  try {
    const rows = await base44.asServiceRole.entities.ApiCache.filter({ cache_key: cacheKey });
    const row = rows?.[0];
    if (!row) return null;
    if (new Date(row.expires_at) < new Date()) return null;
    return JSON.parse(row.payload);
  } catch { return null; }
}

async function setCache(base44, cacheKey, sourceSystem, endpoint, payload, ttlMinutes) {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const rows = await base44.asServiceRole.entities.ApiCache.filter({ cache_key: cacheKey });
    const data = { source_system: sourceSystem, endpoint, cache_key: cacheKey, payload: JSON.stringify(payload), expires_at: expiresAt, last_synced: new Date().toISOString() };
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
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return Response.json({ success: false, error: 'startDate and endDate required' }, { status: 400 });
    }

    // Check cache first (5 min TTL for availability)
    const cacheKey = `cloudbeds:availability:${startDate}:${endDate}`;
    const cached = await getCache(base44, cacheKey);
    if (cached) return Response.json(cached);

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
      return Response.json({ success: false, error: result.json?.message || 'Cloudbeds API error' });
    }

    // data is an array of property objects, each containing propertyRooms
    const dataArr = result.json?.data || [];
    const allRooms = dataArr.flatMap(p => p.propertyRooms || []);

    // Log raw rate data for the first room
    if (allRooms.length > 0) {
      const room = allRooms[0];
      console.log('RAW RATE DATA:', JSON.stringify({
        ratePlan: room.ratePlan,
        rates: room.rates,
        totalRate: room.totalRate,
        baseRate: room.baseRate,
        ratePlans: room.ratePlans,
        roomTypeName: room.roomTypeName,
      }, null, 2));
    }

    // Extract price from a room object, trying multiple Cloudbeds API paths
    function extractPrice(rt) {
      const candidates = [
        rt.ratePlan?.roomRate,
        ...(rt.rates || []).map(r => r.rate),
        rt.totalRate,
        rt.baseRate,
      ];
      // Also check ratePlans array (legacy path)
      for (const rp of (rt.ratePlans || [])) {
        const t = rp.totalRate ?? rp.roomRates?.[0]?.totalRate;
        candidates.push(t?.amount ?? t);
      }
      for (const c of candidates) {
        const val = parseFloat(c);
        if (val > 0) return val;
      }
      return null;
    }

    // Deduplicate by roomTypeID, pick best price
    const roomMap = {};
    for (const rt of allRooms) {
      const id = String(rt.roomTypeID);
      const price = extractPrice(rt);
      if (!roomMap[id] || (price !== null && roomMap[id].price === null)) {
        roomMap[id] = {
          roomTypeID: id,
          name: rt.roomTypeName,
          maxOccupancy: parseInt(rt.maxGuests) || null,
          price,
        };
      }
    }

    const finalResult = { success: true, rooms: Object.values(roomMap) };
    await setCache(base44, cacheKey, "cloudbeds", "availability", finalResult, 5); // 5 min TTL
    return Response.json(finalResult);


  } catch (e) {
    return Response.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
});