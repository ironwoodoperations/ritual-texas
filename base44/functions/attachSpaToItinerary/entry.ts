// functions/attachSpaToItinerary.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const spaBooking = await req.json();

    const squareId = spaBooking?.squareBookingId;
    const simplyId = spaBooking?.simplybookBookingId;

    if (!squareId && !simplyId) {
      return Response.json(
        { error: "Missing squareBookingId or simplybookBookingId" },
        { status: 400 }
      );
    }

    let existing = [];

    if (squareId) {
      existing = await base44.asServiceRole.entities.SpaBooking.filter({
        squareBookingId: squareId,
      });
    }

    if ((!existing || existing.length === 0) && simplyId) {
      existing = await base44.asServiceRole.entities.SpaBooking.filter({
        simplybookBookingId: simplyId,
      });
    }

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, spaBooking);
      return Response.json(
        { success: true, action: "updated", id: existing[0].id },
        { status: 200 }
      );
    } else {
      const created = await base44.asServiceRole.entities.SpaBooking.create(spaBooking);
      return Response.json(
        { success: true, action: "created", id: created?.id },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("attachSpaToItinerary error:", err);
    return Response.json(
      { error: "attachSpaToItinerary failed", details: String(err?.message || err) },
      { status: 500 }
    );
  }
});