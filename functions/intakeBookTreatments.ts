import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import md5 from "npm:blueimp-md5@2.19.0";

function clean(v) {
  return String(v ?? "").trim();
}

function normalizeEmail(v) {
  return clean(v).toLowerCase();
}

function normalizeTime(raw) {
  const t = clean(raw);
  if (!t) return "";
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

function sameTime(a, b) {
  const aa = normalizeTime(a);
  const bb = normalizeTime(b);
  return aa === bb || aa.slice(0, 5) === bb.slice(0, 5);
}

function ensureDate(dateStr) {
  const d = clean(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new Error(`Invalid date format "${d}". Expected YYYY-MM-DD`);
  }
  return d;
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
  const t = normalizeTime(hms);
  const [h, m] = t.split(":").map((n) => parseInt(n || "0", 10));
  return h * 60 + m;
}

function minutesToTime(mins) {
  const m = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

function addMinutesToTime(hms, add) {
  return minutesToTime(timeToMinutes(hms) + add);
}

async function sbRPC(url, method, params, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  const text = await resp.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`SimplyBook returned non-JSON for ${method}: ${text}`);
  }

  if (!resp.ok) {
    throw new Error(`SimplyBook HTTP ${resp.status} for ${method}: ${text}`);
  }

  if (json?.error) {
    throw new Error(`SimplyBook ${method} error: ${JSON.stringify(json.error)}`);
  }

  return json?.result ?? null;
}

async function safeGetRequireFields(adminUrl, headers) {
  try {
    const val = await sbRPC(adminUrl, "getCompanyParam", ["require_fields"], headers);
    return clean(val).toLowerCase();
  } catch {
    return "";
  }
}

