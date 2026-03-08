import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let email = "";
    let phone = "";
    
    // Support both GET (query params) and POST (JSON body)
    if (req.method === 'POST') {
      const body = await req.json();
      email = (body.email || '').trim().toLowerCase();
      phone = (body.phone || '').trim();
    } else {
      const url = new URL(req.url);
      email = (url.searchParams.get('email') || '').trim().toLowerCase();
      phone = (url.searchParams.get('phone') || '').trim();
    }

    if (!email && !phone) {
      return Response.json({ error: "Missing email or phone" }, { status: 400 });
    }

    let results = [];

    if (email) {
      results = await base44.asServiceRole.entities.SpaBooking.filter({ email }, 'startAt', 50);
    } else if (phone) {
      results = await base44.asServiceRole.entities.SpaBooking.filter({ phone }, 'startAt', 50);
    }

    // Only show SimplyBook bookings (exclude old Square bookings)
    results = results.filter(b => b.source !== 'square');

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