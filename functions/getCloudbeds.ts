import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, confirmationCode, email } = await req.json();

    if (!phone && (!confirmationCode || !email)) {
      return Response.json({ error: 'Missing phone number or confirmation details' }, { status: 400 });
    }

    const apiKey = Deno.env.get('CLOUDBEDS_API_KEY');
    const propertyId = Deno.env.get('CLOUDBEDS_PROPERTY_ID');

    if (!apiKey || !propertyId) {
      return Response.json({ 
        error: 'Cloudbeds API not configured',
        message: 'Please set CLOUDBEDS_API_KEY and CLOUDBEDS_PROPERTY_ID in dashboard settings'
      }, { status: 503 });
    }

    let data;
    
    if (phone) {
      // Search by phone number
      const response = await fetch(
        `https://api.cloudbeds.com/api/v1.1/getReservations?propertyID=${propertyId}&guestPhone=${encodeURIComponent(phone)}`,
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
          message: 'Could not find reservation with that phone number'
        }, { status: 404 });
      }

      const result = await response.json();
      data = result.data?.[0];
      
      if (!data) {
        return Response.json({ 
          error: 'No reservation found',
          message: 'No reservation found for this phone number'
        }, { status: 404 });
      }
    } else {
      // Original confirmation code + email flow
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

      const result = await response.json();
      data = result.data;

      // Verify email matches
      if (data.guestEmail?.toLowerCase() !== email.toLowerCase()) {
        return Response.json({ 
          error: 'Email mismatch',
          message: 'The email provided does not match the reservation'
        }, { status: 403 });
      }
    }

    // Return formatted reservation data
    return Response.json({
      confirmationCode: data.reservationID,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      roomName: data.roomTypeName,
      checkInDate: data.startDate,
      checkOutDate: data.endDate,
      numGuests: data.adults + (data.children || 0),
      status: data.status
    });

  } catch (error) {
    return Response.json({ 
      error: 'Failed to fetch reservation',
      message: error.message 
    }, { status: 500 });
  }
});