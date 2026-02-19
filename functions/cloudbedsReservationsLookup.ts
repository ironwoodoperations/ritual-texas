import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getSiteSetting(base44, key) {
  const records = await base44.asServiceRole.entities.SiteSettings.filter({ key });
  return records.length > 0 ? records[0].value : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const url = new URL(req.url);
    const reservationID = url.searchParams.get('confirmation');
    const contact = url.searchParams.get('contact');

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