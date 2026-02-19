import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getSetting(base44, key) {
  const rows = await base44.asServiceRole.entities.SiteSettings.filter({ key });
  return rows.length ? rows[0] : null;
}

async function getSettingValue(base44, key) {
  const row = await getSetting(base44, key);
  return row ? row.value : null;
}

async function upsertSetting(base44, key, value) {
  const row = await getSetting(base44, key);
  if (row) {
    await base44.asServiceRole.entities.SiteSettings.update(row.id, { value });
  } else {
    await base44.asServiceRole.entities.SiteSettings.create({ key, value });
  }
}

function isTokenInvalid(bodyText) {
  const t = (bodyText || '').toLowerCase();
  return (
    t.includes('access token could not be verified') ||
    t.includes('invalid token') ||
    t.includes('token expired') ||
    t.includes('unauthorized')
  );
}

async function refreshCloudbedsAccessToken(base44) {
  const refreshToken = await getSettingValue(base44, 'CLOUDBEDS_REFRESH_TOKEN');
  if (!refreshToken) throw new Error('Missing CLOUDBEDS_REFRESH_TOKEN — please re-authorize Cloudbeds.');

  // Use the existing secrets (Client_ID and Client_Secret are already set)
  const clientId = Deno.env.get('CLOUDBEDS_CLIENT_ID');
  const clientSecret = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing CLOUDBEDS_CLIENT_ID / CLOUDBEDS_CLIENT_SECRET in environment secrets.');
  }

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
  if (!resp.ok) {
    throw new Error(`Cloudbeds token refresh failed (${resp.status}): ${text}`);
  }

  const json = JSON.parse(text);
  const newAccess = json?.access_token || json?.data?.access_token;
  const newRefresh = json?.refresh_token || json?.data?.refresh_token || refreshToken;
  const expiresIn = json?.expires_in || json?.data?.expires_in || 3600;

  if (!newAccess) throw new Error(`Refresh succeeded but no access_token in response: ${text}`);

  const expiryIso = new Date(Date.now() + Number(expiresIn) * 1000).toISOString();

  await upsertSetting(base44, 'CLOUDBEDS_ACCESS_TOKEN', newAccess);
  await upsertSetting(base44, 'CLOUDBEDS_REFRESH_TOKEN', newRefresh);
  await upsertSetting(base44, 'CLOUDBEDS_TOKEN_EXPIRY', expiryIso);

  return newAccess;
}

async function callGetReservation(accessToken, propertyId, reservationId) {
  const requestUrl =
    `https://hotels.cloudbeds.com/api/v1.1/getReservation?propertyID=${encodeURIComponent(propertyId)}` +
    `&reservationID=${encodeURIComponent(reservationId)}`;

  const resp = await fetch(requestUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const bodyText = await resp.text();
  return { ok: resp.ok, status: resp.status, bodyText, requestUrl };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Support both body and query params
    let reservationID, contact;
    const url = new URL(req.url);

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        // base44.functions.invoke wraps params under a "payload" key
        const params = body.payload || body;
        reservationID = params.confirmation;
        contact = params.contact;
      } catch (_) {}
    }

    reservationID = reservationID || url.searchParams.get('confirmation');
    contact = contact || url.searchParams.get('contact');

    if (!reservationID || !contact) {
      return Response.json({ success: false, error: 'Missing confirmation and/or contact' }, { status: 200 });
    }

    let accessToken = await getSettingValue(base44, 'CLOUDBEDS_ACCESS_TOKEN');
    const propertyId = await getSettingValue(base44, 'CLOUDBEDS_PROPERTY_ID');

    if (!accessToken) {
      return Response.json({ success: false, error: 'No CLOUDBEDS_ACCESS_TOKEN found. Re-authorize Cloudbeds.' }, { status: 200 });
    }
    if (!propertyId) {
      return Response.json({ success: false, error: 'Missing CLOUDBEDS_PROPERTY_ID in SiteSettings.' }, { status: 200 });
    }

    // 1) Try with current token
    let result = await callGetReservation(accessToken, propertyId, reservationID);

    // 2) If expired/invalid, auto-refresh and retry once
    if (!result.ok && (result.status === 401 || result.status === 403 || isTokenInvalid(result.bodyText))) {
      accessToken = await refreshCloudbedsAccessToken(base44);
      result = await callGetReservation(accessToken, propertyId, reservationID);
    }

    if (!result.ok) {
      return Response.json({
        success: false,
        step: 'getReservation',
        upstreamStatus: result.status,
        requestUrl: result.requestUrl,
        upstreamBody: result.bodyText,
      }, { status: 200 });
    }

    const resJson = JSON.parse(result.bodyText);
    const reservation = resJson?.data;

    // Contact match check (email or phone)
    const guestEmail = (reservation?.guestEmail || '').toLowerCase();
    const guestPhone = (reservation?.guestPhone || '').replace(/\D/g, '');
    const contactLower = contact.toLowerCase();
    const contactDigits = contact.replace(/\D/g, '');

    if (guestEmail !== contactLower && guestPhone !== contactDigits) {
      return Response.json({ success: false, error: 'Contact does not match reservation.' }, { status: 200 });
    }

    const assignedRoom = reservation?.assigned?.[0];
    const roomDisplay = assignedRoom?.roomName || assignedRoom?.roomTypeName || reservation?.roomTypeName || 'Assigned at check-in';

    return Response.json({
      success: true,
      reservation: {
        reservationID: reservation?.reservationID,
        guestName: reservation?.guestName,
        guestEmail: reservation?.guestEmail,
        guestPhone: reservation?.guestPhone,
        checkIn: reservation?.startDate,
        checkOut: reservation?.endDate,
        roomType: reservation?.roomTypeName,
        roomNumber: roomDisplay,
        status: reservation?.status,
        totalAmount: reservation?.balance,
      },
    }, { status: 200 });

  } catch (e) {
    return Response.json({ success: false, error: String(e?.message || e) }, { status: 200 });
  }
});