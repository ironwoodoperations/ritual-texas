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
  if (!newAccess) throw new Error('No access_token in refresh response: ' + JSON.stringify(json));
  await upsertSetting(base44, 'CLOUDBEDS_ACCESS_TOKEN', newAccess);
  await upsertSetting(base44, 'CLOUDBEDS_REFRESH_TOKEN', newRefresh);
  return newAccess;
}

function fmt(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    // Allow scheduled calls or admin users
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch {
      isAuthorized = true; // scheduled call
    }
    if (!isAuthorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let accessToken = await getSettingValue(base44, 'CLOUDBEDS_ACCESS_TOKEN');
    const propertyId = Deno.env.get('CLOUDBEDS_PROPERTY_ID') || await getSettingValue(base44, 'CLOUDBEDS_PROPERTY_ID');

    if (!accessToken) return Response.json({ success: false, error: 'Cloudbeds not connected. Please complete OAuth setup.' });
    if (!propertyId) return Response.json({ success: false, error: 'CLOUDBEDS_PROPERTY_ID not set.' });

    // Fetch a window: 30 days back to 60 days forward to catch recent checkouts + upcoming
    const past = new Date();
    past.setDate(past.getDate() - 30);
    const future = new Date();
    future.setDate(future.getDate() + 60);

    const doFetchList = async (token, page = 1) => {
      const url = `https://hotels.cloudbeds.com/api/v1.1/getReservations` +
        `?propertyID=${encodeURIComponent(propertyId)}` +
        `&checkInFrom=${fmt(past)}&checkInTo=${fmt(future)}` +
        `&pageSize=100&pageNumber=${page}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return { ok: resp.ok, status: resp.status, json: await resp.json() };
    };

    const doFetchDetail = async (token, reservationID) => {
      const url = `https://hotels.cloudbeds.com/api/v1.1/getReservation?propertyID=${encodeURIComponent(propertyId)}&reservationID=${reservationID}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return resp.ok ? await resp.json() : null;
    };

    let result = await doFetchList(accessToken);
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      accessToken = await refreshToken(base44);
      result = await doFetchList(accessToken);
    }

    if (!result.ok || !result.json?.success) {
      return Response.json({ success: false, error: result.json?.message || `Cloudbeds error ${result.status}` });
    }

    const allReservations = result.json.data || [];

    // Also fetch page 2+ if total > 100
    const total = result.json.total || allReservations.length;
    if (total > 100) {
      const pages = Math.ceil(total / 100);
      for (let p = 2; p <= pages; p++) {
        const r2 = await doFetchList(accessToken, p);
        if (r2.ok && r2.json?.success) {
          allReservations.push(...(r2.json.data || []));
        }
      }
    }

    let upserted = 0;
    let errors = [];

    for (const r of allReservations) {
      try {
        // Fetch detail to get room name (list endpoint doesn't include room data)
        const detail = await doFetchDetail(accessToken, r.reservationID);
        const detailData = detail?.data || {};

        // Extract room from guestList (first main guest's room)
        let roomName = '';
        let roomId = '';
        let guestEmail = r.guestEmail || '';
        let guestPhone = '';
        const guestList = detailData.guestList || {};
        const mainGuest = Object.values(guestList).find(g => g.isMainGuest) || Object.values(guestList)[0];
        if (mainGuest) {
          roomName = mainGuest.roomName || mainGuest.roomTypeName || '';
          roomId = mainGuest.roomID || '';
          guestEmail = mainGuest.guestEmail || guestEmail;
          guestPhone = mainGuest.guestPhone || mainGuest.guestCellPhone || '';
        }

        const confirmationCode = String(r.reservationID || '');

        const bookingData = {
          confirmation_code: confirmationCode,
          guest_name: r.guestName || '',
          guest_email: guestEmail,
          guest_phone: guestPhone,
          room_id: roomId,
          room_name: roomName,
          check_in_date: r.startDate || '',
          check_out_date: r.endDate || '',
          num_guests: (parseInt(r.adults) || 0) + (parseInt(r.children) || 0),
          booking_status: mapStatus(r.status),
          special_requests: detailData.notes || r.notes || '',
        };

        // Upsert by confirmation_code
        if (confirmationCode) {
          const existing = await base44.asServiceRole.entities.Booking.filter({ confirmation_code: confirmationCode });
          if (existing.length) {
            await base44.asServiceRole.entities.Booking.update(existing[0].id, bookingData);
          } else {
            await base44.asServiceRole.entities.Booking.create(bookingData);
          }
          upserted++;
        }
      } catch (e) {
        errors.push(e.message);
      }
    }

    return Response.json({
      success: true,
      fetched: allReservations.length,
      upserted,
      errors: errors.length ? errors.slice(0, 5) : null,
    });
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});

function mapStatus(cbStatus) {
  if (!cbStatus) return 'confirmed';
  const s = String(cbStatus).toLowerCase();
  if (s === 'canceled' || s === 'cancelled') return 'cancelled';
  if (s === 'checked_in' || s === 'in_house') return 'checked_in';
  if (s === 'checked_out') return 'checked_out';
  return 'confirmed';
}