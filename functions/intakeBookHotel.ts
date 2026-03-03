import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getSetting(base44, key) {
  const found = await base44.entities.SiteSettings.filter({ key });
  return found?.[0]?.value;
}

async function refreshToken(base44) {
  const clientId = Deno.env.get('CLOUDBEDS_CLIENT_ID');
  const clientSecret = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');
  const refreshToken = await getSetting(base44, 'cloudbeds_refresh_token');

  if (!refreshToken) throw new Error('Cloudbeds not configured');

  const res = await fetch('https://auth.cloudbeds.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) throw new Error('Token refresh failed');
  
  const data = await res.json();
  await base44.entities.SiteSettings.bulkCreate([
    { key: 'cloudbeds_access_token', value: data.access_token },
    { key: 'cloudbeds_refresh_token', value: data.refresh_token },
  ]);

  return data.access_token;
}

async function cloudbeds(base44, method, path, body = null) {
  let token = await getSetting(base44, 'cloudbeds_access_token');
  
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) opts.body = JSON.stringify(body);

  let res = await fetch(`https://api.cloudbeds.com/v1${path}`, opts);

  if (res.status === 401) {
    token = await refreshToken(base44);
    opts.headers.Authorization = `Bearer ${token}`;
    res = await fetch(`https://api.cloudbeds.com/v1${path}`, opts);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudbeds error: ${err}`);
  }

  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { intake } = await req.json();
    
    if (!intake?.checkInDate || !intake?.checkOutDate || !intake?.guestName || !intake?.guestEmail) {
      return Response.json({ error: 'Check-in, check-out, guest name and email required' }, { status: 400 });
    }

    // Get rooms from Cloudbeds
    const roomsRes = await cloudbeds(base44, 'GET', '/properties/rooms');
    const rooms = roomsRes.data || [];
    
    let roomId = null;
    if (intake.roomRequested) {
      const room = rooms.find(r => r.roomName === intake.roomRequested);
      roomId = room?.roomID;
    }

    if (!roomId && rooms.length > 0) {
      roomId = rooms[0].roomID;
    }

    if (!roomId) {
      return Response.json({ error: 'No rooms configured in Cloudbeds' }, { status: 400 });
    }

    // Create reservation in Cloudbeds
    const reservationRes = await cloudbeds(base44, 'POST', '/properties/reservations', {
      roomID: roomId,
      guestName: intake.guestName,
      guestEmail: intake.guestEmail,
      guestPhone: intake.phone || '',
      guestCountry: 'US',
      arrivalDate: intake.checkInDate,
      departureDate: intake.checkOutDate,
      guestCount: intake.numberOfGuests || 1,
      reservationSource: 'API',
      statusID: 1,
    });

    // Also save locally
    if (reservationRes.data?.reservationID) {
      await base44.entities.Booking.create({
        guest_name: intake.guestName,
        guest_email: intake.guestEmail,
        guest_phone: intake.phone || '',
        room_name: intake.roomRequested || 'TBD',
        check_in_date: intake.checkInDate,
        check_out_date: intake.checkOutDate,
        num_guests: intake.numberOfGuests || 1,
        booking_status: 'confirmed',
        payment_status: 'pending',
      });
    }

    return Response.json({ 
      success: true, 
      reservationId: reservationRes.data?.reservationID,
      message: 'Hotel booking created in Cloudbeds'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});