import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getAccessToken(base44) {
  const tokenRecords = await base44.asServiceRole.entities.SiteSettings.filter({ 
    key: 'CLOUDBEDS_ACCESS_TOKEN' 
  });
  
  if (tokenRecords.length === 0) {
    throw new Error('No access token found. Please authorize Cloudbeds first.');
  }
  
  return tokenRecords[0].value;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const url = new URL(req.url);
    const confirmation = url.searchParams.get('confirmation');
    const contact = url.searchParams.get('contact');
    
    if (!confirmation || !contact) {
      return Response.json({ 
        error: 'Missing required parameters: confirmation and contact' 
      }, { status: 400 });
    }
    
    const accessToken = await getAccessToken(base44);
    
    // Get property ID (you may want to store this in settings too)
    const propertyResponse = await fetch('https://hotels.cloudbeds.com/api/v1.1/getHotels', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!propertyResponse.ok) {
      const error = await propertyResponse.text();
      return Response.json({ 
        error: 'Failed to get property info', 
        details: error 
      }, { status: propertyResponse.status });
    }
    
    const propertyData = await propertyResponse.json();
    const propertyId = propertyData.data[0]?.propertyID;
    
    if (!propertyId) {
      return Response.json({ error: 'No property found' }, { status: 404 });
    }
    
    // Search for reservation
    const reservationResponse = await fetch(
      `https://hotels.cloudbeds.com/api/v1.1/getReservation?propertyID=${propertyId}&reservationID=${confirmation}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!reservationResponse.ok) {
      const error = await reservationResponse.text();
      return Response.json({ 
        error: 'Reservation not found or access denied', 
        details: error 
      }, { status: reservationResponse.status });
    }
    
    const reservationData = await reservationResponse.json();
    const reservation = reservationData.data;
    
    // Verify contact information matches
    const guestEmail = reservation.guestEmail?.toLowerCase();
    const guestPhone = reservation.guestPhone?.replace(/\D/g, '');
    const contactLower = contact.toLowerCase();
    const contactDigits = contact.replace(/\D/g, '');
    
    if (guestEmail !== contactLower && guestPhone !== contactDigits) {
      return Response.json({ 
        error: 'Contact information does not match reservation' 
      }, { status: 403 });
    }
    
    // Return reservation details
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
        status: reservation.status,
        totalAmount: reservation.balance
      }
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});