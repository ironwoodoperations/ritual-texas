import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Statuses that should never appear on a guest-facing itinerary
const CANCELLED_STATUSES = ["cancel", "cancelled", "booking.cancelled"];

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

    const phoneDigits = phone.replace(/\D/g, '');

    // Load bookings and match in code rather than with an exact-match filter, so that:
    //  - email matching is case-insensitive (Acuity webhooks historically stored raw
    //    casing, e.g. "Kkemp2015@gmail.com" — an exact filter on the lowercased input
    //    silently returned zero rows for those guests)
    //  - phone matching compares digits only ("(903) 555-1212" vs "9035551212")
    // The SpaBooking table is small (a few hundred rows); the 2000 cap is generous
    // headroom. If the table ever approaches that size, revisit this approach.
    const all = await base44.asServiceRole.entities.SpaBooking.list('startAt', 2000);

    const matchesEmail = (b) =>
      Boolean(email) && (b.email || '').trim().toLowerCase() === email;

    const matchesPhone = (b) => {
      if (phoneDigits.length < 7) return false;
      const bd = (b.phone || '').replace(/\D/g, '');
      if (bd.length < 7) return false;
      // Compare on trailing digits so "+19035551212", "19035551212" and
      // "903-555-1212" all match each other.
      return bd.slice(-10) === phoneDigits.slice(-10);
    };

    const results = (all || [])
      .filter(b =>
        b.source !== 'square' && // exclude old Square bookings
        !CANCELLED_STATUSES.includes((b.status || '').toLowerCase()) &&
        (matchesEmail(b) || matchesPhone(b))
      )
      .slice(0, 50);

    return Response.json({
      success: true,
      spaBookings: results
    }, { status: 200 });
  } catch (err) {
    console.error("spaBookingsLookup error:", err);
    return Response.json({
      error: "spaBookingsLookup failed",
      details: String(err?.message || err)
    }, { status: 500 });
  }
});
