import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getSiteSetting(base44, key) {
  const records = await base44.asServiceRole.entities.SiteSettings.filter({ key });
  return records.length > 0 ? records[0] : null;
}

async function getSettingValue(base44, key) {
  const record = await getSiteSetting(base44, key);
  return record ? record.value : null;
}

async function refreshAccessToken(base44) {
  const refreshRecord = await getSiteSetting(base44, 'CLOUDBEDS_REFRESH_TOKEN');
  if (!refreshRecord) throw new Error('No refresh token available. Please re-authorize Cloudbeds.');

  const clientId = Deno.env.get('Client_ID');
  const clientSecret = Deno.env.get('Client_Secret');

  const tokenResponse = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshRecord.value
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error('Failed to refresh token: ' + JSON.stringify(tokenData));
  }

  // Update access token in SiteSettings
  const accessRecord = await getSiteSetting(base44, 'CLOUDBEDS_ACCESS_TOKEN');
  if (accessRecord) {
    await base44.asServiceRole.entities.SiteSettings.update(accessRecord.id, {
      value: tokenData.access_token,
      description: `Cloudbeds access token - refreshed ${new Date().toISOString()}`
    });
  } else {
    await base44.asServiceRole.entities.SiteSettings.create({
      key: 'CLOUDBEDS_ACCESS_TOKEN',
      value: tokenData.access_token,
      description: `Cloudbeds access token - refreshed ${new Date().toISOString()}`
    });
  }

  // Update refresh token if a new one was issued
  if (tokenData.refresh_token) {
    await base44.asServiceRole.entities.SiteSettings.update(refreshRecord.id, {
      value: tokenData.refresh_token
    });
  }

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let reservationID, contact;
    try {
      const body = await req.json();
      reservationID = body.confirmation;
      contact = body.contact;
    } catch {
      const url = new URL(req.url);
      reservationID = url.searchParams.get('confirmation');
      contact = url.searchParams.get('contact');
    }

    if (!reservationID || !contact) {
      return Response.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const accessToken = await getSiteSetting(base44, 'CLOUDBEDS_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json(
        { error: 'No access token found. Please authorize Cloudbeds.' },
        { status: 401 }
      );
    }

    const propertyID = await getSiteSetting(base44, 'CLOUDBEDS_PROPERTY_ID');
    if (!propertyID) {
      return Response.json(
        { error: 'No property ID found in SiteSettings.' },
        { status: 500 }
      );
    }

    // Use v1.1 API with propertyID
    const requestUrl = `https://hotels.cloudbeds.com/api/v1.1/getReservation?propertyID=${encodeURIComponent(propertyID)}&reservationID=${encodeURIComponent(reservationID)}`;

    const reservationResponse = await fetch(requestUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await reservationResponse.json();

    if (!reservationResponse.ok || !data.success) {
      return Response.json(
        { error: 'Cloudbeds error', details: data },
        { status: reservationResponse.status || 400 }
      );
    }

    const reservation = data.data;

    const guestEmail = reservation.guestEmail?.toLowerCase() || '';
    const guestPhone = reservation.guestPhone?.replace(/\D/g, '') || '';
    const contactLower = contact.toLowerCase();
    const contactDigits = contact.replace(/\D/g, '');

    if (guestEmail !== contactLower && guestPhone !== contactDigits) {
      return Response.json(
        { error: 'Contact information does not match reservation' },
        { status: 403 }
      );
    }

    const assignedRoom = reservation.assigned?.[0];
    const roomDisplay = assignedRoom?.roomName || assignedRoom?.roomTypeName || reservation.roomTypeName || 'Assigned at check-in';

    return Response.json({
      success: true,
      reservation: {
        confirmationCode: reservation.reservationID,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail,
        guestPhone: reservation.guestPhone,
        checkIn: reservation.startDate,
        checkOut: reservation.endDate,
        roomType: reservation.roomTypeName,
        roomNumber: roomDisplay,
        status: reservation.status,
        totalAmount: reservation.balance
      },
      debug: {
        fullCloudbedsResponse: reservation
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});