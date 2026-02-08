import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const phone = (url.searchParams.get('phone') || '').trim();

    if (!email && !phone) {
      return Response.json({ error: "Missing email or phone" }, { status: 400 });
    }

    let results = [];

    if (email) {
      results = await base44.asServiceRole.entities.SpaBooking.filter({ email }, 'startAt', 50);
    } else if (phone) {
      results = await base44.asServiceRole.entities.SpaBooking.filter({ phone }, 'startAt', 50);
    }

    return Response.json({ 
      success: true, 
      spaBookings: results || [] 
    }, { status: 200 });
  } catch (err) {
    console.error("spaBookingsLookup error:", err);
    return Response.json({ 
      error: "spaBookingsLookup failed", 
      details: String(err?.message || err) 
    }, { status: 500 });
  }
});