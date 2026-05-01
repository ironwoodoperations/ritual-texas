import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ── Helpers ──────────────────────────────────────────────────────────────────

function clean(s: any): string { return String(s ?? "").trim(); }

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 864e5));
}

// ── Cloudbeds availability re-check (submission-time gate) ──────────────────

async function checkCloudbedsRoomAvailable(base44: any, roomTypeId: string, startDate: string, endDate: string): Promise<{ available: boolean; error?: string }> {
  try {
    const rows = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'CLOUDBEDS_ACCESS_TOKEN' });
    let accessToken = rows?.[0]?.value || null;
    const propertyId = Deno.env.get('CLOUDBEDS_PROPERTY_ID');

    if (!accessToken || !propertyId) {
      // Can't verify — let the booking proceed (Cloudbeds itself will reject if unavailable)
      console.log("[Availability] Cloudbeds not configured — skipping pre-check");
      return { available: true };
    }

    const doFetch = async (token: string) => {
      const params = new URLSearchParams({ propertyID: propertyId, startDate, endDate });
      const resp = await fetch(`https://hotels.cloudbeds.com/api/v1.1/getAvailableRoomTypes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { ok: resp.ok, status: resp.status, json: await resp.json() };
    };

    let result = await doFetch(accessToken);

    // Refresh token if expired
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      try {
        const refreshRows = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'CLOUDBEDS_REFRESH_TOKEN' });
        const refreshToken = refreshRows?.[0]?.value;
        if (!refreshToken) return { available: true }; // can't refresh, let it pass
        const clientId = Deno.env.get('CLOUDBEDS_CLIENT_ID');
        const clientSecret = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');
        const form = new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId!, client_secret: clientSecret!, refresh_token: refreshToken });
        const tokenResp = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
        const tokenJson = await tokenResp.json();
        const newToken = tokenJson?.access_token;
        if (newToken) {
          accessToken = newToken;
          result = await doFetch(newToken);
        }
      } catch {
        return { available: true }; // refresh failed, let Cloudbeds reject at booking time
      }
    }

    if (!result.json?.success) {
      console.log("[Availability] Cloudbeds check failed:", result.json?.message);
      return { available: true }; // API error — don't block, Cloudbeds will reject at booking
    }

    const dataArr = result.json?.data || [];
    const allRooms = dataArr.flatMap((p: any) => p.propertyRooms || []);
    const isAvailable = allRooms.some((r: any) => String(r.roomTypeID) === String(roomTypeId));

    console.log(`[Availability] Room ${roomTypeId} available: ${isAvailable} (${allRooms.length} rooms returned for ${startDate}–${endDate})`);
    return { available: isAvailable };
  } catch (e: any) {
    console.log("[Availability] Pre-check error (non-fatal):", e.message);
    return { available: true }; // unexpected error — don't block guest, Cloudbeds will catch it
  }
}

async function buildSquarePaymentLink(
  guestName: string,
  email: string,
  phone: string,
  checkIn: string,
  checkOut: string,
  rooms: { roomId: string; roomName: string; roomRate: number; guestNames: string[] }[],
  treatments: any[],
): Promise<{ ok: boolean; publicUrl?: string; paymentLinkId?: string; orderId?: string; error?: string }> {
  const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN") || "";
  const squareEnv = Deno.env.get("SQUARE_ENV") || "production";
  const baseUrl = squareEnv === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

  if (!accessToken) {
    return { ok: false, error: "SQUARE_ACCESS_TOKEN not configured" };
  }

  const sqHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Square-Version": "2024-01-18",
  };

  // Get location ID
  let locationId: string;
  try {
    const locResp = await fetch(`${baseUrl}/v2/locations`, { headers: sqHeaders });
    const locData = await locResp.json();
    const location = (locData?.locations || []).find((l: any) => l.status === "ACTIVE") || locData?.locations?.[0];
    if (!location?.id) return { ok: false, error: "No Square location found" };
    locationId = location.id;
  } catch (e: any) {
    return { ok: false, error: `Square locations lookup failed: ${e.message}` };
  }

  const numNights = nightsBetween(checkIn, checkOut);
  const lineItems: any[] = [];

  // Room line items
  let roomTotalDollars = 0;
  for (const room of rooms) {
    const roomDollars = room.roomRate * numNights;
    roomTotalDollars += roomDollars;
    lineItems.push({
      name: `${room.roomName || "Hotel Stay"} × ${numNights} night${numNights === 1 ? "" : "s"}`,
      quantity: "1",
      base_price_money: { amount: Math.ceil(roomDollars * 100), currency: "USD" },
    });
  }

  // Hotel occupancy tax line items (only when rooms are present)
  if (rooms.length > 0) {
    const taxLines = [
      { label: "State of Texas Occupancy Tax (6%)", rate: 0.06 },
      { label: "City of Jacksonville Occupancy Tax (7%)", rate: 0.07 },
      { label: "Jacksonville Venue Tax (2%)", rate: 0.02 },
    ];
    for (const tax of taxLines) {
      const taxCents = Math.round(roomTotalDollars * tax.rate * 100);
      if (taxCents > 0) {
        lineItems.push({
          name: tax.label,
          quantity: "1",
          base_price_money: { amount: taxCents, currency: "USD" },
        });
      }
    }
  }

  // Treatment line items
  for (const raw of treatments) {
    const t = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return { name: raw, price: 0 }; } })() : (raw || {});
    const name = t.serviceName || t.name || "Treatment";
    const tGuest = t.guestName || "";
    const priceCents = Math.ceil(Number(t.price || 0) * 100);
    lineItems.push({
      name: tGuest ? `${name} — ${tGuest}` : name,
      quantity: "1",
      base_price_money: { amount: priceCents, currency: "USD" },
    });
  }

  if (lineItems.length === 0) {
    return { ok: false, error: "No line items to charge" };
  }

  const idempotencyKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

  const body = {
    idempotency_key: idempotencyKey,
    description: `Hotel RITUAL Booking — ${guestName}`,
    order: {
      location_id: locationId,
      line_items: lineItems,
    },
    checkout_options: {
      redirect_url: "https://ritualtexas.com/booking-confirmed",
    },
    pre_populated_data: {
      buyer_email: email,
      ...(phone ? { buyer_phone_number: '+1' + phone.replace(/\D/g, '').slice(-10) } : {}),
    },
  };

  console.log("[Square] Creating payment link:", JSON.stringify(body, null, 2));

  try {
    const resp = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: sqHeaders,
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = {}; }

    if (!resp.ok) {
      console.error("[Square] Payment link creation failed:", resp.status, text);
      return { ok: false, error: `Square payment link failed (HTTP ${resp.status}), location=${locationId.slice(0, 6)}…: ${text.slice(0, 500)}` };
    }

    const paymentLink = json?.payment_link;
    const publicUrl = paymentLink?.url || paymentLink?.long_url || null;
    const paymentLinkId = paymentLink?.id || null;
    const orderId = paymentLink?.order_id || null;

    if (!publicUrl) {
      console.error("[Square] No URL in payment link response:", text);
      return { ok: false, error: "Square returned no payment URL" };
    }

    console.log("[Square] Payment link created:", publicUrl, "id:", paymentLinkId, "order:", orderId);
    return { ok: true, publicUrl, paymentLinkId: paymentLinkId || undefined, orderId: orderId || undefined };
  } catch (e: any) {
    console.error("[Square] Payment link request error:", e.message);
    return { ok: false, error: `Square request failed: ${e.message}` };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // No admin auth check — this is the guest-facing booking endpoint.

  try {
    const payload = await req.json();
    console.log("guestSubmitBooking called with:", JSON.stringify(payload));

    // ── Validate required fields ──────────────────────────────────────────
    const guestName = clean(payload.guestName);
    const email     = clean(payload.email).toLowerCase();
    const phone     = clean(payload.phone);
    const checkIn   = clean(payload.checkInDate);
    const checkOut  = clean(payload.checkOutDate);
    const bookingType = clean(payload.bookingType) || "hotel_and_spa";

    // Parse rooms array (new multi-room format) with backward compat for legacy single-room fields
    let roomsArr: { roomId: string; roomName: string; roomRate: number; guestNames: string[] }[] = [];
    if (Array.isArray(payload.rooms) && payload.rooms.length > 0) {
      roomsArr = payload.rooms.map((r: any) => ({
        roomId: clean(r.roomId || r.roomTypeID || ""),
        roomName: clean(r.roomName || r.name || ""),
        roomRate: Number(r.roomRate || r.pricePerNight || 198),
        guestNames: Array.isArray(r.guestNames) ? r.guestNames : [],
      })).filter((r: any) => r.roomId);
    } else if (clean(payload.cloudbedsRoomTypeId)) {
      // Legacy single-room payload
      roomsArr = [{
        roomId: clean(payload.cloudbedsRoomTypeId),
        roomName: clean(payload.roomRequested || ""),
        roomRate: Number(payload.roomPricePerNight || 198),
        guestNames: [],
      }];
    }

    if (!guestName || !email || !checkIn || !checkOut) {
      return Response.json(
        { success: false, error: "Missing required fields (name, email, dates)." },
        { status: 400 },
      );
    }

    if (bookingType !== 'spa_only' && roomsArr.length === 0) {
      return Response.json(
        { success: false, error: "Room selection required for hotel bookings." },
        { status: 400 },
      );
    }

    const hasCallToBook = Array.isArray(payload.callToBookTreatments) && payload.callToBookTreatments.length > 0;

    // ── Availability re-check at submission time (hotel bookings only) ────
    if (bookingType !== 'spa_only' && roomsArr.length > 0) {
      for (const room of roomsArr) {
        const avail = await checkCloudbedsRoomAvailable(base44, room.roomId, checkIn, checkOut);
        if (!avail.available) {
          return Response.json({
            success: false,
            error: `Sorry, ${room.roomName || 'a selected room'} is no longer available for your selected dates. Please go back and choose different dates or a different room.`,
          }, { status: 409 });
        }
      }
    }

    // ── Step 1: Create HotelTreatmentIntake record ────────────────────────
    const intakePayload: Record<string, any> = {
      guestName,
      email,
      phone,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: payload.numberOfGuests || 1,
      rooms: bookingType !== 'spa_only' ? roomsArr : [],
      cloudbedsRoomTypeId: bookingType !== 'spa_only' ? (roomsArr[0]?.roomId || "") : "",
      roomRequested: bookingType !== 'spa_only' ? roomsArr.map(r => r.roomName).filter(Boolean).join(", ") : "",
      roomName: bookingType !== 'spa_only' ? (roomsArr[0]?.roomName || "") : "",
      selectedTreatments: payload.selectedTreatments || [],
      callToBookTreatments: payload.callToBookTreatments || [],
      treatmentsRequested: payload.specialRequests || "",
      hotelNotes: payload.specialRequests || "",
      howDidYouHearAboutUs: payload.howDidYouHearAboutUs || "",
      bookingType,
      bookingStatus: hasCallToBook ? "new_inquiry" : "awaiting_payment",
      source: "guest_book_now",
      internalNotes: `[Guest Online Booking (${bookingType}) — ${new Date().toISOString()}]\nSource: GuestBookNow page`,
      preferredContactMethod: "email",
    };

    // Only include hotel taxes for hotel bookings
    if (bookingType !== 'spa_only') {
      intakePayload.taxes = {
        hotel_state: true,
        hotel_city: true,
        hotel_venue: true,
      };
    }

    let intake: any;
    try {
      intake = await base44.asServiceRole.entities.HotelTreatmentIntake.create(intakePayload);
    } catch {
      return Response.json(
        { success: false, error: "Could not save your booking. Please call us at (903) 810-6695." },
        { status: 500 },
      );
    }

    const intakeId = intake.id;
    let notes = intakePayload.internalNotes;

    // ── Path B: Request Flow (call-to-book → stop early) ──────────────────
    if (hasCallToBook) {
      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: "Your Booking Request — Hotel RITUAL",
          body: [
            `Hi ${guestName},`,
            "",
            "Thank you for your booking request at Hotel RITUAL!",
            "",
            "We have received your request and will contact you within 24 hours to confirm availability for all your selected treatments and finalize your reservation.",
            "",
            "Your request details:",
            `• Dates: ${checkIn} – ${checkOut}`,
            `• Room: ${payload.roomRequested || "—"}`,
            `• Guests: ${payload.numberOfGuests || 1}`,
            "",
            "Questions? Call us at (903) 810-6695 or reply to this email.",
            "",
            "Warm regards,",
            "Hotel RITUAL",
            "San Augustine, TX",
          ].join("\n"),
        });
      } catch (e: any) {
        console.error("Failed to send request confirmation email:", e);
      }

      return Response.json({
        success: true,
        type: "request",
        intakeId,
        message: "Your request has been received. We will contact you shortly to confirm.",
      });
    }

    // ── Path A: Pay-Now Flow ─────────────────────────────────────────────
    // Cloudbeds reservations and Acuity appointments are NOT created here.
    // They are deferred to the squareWebhook handler, which fires only after
    // Square confirms payment. See base44/functions/squareWebhook/entry.ts.

    const treatmentsForPayment = bookingType !== 'hotel_only' ? (payload.selectedTreatments || []) : [];
    const roomsForPayment = bookingType !== 'spa_only' ? roomsArr : [];

    const payResult = await buildSquarePaymentLink(
      guestName, email, phone, checkIn, checkOut,
      roomsForPayment, treatmentsForPayment,
    );

    if (!payResult.ok) {
      try {
        await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
          internalNotes: notes + `\n[Square payment link failed: ${payResult.error} — send manually]`,
          bookingStatus: "pending",
        });
      } catch {
        // Non-fatal
      }

      return Response.json({
        success: false,
        error: `Payment link error: ${payResult.error}`,
        intakeId,
      });
    }

    try {
      await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
        bookingStatus: "awaiting_payment",
        source: "guest_book_now",
        squarePaymentUrl: payResult.publicUrl,
        squarePaymentLinkId: payResult.paymentLinkId || "",
        squareOrderId: payResult.orderId || "",
        internalNotes: notes + `\n[Square payment link created — awaiting payment. order=${payResult.orderId || "?"} link=${payResult.paymentLinkId || "?"}]`,
      });
    } catch {
      // Non-fatal — the payment link is the source of truth; webhook can still match by order_id.
    }

    return Response.json({
      success: true,
      type: "booking",
      bookingType,
      intakeId,
      paymentUrl: payResult.publicUrl,
      publicUrl: payResult.publicUrl,
      message: "Redirecting to payment...",
    });
  } catch (e: any) {
    console.error("[guestSubmitBooking] Unexpected error:", e);
    return Response.json(
      { success: false, error: "An unexpected error occurred. Please call us at (903) 810-6695." },
      { status: 500 },
    );
  }
});