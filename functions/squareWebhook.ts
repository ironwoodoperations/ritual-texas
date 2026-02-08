import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function squareApi(path, accessToken) {
  const url = `https://connect.squareup.com${path}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const text = await resp.text();
  let json;
  try { 
    json = JSON.parse(text); 
  } catch { 
    json = { raw: text }; 
  }
  if (!resp.ok) {
    throw new Error(`Square API ${path} failed: ${resp.status} ${text}`);
  }
  return json;
}

Deno.serve(async (req) => {
  try {
    const signatureKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") || "https://hotel-ritual-experience-automation-a6e982ce.base44.app";

    if (!signatureKey || !accessToken) {
      return Response.json({ error: "Missing secrets: SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_ACCESS_TOKEN" }, { status: 500 });
    }

    const headerSig = req.headers.get("x-square-hmacsha256-signature");
    if (!headerSig) {
      return Response.json({ error: "Missing x-square-hmacsha256-signature header" }, { status: 400 });
    }

    const rawBody = await req.text();
    const notificationUrl = `${publicBaseUrl}/functions/squareWebhook`;

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(signatureKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureData = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(notificationUrl + rawBody)
    );
    
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureData)));

    if (headerSig !== expectedSignature) {
      return Response.json({ error: "Invalid Square webhook signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.type || "unknown";
    const bookingId = event?.data?.id || event?.data?.object?.booking?.id;

    if (!bookingId) {
      return Response.json({ received: true, warning: "No booking id in event payload", eventType }, { status: 200 });
    }

    // Fetch full booking details from Square
    const bookingResp = await squareApi(`/v2/bookings/${encodeURIComponent(bookingId)}`, accessToken);
    const booking = bookingResp?.booking;

    // Fetch customer details for email/phone
    let email = "";
    let phone = "";
    const customerId = booking?.customer_id;
    
    if (customerId) {
      try {
        const custResp = await squareApi(`/v2/customers/${encodeURIComponent(customerId)}`, accessToken);
        email = custResp?.customer?.email_address || "";
        phone = custResp?.customer?.phone_number || "";
      } catch (e) {
        console.error("Failed to fetch customer details:", e.message);
      }
    }

    const startAt = booking?.start_at || "";
    const durationMinutes = booking?.appointment_segments?.[0]?.duration_minutes ?? 0;
    const teamMemberId = booking?.appointment_segments?.[0]?.team_member_id || "";
    const serviceVariationId = booking?.appointment_segments?.[0]?.service_variation_id || "";

    const spaBookingPayload = {
      source: "square",
      squareBookingId: bookingId,
      status: eventType,
      service: serviceVariationId,
      staff: teamMemberId,
      startAt,
      durationMinutes,
      price: 0,
      email,
      phone,
      raw: { event, bookingResp },
      createdAt: new Date().toISOString(),
    };

    // Call attachSpaToItinerary function
    const base44 = createClientFromRequest(req);
    const attachResp = await base44.asServiceRole.functions.invoke('attachSpaToItinerary', spaBookingPayload);

    return Response.json({ received: true, action: attachResp?.data?.action || "processed" }, { status: 200 });
  } catch (err) {
    console.error("squareWebhook error:", err);
    return Response.json({ received: true, error: String(err?.message || err) }, { status: 200 });
  }
});