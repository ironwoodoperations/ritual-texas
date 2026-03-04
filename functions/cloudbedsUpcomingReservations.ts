import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
  const refreshToken = await getSettingValue(base44, 'CLOUDBEDS_REFRESH_TOKEN');
  if (!refreshToken) throw new Error('Missing CLOUDBEDS_REFRESH_TOKEN');

  const clientId = Deno.env.get('CLOUDBEDS_CLIENT_ID');
  const clientSecret = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');

  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);
  form.set('refresh_token', refreshToken);

  const resp = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Token refresh failed: ${text}`);

  const json = JSON.parse(text);
  const newAccess = json?.access_token || json?.data?.access_token;
  const newRefresh = json?.refresh_token || json?.data?.refresh_token || refreshToken;
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

    let accessToken = await getSettingValue(base44, 'CLOUDBEDS_ACCESS_TOKEN');
    const propertyId = await getSettingValue(base44, 'CLOUDBEDS_PROPERTY_ID');

    if (!accessToken || !propertyId) {
      return Response.json({ success: false, error: 'Cloudbeds not configured.' }, { status: 200 });
    }

    // Today's date as start, 30 days out as end (faster, enough for operations)
    const today = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const fmt = (d) => d.toISOString().slice(0, 10);

    const fetchReservations = async (token) => {
      const url =
        `https://hotels.cloudbeds.com/api/v1.1/getReservations` +
        `?propertyID=${encodeURIComponent(propertyId)}` +
        `&checkInFrom=${fmt(today)}` +
        `&checkInTo=${fmt(future)}` +
        `&pageSize=50` +
        `&pageNumber=1`;

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, text };
    };

    let result = await fetchReservations(accessToken);

    // Auto-refresh if expired
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      accessToken = await refreshToken(base44);
      result = await fetchReservations(accessToken);
    }

    if (!result.ok) {
      return Response.json({ success: false, error: `Cloudbeds error ${result.status}`, body: result.text }, { status: 200 });
    }

    const json = JSON.parse(result.text);
    if (!json?.success) {
      return Response.json({ success: false, error: json?.message || 'API error' }, { status: 200 });
    }

    const reservations = (json.data || []).map(r => {
      // Cloudbeds uses "assignment" for the specific room assigned
      const assignment = Array.isArray(r.assignment) ? r.assignment[0] : r.assignment;
      const roomName = assignment?.roomName || assignment?.roomTypeName || r.roomName || r.roomTypeName || '';
      const roomNumber = assignment?.roomID || assignment?.roomNumber || '';

      return {
        reservationID: r.reservationID,
        guestName: r.guestName,
        guestEmail: r.guestEmail,
        roomName,
        roomNumber,
        roomTypeName: r.roomTypeName || '',
        checkIn: r.startDate,
        checkOut: r.endDate,
        status: r.status,
        total: r.total,
        balance: r.balance,
        adults: r.adults,
        children: r.children,
      };
    });

    return Response.json({ success: true, reservations }, { status: 200 });

  } catch (e) {
    return Response.json({ success: false, error: String(e?.message || e) }, { status: 200 });
  }
});