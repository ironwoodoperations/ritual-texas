import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clean(v: any): string {
  return String(v ?? "").trim();
}

function normalizeTime(raw: any): string {
  const t = clean(raw);
  if (!t) return "";
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

const ACUITY_BASE = "https://acuityscheduling.com/api/v1";

function acuityAuth(): string {
  const userId = Deno.env.get("ACUITY_USER_ID") || "";
  const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
  return "Basic " + btoa(userId + ":" + apiKey);
}

function acuityHeaders(): Record<string, string> {
  return {
    Authorization: acuityAuth(),
    "Content-Type": "application/json",
  };
}

async function acuityGet(path: string): Promise<any> {
  const resp = await fetch(`${ACUITY_BASE}${path}`, {
    method: "GET",
    headers: acuityHeaders(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Acuity GET ${path} failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  return resp.json();
}

async function acuityPost(path: string, body: any): Promise<any> {
  const resp = await fetch(`${ACUITY_BASE}${path}`, {
    method: "POST",
    headers: acuityHeaders(),
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Acuity POST ${path} non-JSON response (${resp.status}): ${text.slice(0, 300)}`);
  }
  if (!resp.ok) {
    throw new Error(`Acuity POST ${path} failed (${resp.status}): ${json?.message || text.slice(0, 300)}`);
  }
  return json;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const intake = body?.intake || body || {};

    // ── DEBUG: log raw intake to trace guest field values ─────────────────
    console.log('[DEBUG] intakeBookTreatments intake received:', JSON.stringify(intake));
    console.log('[DEBUG] guestName:', intake.guestName, '| email:', intake.email, '| phone:', intake.phone);

    // ── Credentials ──────────────────────────────────────────────────────
    const userId: string = (Deno.env.get("ACUITY_USER_ID") || "").trim();
    const apiKey: string = (Deno.env.get("ACUITY_API_KEY") || "").trim();

    if (!userId || !apiKey) {
      return Response.json({
        error: "Missing environment variables: ACUITY_USER_ID and/or ACUITY_API_KEY",
      }, { status: 500 });
    }

    // ── Validate input ───────────────────────────────────────────────────
    if (!Array.isArray(intake?.selectedTreatments) || intake.selectedTreatments.length === 0) {
      return Response.json({ error: "No treatments selected" }, { status: 400 });
    }

    // Primary fields from HotelTreatmentIntake entity — no placeholder fallbacks
    const guestName: string = clean(intake?.guestName || "");
    const guestEmail: string = clean(intake?.email || "").toLowerCase();
    const guestPhone: string = clean(intake?.phone || "");

    console.log(`[DEBUG] Resolved guestName: "${guestName}" | guestEmail: "${guestEmail}" | guestPhone: "${guestPhone}"`);

    if (!guestName) {
      return Response.json({ error: "Cannot book Acuity: intake is missing guestName field" }, { status: 400 });
    }
    if (!guestEmail) {
      return Response.json({ error: "Cannot book Acuity: intake is missing email field" }, { status: 400 });
    }

    console.log(`[Acuity] Booking for: ${guestName} <${guestEmail}> phone: ${guestPhone || "(none)"}`);

    // ── Load appointment types for matching ──────────────────────────────
    const appointmentTypes: any[] = await acuityGet("/appointment-types");

    const bookingsCreated: any[] = [];
    const bookingsFailed: any[] = [];
    const errors: string[] = [];
    const debug: any[] = [];

    // ── Load the intake record to check already-booked treatments ────────
    const intakeId: string = clean(intake?.id || "");
    let existingBookedIds: Set<string> = new Set();
    if (intakeId) {
      try {
        const intakeRecord: any = await base44.asServiceRole.entities.HotelTreatmentIntake.get(intakeId);
        // Build a set of already-confirmed booking IDs from SpaBooking
        const confirmedBookings: any[] = await base44.asServiceRole.entities.SpaBooking.filter({ intakeId });
        confirmedBookings.forEach((b: any) => {
          if (b.simplybookBookingId) existingBookedIds.add(String(b.simplybookBookingId));
        });
      } catch {
        // Non-fatal — proceed without skip logic
      }
    }

    // Split guest name into first/last for Acuity
    const nameParts = guestName.split(/\s+/);
    const defaultFirstName = nameParts[0] || "";
    const defaultLastName = nameParts.slice(1).join(" ") || "";

    // ── Process each treatment slot ──────────────────────────────────────
    for (const rawItem of intake.selectedTreatments) {
      let entry: any = {};
      if (typeof rawItem === "string") {
        try {
          entry = JSON.parse(rawItem);
        } catch {
          entry = { serviceName: rawItem };
        }
      } else if (typeof rawItem === "object" && rawItem) {
        entry = rawItem;
      }

      const entryName: string = clean(entry?.serviceName || entry?.name || "Unknown treatment");

      // ── Skip if already confirmed ──────────────────────────────────
      const existingBookingId: string = clean(entry?.simplybookBookingId || entry?.booking_id || "");
      if (existingBookingId && existingBookedIds.has(existingBookingId)) {
        debug.push({ stage: "skipped_already_booked", entryName, simplybookBookingId: existingBookingId });
        continue;
      }

      const entryGuestName: string = clean(entry?.guestName || "") || guestName;
      const entryGuestEmail: string = clean(entry?.email || guestEmail).toLowerCase();
      const entryGuestPhone: string = clean(entry?.phone || guestPhone);

      // Split entry guest name
      const entryNameParts = entryGuestName.split(/\s+/);
      const firstName = entryNameParts[0] || defaultFirstName;
      const lastName = entryNameParts.slice(1).join(" ") || defaultLastName;

      // ── Validate date and time are present ──────────────────────────
      const requestedDate: string = clean(entry?.date || "");
      if (!requestedDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        errors.push(`"${entryName}" needs a date (YYYY-MM-DD). Edit the record and add a date to this treatment slot.`);
        continue;
      }

      const requestedTime: string = normalizeTime(entry?.time || "");
      if (!requestedTime) {
        errors.push(`"${entryName}" needs a start time. Edit the record and add a time to this treatment slot.`);
        continue;
      }

      // ── Match service by ID then by name ────────────────────────────
      const requestedAcuityId: string = clean(entry?.acuityAppointmentTypeId || entry?.simplybookServiceId || "");
      const requestedServiceId: string = clean(entry?.serviceId || entry?.id || "");
      const requestedServiceName: string = clean(entry?.serviceName || entry?.name || "");

      let matchedType: any =
        // 1. Direct Acuity appointment type ID match
        (requestedAcuityId && appointmentTypes.find((at: any) => String(at.id) === requestedAcuityId)) ||
        // 2. Local service ID match
        (requestedServiceId && appointmentTypes.find((at: any) => String(at.id) === requestedServiceId)) ||
        // 3. Exact name match
        appointmentTypes.find((at: any) => clean(at.name).toLowerCase() === requestedServiceName.toLowerCase()) ||
        // 4. Fuzzy name match
        appointmentTypes.find((at: any) => {
          const sn = clean(at.name).toLowerCase();
          const rn = requestedServiceName.toLowerCase();
          return sn && rn && (sn.includes(rn) || rn.includes(sn));
        });

      if (!matchedType) {
        errors.push(
          `"${requestedServiceName || requestedServiceId}" not found in Acuity. ` +
          `Available types: ${appointmentTypes.map((at: any) => at.name).join(", ")}`,
        );
        debug.push({
          stage: "service_not_found",
          requestedServiceId,
          requestedServiceName,
          availableTypes: appointmentTypes.map((at: any) => ({ id: at.id, name: at.name })),
        });
        continue;
      }

      // ── Match provider (optional) ────────────────────────────────────
      const requestedCalendarId: string = clean(entry?.acuityCalendarId || entry?.staffId || "");
      let calendarId: number | undefined = requestedCalendarId ? Number(requestedCalendarId) : undefined;

      // Build the Acuity datetime string: "YYYY-MM-DDTHH:MM:SS-0500" (Central time)
      const datetime = `${requestedDate}T${requestedTime.slice(0, 8)}`;

      // ── Book the treatment via Acuity ──────────────────────────────
      const bookPayload: any = {
        appointmentTypeID: Number(matchedType.id),
        datetime,
        firstName,
        lastName,
        email: entryGuestEmail,
        phone: entryGuestPhone,
        notes: intakeId ? `Hotel RITUAL Intake ID: ${intakeId}` : "Hotel RITUAL booking",
      };

      if (calendarId) {
        bookPayload.calendarID = calendarId;
      }

      let bookingResult: any = null;
      try {
        bookingResult = await acuityPost("/appointments", bookPayload);
      } catch (e: any) {
        const errMsg = `Booking failed for "${entryName}" on ${requestedDate} at ${requestedTime}: ${e.message}`;
        errors.push(errMsg);
        bookingsFailed.push({ treatmentName: entryName, date: requestedDate, time: requestedTime, error: e.message });
        debug.push({
          stage: "book_failed",
          appointmentTypeID: matchedType.id,
          calendarId,
          requestedDate,
          requestedTime,
          error: e.message,
        });
        continue;
      }

      const bookingId: string = String(bookingResult?.id || "");

      if (!bookingId) {
        errors.push(`No booking ID returned for "${entryName}" — booking may or may not have been created`);
        debug.push({ stage: "no_booking_id", bookingResult });
        continue;
      }

      // ── Save to SpaBooking entity ────────────────────────────────────
      const durationMinutes: number = Number(entry?.duration || matchedType?.duration || 60);

      const spaPayload = {
        source: "acuity",
        simplybookBookingId: bookingId, // keep field name for backward compat
        clientName: entryGuestName,
        email: entryGuestEmail,
        phone: entryGuestPhone,
        serviceName: clean(bookingResult.type || matchedType.name || requestedServiceName),
        service: String(matchedType.id),
        staffName: clean(bookingResult.calendarName || bookingResult.calendar || ""),
        staff: bookingResult.calendarID ? String(bookingResult.calendarID) : "",
        startAt: `${requestedDate}T${requestedTime}`,
        durationMinutes,
        price: Number(entry?.price || matchedType?.price || 0),
        paid: false,
        status: "confirmed",
      };

      try {
        const existing = await base44.asServiceRole.entities.SpaBooking.filter({ simplybookBookingId: bookingId });
        if (existing?.length) {
          await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, spaPayload);
        } else {
          await base44.asServiceRole.entities.SpaBooking.create(spaPayload);
        }
      } catch {
        // Non-fatal — booking was created in Acuity, just couldn't mirror it locally
      }

      bookingsCreated.push({
        simplybookBookingId: bookingId,
        serviceName: spaPayload.serviceName,
        staffName: spaPayload.staffName,
        startAt: spaPayload.startAt,
        status: "confirmed",
      });

      debug.push({
        stage: "booking_created",
        bookingId,
        appointmentTypeID: matchedType.id,
        calendarId: bookingResult.calendarID,
        requestedDate,
        requestedTime,
      });
    }

    // ── Persist failed treatments back to intake record ──────────────────
    if (intakeId) {
      try {
        await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
          simplybook_failed_treatments: bookingsFailed,
        });
      } catch {
        // Non-fatal
      }
    }

    return Response.json({
      success: bookingsCreated.length > 0,
      bookings: bookingsCreated,
      errors,
      failed: bookingsFailed,
      message: bookingsCreated.length > 0
        ? `${bookingsCreated.length} treatment booking${bookingsCreated.length === 1 ? "" : "s"} created in Acuity`
        : errors.length > 0
          ? `No bookings created. ${errors.length} error${errors.length === 1 ? "" : "s"} — see details.`
          : "No bookings created",
      debug,
    });
  } catch (e: any) {
    return Response.json({
      success: false,
      bookings: [],
      errors: [e?.message || "Unknown error"],
      message: "Acuity booking failed — see errors for details",
    }, { status: 500 });
  }
});
