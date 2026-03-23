import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ── Helpers ──────────────────────────────────────────────────────────────────

function clean(s: any): string { return String(s ?? "").trim(); }

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

// ── Orchestration sub-steps (each wraps an admin-only function) ──────────────

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

async function bookTreatments(
  base44: any,
  intakeId: string,
  payload: Record<string, any>,
  treatments: any[],
) {
  if (!treatments.length) return { ok: true, errors: [] };

  try {
    const res = await base44.asServiceRole.functions.invoke("intakeBookTreatments", {
      intake: {
        id: intakeId,
        guestName: payload.guestName,
        email: payload.email,
        phone: payload.phone,
        selectedTreatments: treatments,
      },
    });
    const d = res.data || res;
    return { ok: true, errors: d?.errors || [] };
  } catch (e: any) {
    return { ok: true, errors: [e.message] };
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
          sales_state: true,
          sales_city: true,
          sales_jedc: true,
          sales_county: true,
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
        needsBooking.push(typeof raw === "string" ? raw : JSON.stringify(raw));
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
        sales_state: true,
        sales_city: true,
        sales_jedc: true,
        sales_county: true,
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

    // Step 3: Book SimplyBook treatments (only those NOT already booked)
    if (needsBooking.length > 0) {
      const sbResult = await bookTreatments(base44, intakeId, {
        guestName,
        email,
        phone,
      }, needsBooking);

      if (sbResult.errors.length > 0) {
        notes += `\n[SimplyBook errors: ${sbResult.errors.join("; ")}]`;
      } else {
        notes += `\n[SimplyBook: ${needsBooking.length} treatment(s) booked]`;
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
