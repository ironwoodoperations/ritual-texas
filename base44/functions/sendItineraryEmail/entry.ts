import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guestName, guestEmail, confirmationCode, checkIn, checkOut, roomType, totalAmount, spaBookings } = await req.json();

    if (!guestEmail) {
      return Response.json({ error: 'Missing guestEmail' }, { status: 400 });
    }

    const formatDate = (dateString) => {
      if (!dateString) return '—';
      const dateStr = String(dateString).split('T')[0];
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    let emailBody = `
<html>
  <body style="font-family: Arial, sans-serif; color: #1B1B1B; background-color: #F0E8DD; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #FCF9F4; border-radius: 16px; padding: 30px;">
      <h1 style="color: #3B4831; font-size: 28px; font-weight: 300; margin-bottom: 10px;">Your RITUAL Stay Itinerary</h1>
      
      <div style="border-bottom: 1px solid #F0E8DD; padding-bottom: 20px; margin-bottom: 20px;">
        <h2 style="color: #3B4831; font-size: 20px; margin: 0 0 10px 0;">${guestName}</h2>
        <p style="margin: 5px 0; font-size: 14px;">
          <strong>Confirmation Code:</strong> <span style="font-family: monospace;">${confirmationCode}</span>
        </p>
      </div>

      <div style="background-color: #FFF; border: 1px solid #F0E8DD; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #3B4831; margin-top: 0;">Your Reservation</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0;"><strong>Check-In:</strong></td>
            <td style="text-align: right;">${formatDate(checkIn)} at 3:00 PM</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Check-Out:</strong></td>
            <td style="text-align: right;">${formatDate(checkOut)} at 11:00 AM</td>
          </tr>
          ${roomType ? `<tr>
            <td style="padding: 8px 0;"><strong>Room:</strong></td>
            <td style="text-align: right;">${roomType}</td>
          </tr>` : ''}
          ${totalAmount ? `<tr>
            <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #3B4831;">$${totalAmount.toFixed(2)}</td>
          </tr>` : ''}
        </table>
      </div>
    `;

    if (spaBookings && spaBookings.length > 0) {
      emailBody += `
      <div style="background-color: #FFF; border: 1px solid #F0E8DD; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #3B4831; margin-top: 0;">Your Spa Appointments</h3>
      `;
      
      spaBookings.forEach((booking) => {
        // Parse as local date to avoid UTC offset shifting the date back by one day
        const startDate = booking.startAt ? new Date(booking.startAt).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }) : '—';
        
        emailBody += `
        <div style="border-bottom: 1px solid #F0E8DD; padding-bottom: 12px; margin-bottom: 12px;">
          <p style="margin: 0; font-weight: bold; color: #3B4831;">
            ${booking.serviceName || booking.service || 'Spa Service'}
          </p>
          ${booking.staffName ? `<p style="margin: 5px 0; font-size: 13px;">Therapist: ${booking.staffName}</p>` : ''}
          <p style="margin: 5px 0; font-size: 13px;">${startDate}</p>
          ${booking.durationMinutes ? `<p style="margin: 5px 0; font-size: 13px;">${booking.durationMinutes} minutes</p>` : ''}
        </div>
        `;
      });

      emailBody += `</div>`;
    }

    emailBody += `
      <div style="background-color: #FFF; border: 1px solid #F0E8DD; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #3B4831; margin-top: 0;">During Your Stay</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
          <li>Breakfast: 8:00–10:00 AM daily</li>
          <li>Sauna & rainshower available anytime</li>
          <li>Book additional spa treatments at any time</li>
        </ul>
      </div>

      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #F0E8DD;">
        <p style="font-size: 12px; color: #1B1B1B; margin: 10px 0;">
          Questions? Text Concierge: <strong>903-810-6695</strong>
        </p>
        <p style="font-size: 12px; color: #1B1B1B; margin: 0;">
          We can't wait to welcome you to RITUAL.
        </p>
      </div>
    </div>
  </body>
</html>
    `;

    await base44.integrations.Core.SendEmail({
      to: guestEmail,
      subject: `Your RITUAL Stay Itinerary – Confirmation ${confirmationCode}`,
      body: emailBody
    });

    return Response.json({ success: true, message: 'Email sent successfully' }, { status: 200 });
  } catch (err) {
    console.error('sendItineraryEmail error:', err);
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});