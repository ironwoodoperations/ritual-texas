import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const spaBooking = await req.json();

    if (!spaBooking?.squareBookingId) {
      return Response.json({ error: "Missing squareBookingId" }, { status: 400 });
    }

    // Find existing SpaBooking by squareBookingId
    const existing = await base44.asServiceRole.entities.SpaBooking.filter({ 
      squareBookingId: spaBooking.squareBookingId 
    });

    if (existing && existing.length > 0) {
      // Update existing record
      await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, spaBooking);
      return Response.json({ 
        success: true, 
        action: "updated", 
        id: existing[0].id 
      }, { status: 200 });
    } else {
      // Create new record
      const created = await base44.asServiceRole.entities.SpaBooking.create(spaBooking);
      return Response.json({ 
        success: true, 
        action: "created", 
        id: created?.id 
      }, { status: 200 });
    }
  } catch (err) {
    console.error("attachSpaToItinerary error:", err);
    return Response.json({ 
      error: "attachSpaToItinerary failed", 
      details: String(err?.message || err) 
    }, { status: 500 });
  }
});