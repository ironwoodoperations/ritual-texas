import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ── Helpers ──────────────────────────────────────────────────────────────────

function clean(s: any): string { return String(s ?? "").trim(); }
function toStandardTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 864e5));
}

function parseTreatment(raw: any): Record<string, any> {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return { name: raw, price: 0 }; }
  }
  return raw || {};
}

function normalizeTime(raw: string): string {
  const t = clean(raw);
  if (!t) return "";
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

function addMinutesToTime(hms: string, add: number): string {
  const [h, m] = normalizeTime(hms).split(":").map(n => parseInt(n || "0", 10));
  const total = h * 60 + m + add;
  const mins = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00`;
}

// ── SimplyBook JSON-RPC helper ──────────────────────────────────────────────

async function sbRPC(url: string, method: string, params: any[], headers: Record<string, string> = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await resp.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`SimplyBook non-JSON response for "${method}": ${text.slice(0, 300)}`);
  }
  if (!resp.ok) {
    throw new Error(`SimplyBook HTTP ${resp.status} for "${method}": ${text.slice(0, 300)}`);
  }
  if (json?.error) {
    throw new Error(`SimplyBook RPC error for "${method}": ${JSON.stringify(json.error)}`);
  }
  return json?.result ?? null;
}

// ── SimplyBook inline booking ───────────────────────────────────────────────

async function bookSimplyBookTreatment(
  treatmentGuestName: string,
  guestEmail: string,
  guestPhone: string,
  serviceId: string,
  providerId: string,
  date: string,
  startTime: string,
): Promise<{ ok: boolean; bookingId?: string; error?: string }> {
  const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
  const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
  const userLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
  const userPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

  if (!company) {
    return { ok: false, error: "SimplyBook credentials not configured (no company)" };
  }
  if (!userLogin || !userPassword) {
    return { ok: false, error: "SimplyBook admin credentials not configured (no SIMPLYBOOK_ADMIN_LOGIN/SIMPLYBOOK_ADMIN_PASSWORD)" };
  }

  const LOGIN_URL = "https://user-api.simplybook.me/login";
  const BASE_URL = "https://user-api.simplybook.me";
  const ADMIN_URL = "https://user-api.simplybook.me/admin/";

  // 1. Authenticate — match simplybookCallback.ts: getUserToken with 3 params (no secretKey)
  let adminToken: string | null = null;

  try {
    const result = await sbRPC(LOGIN_URL, "getUserToken", [company, userLogin, userPassword]);
    if (result && typeof result === "string") adminToken = result;
  } catch (e: any) {
    console.log("[SimplyBook] getUserToken failed:", e.message);
  }

  if (!adminToken) {
    return { ok: false, error: "SimplyBook admin auth failed — check SIMPLYBOOK_ADMIN_LOGIN / SIMPLYBOOK_ADMIN_PASSWORD" };
  }

  // Get a read token via apiKey if available, otherwise reuse admin token
  let readToken = adminToken;
  if (apiKey) {
    try {
      const result = await sbRPC(LOGIN_URL, "getToken", [company, apiKey]);
      if (result && typeof result === "string") readToken = result;
    } catch {
      // fall back to admin token
    }
  }

  const readHeaders = { "X-Company-Login": company, "X-Token": readToken, "X-User-Token": readToken };
  const adminHeaders = { "X-Company-Login": company, "X-Token": adminToken, "X-User-Token": adminToken };

  // 2. Verify service exists
  const servicesRaw = await sbRPC(BASE_URL, "getEventList", [], readHeaders);
  const svc = servicesRaw?.[serviceId];
  if (!svc) {
    return { ok: false, error: `Service ${serviceId} not found in SimplyBook` };
  }

  // 3. Resolve provider — if empty, pick first available for the slot
  const time = normalizeTime(startTime);
  let resolvedProviderId = providerId || null;

  if (!resolvedProviderId) {
    const unitIds = Array.isArray(svc.unit_map) && svc.unit_map.length > 0
      ? svc.unit_map.map(String)
      : Object.keys(await sbRPC(BASE_URL, "getUnitList", [], readHeaders) || {});

    for (const uid of unitIds) {
      try {
        const matrix = await sbRPC(BASE_URL, "getStartTimeMatrix", [date, date, serviceId, uid, 1], readHeaders);
        if (matrix?.[date]) {
          const slots = Array.isArray(matrix[date]) ? matrix[date] : Object.keys(matrix[date]);
          const normalizedSlots = slots.map((s: any) => normalizeTime(String(s)));
          if (normalizedSlots.includes(time)) {
            resolvedProviderId = uid;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!resolvedProviderId) {
      return { ok: false, error: "That time slot is no longer available" };
    }
  }

  // 4. Create client in SimplyBook
  const clientPayload: any = { name: treatmentGuestName };
  if (guestEmail) clientPayload.email = guestEmail;
  if (guestPhone) clientPayload.phone = guestPhone;

  let clientId: number | null = null;
  const addClientResult = await sbRPC(ADMIN_URL, "addClient", [clientPayload, false], adminHeaders);
  console.log("addClient response:", JSON.stringify(addClientResult));
  clientId = addClientResult?.id
    || addClientResult?.client_id
    || addClientResult?.data?.id
    || addClientResult?.result?.id
    || (typeof addClientResult === "number" ? addClientResult : null)
    || (typeof addClientResult === "string" && !isNaN(Number(addClientResult)) ? Number(addClientResult) : null);
  if (clientId) clientId = Number(clientId);

  if (!clientId) {
    return { ok: false, error: "No client ID returned from SimplyBook. Check logs for full addClient response." };
  }

  // 5. Create the booking
  const durationMinutes = Number(svc.duration || 60);
  // Strip seconds — SimplyBook expects HH:MM, not HH:MM:SS
  const bookTime = time.substring(0, 5);
  const endTime = addMinutesToTime(bookTime, durationMinutes).substring(0, 5);

  const additional = {
    predefined: {
      client: { name: treatmentGuestName, email: guestEmail, phone: guestPhone },
      fields: {},
    },
  };

  const bookPayload = [
    Number(serviceId),
    Number(resolvedProviderId),
    Number(clientId),
    date,
    bookTime,
    date,
    endTime,
    0,
    additional,
  ];

  console.log("SimplyBook booking payload:", JSON.stringify({ serviceId, providerId: resolvedProviderId, date, startTime: bookTime, clientId }));

  const bookingResult = await sbRPC(ADMIN_URL, "book", bookPayload, adminHeaders);

  console.log("SimplyBook booking response:", JSON.stringify(bookingResult));

  // 6. Extract booking ID
  const bookingObj = Array.isArray(bookingResult?.bookings) ? bookingResult.bookings[0] : bookingResult;
  const bookingId = String(bookingObj?.id || bookingObj?.booking_id || bookingResult?.id || "");

  if (!bookingId) {
    return { ok: false, error: "Booking may have been created but no ID was returned" };
  }

  return { ok: true, bookingId };
}

// ── Orchestration sub-steps ─────────────────────────────────────────────────

async function bookRoom(base44: any, payload: Record<string, any>) {
  try {
    const res = await base44.asServiceRole.functions.invoke("intakeBookHotel", {
      intake: {
        id: "guest-booking",
        guestName: payload.guestName,
        email: payload.email,
        guestEmail: payload.email,
        phone: payload.phone,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        numberOfGuests: payload.numberOfGuests,
        cloudbedsRoomTypeId: payload.cloudbedsRoomTypeId,
        roomRequested: payload.roomRequested,
        internalNotes: payload.specialRequests || "",
      },
    });
    const d = res.data || res;
    if (d?.reservationID || d?.data?.reservationID) {
      return { ok: true, reservationId: d.reservationID || d.data?.reservationID };
    }
    return { ok: false, error: d?.error || d?.message || "Cloudbeds booking returned no reservation ID" };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}


async function createAndPublishInvoice(
  base44: any,
  intakeId: string,
  payload: Record<string, any>,
) {
  // 1. Create draft
  let draftData: any;
  try {
    const draftRes = await base44.asServiceRole.functions.invoke("intakeCreateInvoiceDraft", {
      intakeId,
      intake: {
        id: intakeId,
        guestName: payload.guestName,
        email: payload.email,
        guestEmail: payload.email,
        phone: payload.phone,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        roomRequested: payload.roomRequested,
        selectedTreatments: payload.selectedTreatments || [],
        callToBookTreatments: payload.callToBookTreatments || [],
        treatmentsRequested: payload.specialRequests || "",
        taxes: {
          hotel_state: true,
          hotel_city: true,
          hotel_venue: true,
        },
      },
    });
    draftData = draftRes.data || draftRes;
  } catch (e: any) {
    return { ok: false, error: `Invoice draft failed: ${e.message}` };
  }

  if (draftData?.error) {
    return { ok: false, error: draftData.error };
  }

  const invoiceId = draftData?.invoiceId;
  if (!invoiceId) {
    return { ok: false, error: "No invoice ID returned from draft" };
  }

  // 2. Publish
  let pubData: any;
  try {
    const pubRes = await base44.asServiceRole.functions.invoke("intakePublishInvoice", {
      invoiceId,
    });
    pubData = pubRes.data || pubRes;
  } catch (e: any) {
    return { ok: false, error: `Invoice publish failed: ${e.message}`, invoiceId };
  }

  if (pubData?.error) {
    return { ok: false, error: pubData.error, invoiceId };
  }

  return {
    ok: true,
    invoiceId,
    publicUrl: pubData?.publicUrl || pubData?.invoice?.public_url || null,
  };
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
    const roomTypeId = clean(payload.cloudbedsRoomTypeId);

    if (!guestName || !email || !checkIn || !checkOut || !roomTypeId) {
      return Response.json(
        { success: false, error: "Missing required fields (name, email, dates, room)." },
        { status: 400 },
      );
    }

    // ── Separate already-booked vs needs-booking treatments ──────────────
    const rawTreatments: any[] = Array.isArray(payload.selectedTreatments) ? payload.selectedTreatments : [];
    const alreadyBooked: any[] = [];
    const needsBooking: any[]  = [];

    for (const raw of rawTreatments) {
      const t = parseTreatment(raw);
      if (t.simplybookBookingId) {
        alreadyBooked.push(t);
      } else {
        needsBooking.push(t);
      }
    }

    const hasCallToBook = Array.isArray(payload.callToBookTreatments) && payload.callToBookTreatments.length > 0;

    // ── Step 1: Create HotelTreatmentIntake record ────────────────────────
    const intakePayload = {
      guestName,
      email,
      phone,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: payload.numberOfGuests || 1,
      cloudbedsRoomTypeId: roomTypeId,
      roomRequested: payload.roomRequested || "",
      roomName: payload.roomRequested || "",
      selectedTreatments: payload.selectedTreatments || [],
      callToBookTreatments: payload.callToBookTreatments || [],
      treatmentsRequested: payload.specialRequests || "",
      hotelNotes: payload.specialRequests || "",
      howDidYouHearAboutUs: payload.howDidYouHearAboutUs || "",
      bookingStatus: hasCallToBook ? "new_inquiry" : "pending",
      internalNotes: `[Guest Online Booking — ${new Date().toISOString()}]\nSource: GuestBookNow page`,
      taxes: {
        hotel_state: true,
        hotel_city: true,
        hotel_venue: true,
      },
      preferredContactMethod: "email",
    };

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

    // ── Path A: Full Booking Sequence ─────────────────────────────────────

    // Step 2: Book room in Cloudbeds
    const cbResult = await bookRoom(base44, {
      guestName,
      email,
      phone,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: payload.numberOfGuests,
      cloudbedsRoomTypeId: roomTypeId,
      roomRequested: payload.roomRequested,
      specialRequests: payload.specialRequests,
    });

    if (cbResult.ok) {
      notes += `\n[Cloudbeds reservation created: ${cbResult.reservationId}]`;
    } else {
      notes += `\n[Cloudbeds booking failed: ${cbResult.error}]`;
    }

    // Step 3: Book SimplyBook treatments directly (inline — no function invoke)
    if (needsBooking.length > 0) {
      for (const t of needsBooking) {
        const svcId = String(t.serviceId || t.id || "");
        const provId = String(t.providerId || t.staffId || "");
        const rawTime = t.startTime || t.time || "";
        const bookTime = rawTime.substring(0, 5); // strip seconds: "09:00:00" → "09:00"
        const tGuestName = t.guestName || guestName;
        const label = `${t.serviceName || t.name || svcId} for ${tGuestName} on ${t.date} at ${toStandardTime(bookTime)}`;
        try {
          console.log(`[SimplyBook] Booking SimplyBook treatment: ${label}`);
          notes += `\n[SimplyBook] Booking SimplyBook treatment: ${label}`;

          const sbResult = await bookSimplyBookTreatment(
            tGuestName,
            email,
            phone,
            svcId,
            provId,
            t.date,
            bookTime,
          );

          if (sbResult.ok && sbResult.bookingId) {
            t.simplybookBookingId = sbResult.bookingId;
            console.log(`[SimplyBook] Booked: ${label} → ID ${sbResult.bookingId}`);
            notes += `\n[SimplyBook] Booked: ${label} → ID ${sbResult.bookingId}`;
          } else {
            console.log(`[SimplyBook] FAILED: ${label} — ${sbResult.error}`);
            notes += `\n[SimplyBook] FAILED: ${label} — ${sbResult.error}`;
          }
        } catch (e: any) {
          console.log(`[SimplyBook] ERROR: ${label} — ${e.message}`);
          notes += `\n[SimplyBook] ERROR: ${label} — ${e.message}`;
        }
      }
    }

    if (alreadyBooked.length > 0) {
      notes += `\n[SimplyBook: ${alreadyBooked.length} treatment(s) pre-booked via booking engine (${alreadyBooked.map(t => t.simplybookBookingId).join(", ")})]`;
    }

    // Update intake with progress notes
    try {
      await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
        internalNotes: notes,
      });
    } catch {
      // Non-fatal
    }

    // Step 4: Create and publish Square invoice
    const invResult = await createAndPublishInvoice(base44, intakeId, {
      guestName,
      email,
      phone,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      roomRequested: payload.roomRequested,
      selectedTreatments: payload.selectedTreatments,
      callToBookTreatments: payload.callToBookTreatments,
      specialRequests: payload.specialRequests,
    });

    if (!invResult.ok) {
      // Soft fail: flag for staff to send manually
      try {
        await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
          internalNotes: notes + `\n[Square invoice failed: ${invResult.error} — send manually]`,
          bookingStatus: "pending",
        });
      } catch {
        // Non-fatal
      }

      return Response.json({
        success: true,
        type: "request",
        intakeId,
        message: "Your booking has been received. We will send your payment link shortly.",
      });
    }

    // ── Success: save invoice ID and return public URL ────────────────────
    try {
      await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
        squareInvoiceId: invResult.invoiceId,
        bookingStatus: "pending",
      });
    } catch {
      // Non-fatal
    }

    return Response.json({
      success: true,
      type: "booking",
      intakeId,
      publicUrl: invResult.publicUrl,
      message: "Booking created. Redirecting to payment...",
    });
  } catch (e: any) {
    console.error("[guestSubmitBooking] Unexpected error:", e);
    return Response.json(
      { success: false, error: "An unexpected error occurred. Please call us at (903) 810-6695." },
      { status: 500 },
    );
  }
});
