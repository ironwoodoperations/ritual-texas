import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

function clean(v) {
  return String(v ?? "").trim();
}

function normalizeTime(raw) {
  const t = clean(raw);
  if (!t) return "";
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

function sameTime(a, b) {
  return normalizeTime(a).slice(0, 5) === normalizeTime(b).slice(0, 5);
}

function asArrayMap(obj) {
  if (!obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) return obj;
  return Object.entries(obj).map(([id, value]) => ({
    id: String(id),
    ...(typeof value === "object" && value ? value : { value }),
  }));
}

function timeToMinutes(hms) {
  const [h, m] = normalizeTime(hms).split(":").map(n => parseInt(n || "0", 10));
  return h * 60 + m;
}

function addMinutesToTime(hms, add) {
  const total = timeToMinutes(hms) + add;
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
}

async function sbRPC(url, method, params, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await resp.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch {
    throw new Error(`SimplyBook non-JSON for ${method}: ${text}`);
  }
  if (!resp.ok) throw new Error(`SimplyBook HTTP ${resp.status} for ${method}: ${text}`);
  if (json?.error) throw new Error(`SB RPC ${method}: ${JSON.stringify(json.error)}`);
  return json?.result ?? null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const me = await base44.auth.me();
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const intake = body?.intake || body || {};

    const companyLogin = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const userLogin    = Deno.env.get("SIMPLYBOOK_USER_LOGIN") || "";
    const userPassword = Deno.env.get("SIMPLYBOOK_USER_PASSWORD") || "";
    const apiSecret    = Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "";

    if (!companyLogin || !userLogin || !userPassword) {
      return Response.json(
        { error: "Missing secrets: SIMPLYBOOK_COMPANY_LOGIN, SIMPLYBOOK_USER_LOGIN, SIMPLYBOOK_USER_PASSWORD" },
        { status: 500 }
      );
    }

    if (!Array.isArray(intake?.selectedTreatments) || intake.selectedTreatments.length === 0) {
      return Response.json({ error: "No treatments selected" }, { status: 400 });
    }

    const guestName  = clean(intake?.guestName || intake?.name || intake?.clientName);
    const guestEmail = clean(intake?.email || intake?.guestEmail || "").toLowerCase();
    const guestPhone = clean(intake?.phone || intake?.guestPhone || "");

    if (!guestName) {
      return Response.json({ error: "Guest name is required" }, { status: 400 });
    }

    const loginUrl = "https://user-api.simplybook.me/login";
    const adminUrl = "https://user-api.simplybook.me/admin";

    // Step 1: Admin auth
    const userToken = await sbRPC(loginUrl, "getUserToken", [companyLogin, userLogin, userPassword]);
    if (!userToken || typeof userToken !== "string") {
      return Response.json({ error: "Failed to get SimplyBook admin token" }, { status: 500 });
    }

    const adminHeaders = { "X-Company-Login": companyLogin, "X-User-Token": userToken };

    // Step 2: Load services and providers
    const [servicesRaw, providersRaw] = await Promise.all([
      sbRPC(adminUrl, "getEventList", [], adminHeaders),
      sbRPC(adminUrl, "getUnitList", [], adminHeaders),
    ]);

    const services  = asArrayMap(servicesRaw);
    const providers = asArrayMap(providersRaw);

    const bookingsCreated = [];
    const errors = [];
    const debug = [];

    for (const rawItem of intake.selectedTreatments) {
      let entry = rawItem;
      if (typeof rawItem === "string") {
        try { entry = JSON.parse(rawItem); } catch { entry = { serviceName: rawItem }; }
      }

      const entryGuestName  = clean(entry?.guestName) || guestName;
      const entryGuestEmail = clean(entry?.email || guestEmail).toLowerCase();
      const entryGuestPhone = clean(entry?.phone || guestPhone);

      const requestedDate = clean(entry?.date || intake?.preferredTreatmentDate);
      if (!requestedDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        errors.push(`Missing/invalid date for "${clean(entry?.serviceName || entry?.name)}"`);
        continue;
      }

      let requestedTime = normalizeTime(entry?.time || intake?.preferredTreatmentTime);

      const requestedServiceId   = clean(entry?.serviceId || entry?.simplybookServiceId || entry?.id);
      const requestedServiceName = clean(entry?.serviceName || entry?.name);
      const requestedProviderId  = clean(entry?.staffId || entry?.providerId);
      const requestedProviderName = clean(entry?.staffName || intake?.preferredTherapist);
      const isFlexible = Boolean(entry?.flexibleOnTime ?? intake?.flexibleOnTime);

      // Match service
      const svc =
        services.find((s) => String(s.id) === requestedServiceId) ||
        services.find((s) => clean(s.name).toLowerCase() === requestedServiceName.toLowerCase()) ||
        services.find((s) => {
          const sn = clean(s.name).toLowerCase();
          const rn = requestedServiceName.toLowerCase();
          return sn && rn && (sn.includes(rn) || rn.includes(sn));
        });

      if (!svc) {
        errors.push(`Service not found: "${requestedServiceName || requestedServiceId}"`);
        debug.push({ stage: "service_not_found", requestedServiceName, requestedServiceId, available: services.map(s => ({ id: s.id, name: s.name })) });
        continue;
      }

      // Choose provider
      let unitId = null;
      if (requestedProviderId) {
        unitId = requestedProviderId;
      } else if (requestedProviderName) {
        const p = providers.find((p) => clean(p.name).toLowerCase() === requestedProviderName.toLowerCase());
        if (p?.id) unitId = String(p.id);
      } else if (Array.isArray(svc.unit_map) && svc.unit_map.length > 0) {
        unitId = String(svc.unit_map[0]);
      }

      // Step 3: Get available slots
      let matrix = null;
      try {
        matrix = await sbRPC(adminUrl, "getStartTimeMatrix",
          [requestedDate, requestedDate, Number(svc.id), unitId ? Number(unitId) : null, 1],
          adminHeaders
        );
      } catch (e) {
        errors.push(`Could not get slots for "${svc.name}" on ${requestedDate}: ${e.message}`);
        debug.push({ stage: "availability_failed", serviceId: svc.id, unitId, requestedDate, error: e.message });
        continue;
      }

      let slots = [];
      if (matrix && typeof matrix === "object" && matrix[requestedDate]) {
        const row = matrix[requestedDate];
        slots = (Array.isArray(row) ? row : Object.values(row)).map((x) => normalizeTime(x));
      }

      if (!slots.length) {
        errors.push(`No available slots for "${svc.name}" on ${requestedDate}`);
        debug.push({ stage: "no_slots", serviceId: svc.id, unitId, requestedDate });
        continue;
      }

      if (!requestedTime) {
        requestedTime = slots[0];
      } else {
        const matched = slots.find((t) => sameTime(t, requestedTime));
        if (matched) {
          requestedTime = matched;
        } else if (isFlexible) {
          requestedTime = slots[0];
        } else {
          errors.push(`Time ${requestedTime} unavailable for "${svc.name}" on ${requestedDate}. Available: ${slots.slice(0, 5).join(", ")}`);
          continue;
        }
      }

      // Step 4: Create or find client
      const clientPayload = { name: entryGuestName };
      if (entryGuestEmail) clientPayload.email = entryGuestEmail;
      if (entryGuestPhone) clientPayload.phone = entryGuestPhone;

      let clientId = null;
      let addClientRaw = null;

      try {
        addClientRaw = await sbRPC(adminUrl, "addClient", [clientPayload, false], adminHeaders);
        console.log("addClient raw response:", JSON.stringify(addClientRaw));

        if (typeof addClientRaw === "number") {
          clientId = addClientRaw;
        } else if (addClientRaw?.id) {
          clientId = Number(addClientRaw.id);
        } else if (addClientRaw?.client_id) {
          clientId = Number(addClientRaw.client_id);
        }

        console.log("clientId extracted:", clientId);
      } catch (e) {
        errors.push(`addClient failed for "${svc.name}": ${e.message}`);
        debug.push({ stage: "add_client_failed", clientPayload, error: e.message });
        continue;
      }

      if (!clientId || Number.isNaN(Number(clientId))) {
        errors.push(`No valid clientId from addClient for "${svc.name}"`);
        debug.push({ stage: "client_id_missing", addClientRaw, clientPayload });
        continue;
      }

      // Step 5: Book (admin flow)
      const durationMinutes = Number(entry?.duration || svc?.duration || 60);
      const startTime = normalizeTime(requestedTime);
      const endTime   = addMinutesToTime(startTime, durationMinutes);
      const additional = (entry?.additionalFields && typeof entry.additionalFields === "object") ? entry.additionalFields : {};

      let bookingResult = null;
      try {
        bookingResult = await sbRPC(adminUrl, "book",
          [Number(svc.id), unitId ? Number(unitId) : null, Number(clientId), requestedDate, startTime, requestedDate, endTime, 0, additional],
          adminHeaders
        );
      } catch (e) {
        errors.push(`Booking failed for "${svc.name}": ${e.message}`);
        debug.push({ stage: "book_failed", serviceId: svc.id, unitId, clientId, requestedDate, startTime, endTime, error: e.message });
        continue;
      }

      const bookingObj = Array.isArray(bookingResult?.bookings)
        ? bookingResult.bookings[0]
        : bookingResult?.bookings || bookingResult;

      const bookingId   = String(bookingObj?.id || bookingObj?.booking_id || bookingResult?.id || "");
      const bookingHash = String(bookingObj?.hash || bookingObj?.booking_hash || bookingResult?.hash || "");

      if (!bookingId) {
        errors.push(`No booking id returned for "${svc.name}"`);
        debug.push({ stage: "no_booking_id", bookingResult });
        continue;
      }

      let finalStatus = "created";

      // Step 6: Confirm if required
      if (bookingResult?.require_confirm === true && apiSecret && bookingHash) {
        try {
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(`${bookingId}${bookingHash}${apiSecret}`));
          const sign = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
          await sbRPC(adminUrl, "confirmBooking", [Number(bookingId), sign], adminHeaders);
          finalStatus = "confirmed";
        } catch (e) {
          finalStatus = "pending_confirmation";
          errors.push(`Booking created but confirmation failed for "${svc.name}": ${e.message}`);
        }
      } else if (bookingResult?.require_confirm === true) {
        finalStatus = "pending_confirmation";
      }

      const providerMatch = providers.find((p) => String(p.id) === String(unitId));

      const spaPayload = {
        source: "simplybook",
        simplybookBookingId: bookingId,
        simplybookBookingHash: bookingHash || "",
        clientName: entryGuestName,
        email: entryGuestEmail,
        phone: entryGuestPhone,
        serviceName: clean(svc.name) || requestedServiceName,
        service: String(svc.id),
        staffName: clean(providerMatch?.name || requestedProviderName),
        staff: unitId ? String(unitId) : "",
        startAt: `${requestedDate}T${startTime}`,
        durationMinutes,
        price: Number(entry?.price || svc?.price || 0),
        paid: false,
        status: finalStatus,
      };

      const existing = await base44.asServiceRole.entities.SpaBooking.filter({ simplybookBookingId: bookingId });
      if (existing?.length) {
        await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, spaPayload);
      } else {
        await base44.asServiceRole.entities.SpaBooking.create(spaPayload);
      }

      bookingsCreated.push({
        simplybookBookingId: bookingId,
        serviceName: spaPayload.serviceName,
        staffName: spaPayload.staffName,
        startAt: spaPayload.startAt,
        status: finalStatus,
        clientId,
      });

      debug.push({ stage: "booking_created", bookingId, serviceId: svc.id, unitId, clientId, requestedDate, startTime });
    }

    return Response.json({
      success: bookingsCreated.length > 0,
      bookings: bookingsCreated,
      errors,
      message: `${bookingsCreated.length} treatment booking${bookingsCreated.length === 1 ? "" : "s"} created`,
      debug,
    });

  } catch (e) {
    console.error("intakeBookTreatments error:", e);
    return Response.json(
      { success: false, bookings: [], errors: [e?.message || "Unknown error"], message: "SimplyBook booking failed" },
      { status: 500 }
    );
  }
});