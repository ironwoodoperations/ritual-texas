import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { reservationID, amount, paymentMethod, paymentType } = await req.json();

    if (!reservationID || !amount || !paymentMethod) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get Cloudbeds credentials from settings
    const settings = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'cloudbeds_access_token' });
    const refreshSettings = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'cloudbeds_refresh_token' });
    
    if (!settings.length || !refreshSettings.length) {
      return Response.json({ error: 'Cloudbeds not configured' }, { status: 400 });
    }

    let accessToken = settings[0].value;
    const refreshToken = refreshSettings[0].value;
    const CLOUDBEDS_CLIENT_ID = Deno.env.get('CLOUDBEDS_CLIENT_ID');
    const CLOUDBEDS_CLIENT_SECRET = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');

    // Try making API call with current token
    let paymentResponse = await attemptPayment(accessToken, reservationID, amount, paymentMethod, paymentType);

    // If token expired (401), refresh and retry
    if (paymentResponse.status === 401 && refreshToken) {
      const refreshResp = await fetch('https://api.cloudbeds.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: CLOUDBEDS_CLIENT_ID,
          client_secret: CLOUDBEDS_CLIENT_SECRET,
        }).toString(),
      });

      if (refreshResp.ok) {
        const tokenData = await refreshResp.json();
        accessToken = tokenData.access_token;
        
        // Update stored token
        await base44.asServiceRole.entities.SiteSettings.update(settings[0].id, {
          value: accessToken,
        });

        // Retry payment
        paymentResponse = await attemptPayment(accessToken, reservationID, amount, paymentMethod, paymentType);
      }
    }

    const result = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return Response.json({ error: result.message || 'Payment failed' }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: `Payment of $${amount} recorded (${paymentMethod})`,
      data: result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function attemptPayment(accessToken, reservationID, amount, paymentMethod, paymentType = 'balance') {
  const payload = {
    guestId: reservationID,
    amount: Number(amount),
    paymentMethod,
    notes: `Payment recorded on ${new Date().toISOString()}`,
  };

  return fetch('https://api.cloudbeds.com/v1/reservations/' + reservationID + '/payment', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}