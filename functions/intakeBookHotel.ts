import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function getSetting(base44, key) {
  const found = await base44.asServiceRole.entities.AppSetting.filter({ key });
  return found?.[0]?.value;
}

async function getAccessToken(base44) {
  const clientId = Deno.env.get('CLOUDBEDS_CLIENT_ID');
  const clientSecret = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');
  let accessToken = await getSetting(base44, 'cloudbeds_access_token');
  
  if (!accessToken) {
    const refreshToken = await getSetting(base44, 'cloudbeds_refresh_token');
    if (!refreshToken) throw new Error('Cloudbeds not connected. Please complete OAuth setup first in Admin → Cloudbeds.');

    const res = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) throw new Error('Cloudbeds token refresh failed — please reconnect in Admin → Cloudbeds');
    const data = await res.json();
    accessToken = data.access_token;

    // Save new tokens
    const existing = await base44.asServiceRole.entities.AppSetting.filter({ key: 'cloudbeds_access_token' });
    if (existing?.[0]) {
      await base44.asServiceRole.entities.AppSetting.update(existing[0].id, { value: accessToken });
    } else {
      await base44.asServiceRole.entities.AppSetting.create({ key: 'cloudbeds_access_token', value: accessToken });
    }
    if (data.refresh_token) {
      const existingR = await base44.asServiceRole.entities.AppSetting.filter({ key: 'cloudbeds_refresh_token' });
      if (existingR?.[0]) {
        await base44.asServiceRole.entities.AppSetting.update(existingR[0].id, { value: data.refresh_token });
      }
    }
  }

  return accessToken;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { intake } = await req.json();

    if (!intake?.checkInDate || !intake?.checkOutDate || !intake?.guestName || !intake?.guestEmail) {
      return Response.json({ error: 'Check-in, check-out, guest name and email are required' }, { status: 400 });
    }

    const token = await getAccessToken(base44);
    const propertyId = await getSetting(base44, 'cloudbeds_property_id');

    if (!propertyId) {
      return Response.json({ error: 'Cloudbeds property ID not configured' }, { status: 400 });
    }

    const cbHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Get rooms
    const roomsRes = await fetch(`https://hotels.cloudbeds.com/api/v1.1/getRooms?propertyID=${propertyId}`, {
      headers: cbHeaders,
    });

    if (!roomsRes.ok) {
      const err = await roomsRes.text();
      throw new Error(`Could not fetch rooms: ${err}`);
    }

    const roomsData = await roomsRes.json();
    const rooms = roomsData.data || [];

    let roomId = null;
    if (intake.roomRequested) {
      const room = rooms.find(r =>
        r.roomName?.toLowerCase().includes(intake.roomRequested.toLowerCase()) ||
        r.roomTypeName?.toLowerCase().includes(intake.roomRequested.toLowerCase())
      );
      roomId = room?.roomID;
    }
    if (!roomId && rooms.length > 0) roomId = rooms[0].roomID;
    if (!roomId) {
      return Response.json({ error: 'No rooms found in Cloudbeds' }, { status: 400 });
    }

    // Create reservation
    const resParams = new URLSearchParams({
      propertyID: propertyId,
      roomID: roomId,
      startDate: intake.checkInDate,
      endDate: intake.checkOutDate,
      guestFirstName: intake.guestName.split(' ')[0] || intake.guestName,
      guestLastName: intake.guestName.split(' ').slice(1).join(' ') || '.',
      guestEmail: intake.guestEmail,
      guestPhone: intake.phone || '',
      adults: String(intake.numberOfGuests || 1),
      children: '0',
    });

    const resRes = await fetch(`https://hotels.cloudbeds.com/api/v1.1/postReservation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: resParams,
    });

    const resData = await resRes.json();

    if (!resData.success) {
      throw new Error(`Cloudbeds error: ${resData.message || JSON.stringify(resData)}`);
    }

    // Save locally too
    await base44.entities.Booking.create({
      guest_name: intake.guestName,
      guest_email: intake.guestEmail,
      guest_phone: intake.phone || '',
      room_name: intake.roomRequested || rooms.find(r => r.roomID === roomId)?.roomName || 'TBD',
      check_in_date: intake.checkInDate,
      check_out_date: intake.checkOutDate,
      num_guests: intake.numberOfGuests || 1,
      booking_status: 'confirmed',
      payment_status: 'pending',
    });

    return Response.json({
      success: true,
      reservationId: resData.reservationID,
      message: `Hotel booking created in Cloudbeds (Reservation #${resData.reservationID})`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});