async function tryFindExistingClientId(adminUrl, headers, email, phone, name) {
  try {
    const clients = await sbRPC(adminUrl, "getClientList", [], headers);
    const rows = asArrayMap(clients);
    const emailLc = normalizeEmail(email);
    const nameLc = clean(name).toLowerCase();
    const found =
      (emailLc && rows.find((c) => normalizeEmail(c.email) === emailLc)) ||
      (phone && rows.find((c) => clean(c.phone) === clean(phone))) ||
      (nameLc && rows.find((c) => clean(c.name).toLowerCase() === nameLc));
    return found?.id ? Number(found.id) : null;
  } catch {
    return null;
  }
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

    // Use existing secrets (SIMPLYBOOK_ADMIN_LOGIN / SIMPLYBOOK_ADMIN_PASSWORD)
    const companyLogin = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const userLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const userPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";
    const apiSecret = Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "";

    if (!companyLogin || !userLogin || !userPassword) {
      return Response.json(
        { error: "Missing SimplyBook env vars: SIMPLYBOOK_COMPANY_LOGIN, SIMPLYBOOK_ADMIN_LOGIN, SIMPLYBOOK_ADMIN_PASSWORD" },
        { status: 500 }
      );
    }

    if (!Array.isArray(intake?.selectedTreatments) || intake.selectedTreatments.length === 0) {
      return Response.json({ error: "No treatments selected on intake.selectedTreatments" }, { status: 400 });
    }

    const guestName = clean(intake?.guestName) || clean(intake?.name) || clean(intake?.clientName);
    const guestEmail = normalizeEmail(intake?.email || intake?.guestEmail || intake?.clientEmail);
    const guestPhone = clean(intake?.phone || intake?.guestPhone || intake?.clientPhone);

    if (!guestName) {
      return Response.json({ error: "Guest name is required" }, { status: 400 });
    }

    const loginUrl = "https://user-api.simplybook.me/login";
    const publicUrl = "https://user-api.simplybook.me";
    const adminUrl = "https://user-api.simplybook.me/admin/";

    // Admin auth
    const userToken = await sbRPC(loginUrl, "getUserToken", [companyLogin, userLogin, userPassword]);
    if (!userToken || typeof userToken !== "string") {
      return Response.json({ error: "Failed to obtain SimplyBook admin token" }, { status: 500 });
    }

    const adminHeaders = { "X-Company-Login": companyLogin, "X-User-Token": userToken };
    const publicHeaders = { "X-Company-Login": companyLogin, "X-User-Token": userToken };

    const [servicesRaw, providersRaw, requireFields] = await Promise.all([
      sbRPC(publicUrl, "getEventList", [], publicHeaders),
      sbRPC(publicUrl, "getUnitList", [], publicHeaders),
      safeGetRequireFields(adminUrl, adminHeaders),
    ]);

    const services = asArrayMap(servicesRaw);
    const providers = asArrayMap(providersRaw);

    const bookingsCreated = [];
    const errors = [];
    const debug = [];

    for (const rawItem of intake.selectedTreatments) {
      let entry = rawItem;
      if (typeof rawItem === "string") {
        try { entry = JSON.parse(rawItem); } catch { entry = { serviceName: rawItem }; }
      }

      const entryGuestName = clean(entry?.guestName) || guestName;
      const entryGuestEmail = normalizeEmail(entry?.email || guestEmail);
      const entryGuestPhone = clean(entry?.phone || guestPhone);

      let requestedDate;
      try {
        requestedDate = ensureDate(clean(entry?.date || intake?.preferredTreatmentDate));
      } catch (e) {
        errors.push(`Missing/invalid date for "${clean(entry?.serviceName || entry?.name)}": ${e.message}`);
        continue;
      }

      let requestedTime = normalizeTime(entry?.time || intake?.preferredTreatmentTime);

      const requestedServiceId = clean(entry?.serviceId || entry?.simplybookServiceId || entry?.id);
      const requestedServiceName = clean(entry?.serviceName || entry?.name);
      const requestedProviderId = clean(entry?.staffId || entry?.providerId || entry?.simplybookProviderId);
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
        debug.push({ stage: "service_match_failed", requestedServiceId, requestedServiceName, availableServices: services.map(s => ({ id: s.id, name: s.name })) });
        continue;
      }

      // Choose provider
      let unitId = null;
      if (requestedProviderId) {
        unitId = requestedProviderId;
      } else if (requestedProviderName) {
        const provider = providers.find((p) => clean(p.name).toLowerCase() === requestedProviderName.toLowerCase());
        if (provider?.id) unitId = String(provider.id);
      } else if (Array.isArray(svc.unit_map) && svc.unit_map.length > 0) {
        unitId = String(svc.unit_map[0]);
      }

      // Get available slots
      let matrix = null;
      try {
        matrix = await sbRPC(
          publicUrl, "getStartTimeMatrix",
          [requestedDate, requestedDate, Number(svc.id), unitId ? Number(unitId) : null, 1],
          publicHeaders
        );
      } catch (e) {
        errors.push(`Could not get slots for "${svc.name}" on ${requestedDate}: ${e.message}`);
        debug.push({ stage: "availability_failed", serviceId: svc.id, unitId, requestedDate, error: e.message });
        continue;
      }

      let slots = [];
      if (matrix && typeof matrix === "object" && matrix[requestedDate]) {
        const row = matrix[requestedDate];
        slots = Array.isArray(row)
          ? row.map((x) => normalizeTime(x))
          : Object.values(row).map((x) => normalizeTime(x));
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
          errors.push(`Time ${requestedTime} not available for "${svc.name}" on ${requestedDate}. Available: ${slots.slice(0, 5).join(", ")}`);
          debug.push({ stage: "slot_not_available", requestedTime, available: slots, requestedDate, serviceId: svc.id });
          continue;
        }
      }

      // Validate required fields
      const clientPayload = { name: entryGuestName };
      if (entryGuestEmail) clientPayload.email = entryGuestEmail;
      if (entryGuestPhone) clientPayload.phone = entryGuestPhone;

      if (requireFields.includes("email") && !clientPayload.email) {
        errors.push(`Email required by SimplyBook for "${svc.name}"`);
        continue;
      }
      if (requireFields.includes("phone") && !clientPayload.phone) {
        errors.push(`Phone required by SimplyBook for "${svc.name}"`);
        continue;
      }

      // Find or create client
      let clientId = await tryFindExistingClientId(adminUrl, adminHeaders, clientPayload.email || "", clientPayload.phone || "", clientPayload.name);

      if (!clientId) {
        try {
          const result = await sbRPC(adminUrl, "addClient", [clientPayload, false], adminHeaders);
          if (typeof result === "number") {
            clientId = result;
          } else if (result?.id) {
            clientId = Number(result.id);
          } else if (result?.client_id) {
            clientId = Number(result.client_id);
          }
        } catch (e) {
          errors.push(`Could not create client for "${svc.name}": ${e.message}`);
          debug.push({ stage: "add_client_failed", clientPayload, serviceId: svc.id, error: e.message });
          continue;
        }
      }

      if (!clientId || Number.isNaN(Number(clientId))) {
        errors.push(`No valid client id for "${svc.name}"`);
        debug.push({ stage: "client_id_missing", clientPayload, serviceId: svc.id, clientId });
        continue;
      }

      // Build booking params
      const durationMinutes = Number(entry?.duration || svc?.duration || 60);
      const startDate = requestedDate;
      const startTime = normalizeTime(requestedTime);
      const endDate = requestedDate;
      const endTime = addMinutesToTime(startTime, durationMinutes);
      const additional = (entry?.additionalFields && typeof entry.additionalFields === "object") ? entry.additionalFields : {};

      let bookingResult = null;
      try {
        bookingResult = await sbRPC(
          adminUrl, "book",
          [Number(svc.id), unitId ? Number(unitId) : null, Number(clientId), startDate, startTime, endDate, endTime, 0, additional],
          adminHeaders
        );
      } catch (e) {
        errors.push(`Booking failed for "${svc.name}": ${e.message}`);
        debug.push({ stage: "book_failed", payload: { eventId: Number(svc.id), unitId, clientId, startDate, startTime, endDate, endTime }, error: e.message });
        continue;
      }

      const bookingObj = Array.isArray(bookingResult?.bookings)
        ? bookingResult.bookings[0]
        : bookingResult?.bookings || bookingResult;

      const bookingId = String(bookingObj?.id || bookingObj?.booking_id || bookingResult?.id || "");
      const bookingHash = String(bookingObj?.hash || bookingObj?.booking_hash || bookingResult?.hash || "");

      if (!bookingId) {
        errors.push(`No booking id returned for "${svc.name}"`);
        debug.push({ stage: "no_booking_id", bookingResult, serviceId: svc.id });
        continue;
      }

      let finalStatus = "created";

      // Confirm if required
      if (bookingResult?.require_confirm === true && apiSecret && bookingHash) {
        try {
          const sign = md5(`${bookingId}${bookingHash}${apiSecret}`);
          await sbRPC(publicUrl, "confirmBooking", [Number(bookingId), sign], publicHeaders);
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
        startAt: `${startDate}T${startTime}`,
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

      debug.push({ stage: "booking_created", bookingId, serviceId: svc.id, unitId, clientId, startDate, startTime });
    }

    return Response.json({
      success: bookingsCreated.length > 0,
      bookings: bookingsCreated,
      errors,
      message: `${bookingsCreated.length} treatment booking${bookingsCreated.length === 1 ? "" : "s"} created`,
      debug,
    });
  } catch (e) {
    console.error("intakeBookTreatments fatal error:", e);
    return Response.json(
      { success: false, bookings: [], errors: [e?.message || "Unknown error"], message: "SimplyBook intake booking failed" },
      { status: 500 }
    );
  }
});