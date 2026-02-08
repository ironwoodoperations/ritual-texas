import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get("x-square-hmacsha256-signature");
    const bodyText = await req.text();
    const url = req.url;

    // Verify webhook signature using Web Crypto API
    const secret = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureData = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(url + bodyText)
    );
    
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureData)));

    if (signature !== expectedSignature) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(bodyText);

    if (!event?.type?.startsWith("booking.")) {
      return Response.json({ ok: true });
    }

    const booking = event.data.object.booking;

    const customer = booking.customer_id
      ? booking.customer
      : booking.customer_details;

    const email = customer?.email_address || null;
    const phone = customer?.phone_number || null;

    const spaBooking = {
      source: "square",
      squareBookingId: booking.id,
      service: booking.appointment_segments?.[0]?.service_variation_name,
      staff: booking.appointment_segments?.[0]?.team_member_id,
      startAt: booking.start_at,
      durationMinutes: booking.appointment_segments?.[0]?.duration_minutes,
      price: booking.appointment_segments?.[0]?.service_variation_version?.price_money?.amount || null,
      email,
      phone,
      raw: booking,
      createdAt: new Date().toISOString(),
    };

    if (!email) {
      return Response.json({ ok: true, note: "No email to attach" });
    }

    // Attach to itinerary by email
    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.functions.invoke('attachSpaToItinerary', spaBooking);

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Webhook failed", details: err.message }, { status: 500 });
  }
});