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
    
    // Get booking ID from the correct location (without :0 suffix)
    const booking = event?.data?.object?.booking;
    const bookingId = booking?.id;

    if (!bookingId) {
      return Response.json({ received: true, warning: "No booking id in event payload", eventType }, { status: 200 });
    }

    // Use booking data from webhook payload (already complete)
    // No need to fetch again - webhook includes full booking object

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
    const serviceClientId = booking?.appointment_segments?.[0]?.service_variation_client_id || "";

    // Fetch service name (get parent item, not variation)
    let serviceName = "";
    if (serviceVariationId) {
      try {
        const serviceResp = await squareApi(`/v2/catalog/object/${encodeURIComponent(serviceVariationId)}?include_related_objects=true`, accessToken);
        const variation = serviceResp?.object;
        const parentItemId = variation?.item_variation_data?.item_id;

        // Get parent item name from related objects
        if (parentItemId && serviceResp?.related_objects) {
          const parentItem = serviceResp.related_objects.find(obj => obj.id === parentItemId);
          serviceName = parentItem?.item_data?.name || "";
        }

        // Fallback to variation name if parent not found
        if (!serviceName) {
          serviceName = variation?.item_variation_data?.name || "";
        }
      } catch (e) {
        console.error("Failed to fetch service name:", e.message);
      }
    }

    // Fetch staff name
    let staffName = "";
    let staffDebugData = null;
    if (teamMemberId) {
      try {
        const staffResp = await squareApi(`/v2/team_members/${encodeURIComponent(teamMemberId)}`, accessToken);
        staffDebugData = staffResp; // Store for debugging
        const member = staffResp?.team_member;

        // Try multiple possible name fields
        if (member?.given_name && member?.family_name) {
          staffName = `${member.given_name} ${member.family_name}`.trim();
        } else if (member?.given_name) {
          staffName = member.given_name;
        } else if (member?.family_name) {
          staffName = member.family_name;
        } else if (member?.display_name) {
          staffName = member.display_name;
        } else if (member?.email_address) {
          staffName = member.email_address.split('@')[0];
        }

        console.log("Staff API Response:", JSON.stringify(staffResp, null, 2));
        console.log("Extracted staff name:", staffName);
      } catch (e) {
        console.error("Failed to fetch staff name:", e.message);
      }
    }

    const spaBookingPayload = {
      source: "square",
      squareBookingId: bookingId,
      status: eventType,
      service: serviceClientId || serviceVariationId,
      serviceName: serviceName,
      staff: teamMemberId,
      staffName: staffName,
      startAt,
      durationMinutes,
      price: 0,
      email,
      phone,
      raw: { event, booking },
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