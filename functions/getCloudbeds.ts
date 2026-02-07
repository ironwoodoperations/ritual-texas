import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { confirmationCode, email } = await req.json();

    if (!confirmationCode || !email) {
      return Response.json({ error: 'Missing confirmation code or email' }, { status: 400 });
    }

    const apiKey = Deno.env.get('CLOUDBEDS_API_KEY');
    const propertyId = Deno.env.get('CLOUDBEDS_PROPERTY_ID');

    if (!apiKey || !propertyId) {
      return Response.json({ 
        error: 'Cloudbeds API not configured',
        message: 'Please set CLOUDBEDS_API_KEY and CLOUDBEDS_PROPERTY_ID in dashboard settings'
      }, { status: 503 });
    }

    // Fetch reservation from Cloudbeds API
    const response = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservation?propertyID=${propertyId}&reservationID=${confirmationCode}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return Response.json({ 
        error: 'Reservation not found',
        message: 'Could not find reservation with that confirmation code'
      }, { status: 404 });
    }

    const data = await response.json();

    // Verify email matches
    if (data.data.guestEmail?.toLowerCase() !== email.toLowerCase()) {
      return Response.json({ 
        error: 'Email mismatch',
        message: 'The email provided does not match the reservation'
      }, { status: 403 });
    }

    // Return formatted reservation data
    return Response.json({
      confirmationCode: data.data.reservationID,
      guestName: data.data.guestName,
      guestEmail: data.data.guestEmail,
      roomName: data.data.roomTypeName,
      checkInDate: data.data.startDate,
      checkOutDate: data.data.endDate,
      numGuests: data.data.adults + (data.data.children || 0),
      status: data.data.status
    });

  } catch (error) {
    return Response.json({ 
      error: 'Failed to fetch reservation',
      message: error.message 
    }, { status: 500 });
  }
});