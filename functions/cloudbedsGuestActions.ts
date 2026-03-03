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
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Token refresh failed: ${text}`);
  const json = JSON.parse(text);
  const newAccess = json?.access_token || json?.data?.access_token;
  const newRefresh = json?.refresh_token || json?.data?.refresh_token || storedRefresh;
  if (!newAccess) throw new Error('No access_token in refresh response');
  await upsertSetting(base44, 'CLOUDBEDS_ACCESS_TOKEN', newAccess);
  await upsertSetting(base44, 'CLOUDBEDS_REFRESH_TOKEN', newRefresh);
  return newAccess;
}

async function callCloudbeds(endpoint, method, params, token, propertyId) {
  const url = `https://hotels.cloudbeds.com/api/v1.1/${endpoint}`;
  const body = new URLSearchParams({ propertyID: propertyId, ...params });
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, json: JSON.parse(text) };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, reservationID, amount } = await req.json();
    // action: 'checkin' | 'checkout' | 'payment'
    // amount: only for payment

    if (!action || !reservationID) {
      return Response.json({ error: 'Missing action or reservationID' }, { status: 400 });
    }

    let accessToken = await getSettingValue(base44, 'CLOUDBEDS_ACCESS_TOKEN');
    const propertyId = await getSettingValue(base44, 'CLOUDBEDS_PROPERTY_ID');

    if (!accessToken || !propertyId) {
      return Response.json({ success: false, error: 'Cloudbeds not configured.' });
    }

    let result;

    if (action === 'checkin') {
      result = await callCloudbeds('postCheckIn', 'POST', { reservationID }, accessToken, propertyId);
      if (!result.ok && (result.status === 401 || result.status === 403)) {
        accessToken = await refreshToken(base44);
        result = await callCloudbeds('postCheckIn', 'POST', { reservationID }, accessToken, propertyId);
      }
    } else if (action === 'checkout') {
      result = await callCloudbeds('postCheckOut', 'POST', { reservationID }, accessToken, propertyId);
      if (!result.ok && (result.status === 401 || result.status === 403)) {
        accessToken = await refreshToken(base44);
        result = await callCloudbeds('postCheckOut', 'POST', { reservationID }, accessToken, propertyId);
      }
    } else if (action === 'payment') {
      if (!amount) return Response.json({ error: 'Missing amount for payment' }, { status: 400 });
      result = await callCloudbeds('postPayment', 'POST', {
        reservationID,
        amount: String(amount),
        type: 'Cash',
        description: 'Admin payment via dashboard',
      }, accessToken, propertyId);
      if (!result.ok && (result.status === 401 || result.status === 403)) {
        accessToken = await refreshToken(base44);
        result = await callCloudbeds('postPayment', 'POST', {
          reservationID,
          amount: String(amount),
          type: 'Cash',
          description: 'Admin payment via dashboard',
        }, accessToken, propertyId);
      }
    } else {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (!result.ok) {
      return Response.json({ success: false, error: `Cloudbeds error ${result.status}`, detail: result.json });
    }

    if (!result.json?.success) {
      return Response.json({ success: false, error: result.json?.message || 'API error', detail: result.json });
    }

    return Response.json({ success: true, data: result.json?.data || result.json });

  } catch (e) {
    return Response.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
});