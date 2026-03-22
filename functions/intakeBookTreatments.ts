import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const me = await base44.auth.me();
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const intake = body?.intake || body || {};

    // ── Credentials ────────────────────────────────────────────────────────
    const company = (Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "").trim();
    const apiKey  = (Deno.env.get("SIMPLYBOOK_API_KEY") || "").trim();

    if (!company || !apiKey) {
      return Response.json({
        error: "Missing environment variables: SIMPLYBOOK_COMPANY_LOGIN and/or SIMPLYBOOK_API_KEY",
      }, { status: 500 });
    }

    // ── Debug mode: test auth and return service list ───────────────────────
    if (body?._debugAuth) {
      const dUserLogin = (Deno.env.get("SIMPLYBOOK_USER_LOGIN") || "").trim();
      const dUserPass  = (Deno.env.get("SIMPLYBOOK_USER_PASSWORD") || "").trim();
      const dSecretKey = (Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "").trim();
      const LOGIN_URL_D = "https://user-api.simplybook.me/login";
      const BASE_URL_D  = "https://user-api.simplybook.me";
      const [pubTok, admTok] = await Promise.all([
        sbRPC(LOGIN_URL_D, "getToken", [company, apiKey]).catch(e => ({ error: e.message })),
        sbRPC(LOGIN_URL_D, "getUserToken", [company, dUserLogin, dUserPass, dSecretKey]).catch(e => ({ error: e.message })),
      ]);
      const adminOk = typeof admTok === "string";
      const rTok = adminOk ? admTok : "";
      const rHeaders = { "X-Company-Login": company, "X-Token": rTok, "X-User-Token": rTok };
      const services  = adminOk ? await sbRPC(BASE_URL_D, "getEventList", [], rHeaders).catch(() => null) : null;
      const providers = adminOk ? await sbRPC(BASE_URL_D, "getUnitList", [], rHeaders).catch(() => null) : null;
      return Response.json({
        publicTokenOk: typeof pubTok === "string",
        adminTokenOk: adminOk,
        publicTokenError: typeof pubTok !== "string" ? pubTok : null,
        adminTokenError: !adminOk ? admTok : null,
        services: services ? asArrayMap(services).map(s => ({ id: s.id, name: s.name })) : null,
        providers: providers ? asArrayMap(providers).map(p => ({ id: p.id, name: p.name })) : null,
      });
    }

    // ── Validate input ─────────────────────────────────────────────────────
    if (!Array.isArray(intake?.selectedTreatments) || intake.selectedTreatments.length === 0) {
      return Response.json({ error: "No treatments selected" }, { status: 400 });
    }

    const guestName  = clean(intake?.guestName || intake?.name);
    const guestEmail = clean(intake?.email || intake?.guestEmail || "").toLowerCase();
    const guestPhone = clean(intake?.phone || intake?.guestPhone || "");

    if (!guestName) {
      return Response.json({ error: "Guest name is required" }, { status: 400 });
    }

    // ── Authenticate ───────────────────────────────────────────────────────
    // Use getToken + API key — same pattern as all other working SimplyBook functions
    const LOGIN_URL = "https://user-api.simplybook.me/login";
    const BASE_URL  = "https://user-api.simplybook.me";
    const ADMIN_URL = "https://user-api.simplybook.me/admin/";

    const userLogin = (Deno.env.get("SIMPLYBOOK_USER_LOGIN") || "").trim();
    const userPass  = (Deno.env.get("SIMPLYBOOK_USER_PASSWORD") || "").trim();
    const secretKey = (Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "").trim();

    if (!userLogin || !userPass || !secretKey) {
      return Response.json({
        error: "Missing env vars for admin write access: SIMPLYBOOK_USER_LOGIN, SIMPLYBOOK_USER_PASSWORD, SIMPLYBOOK_SECRET_KEY are all required to book treatments.",
      }, { status: 500 });
    }

    // Public token — for reads (getEventList, getUnitList)
    // Admin token — for writes (addClient, book) — requires secret key
    const [publicToken, adminToken] = await Promise.all([
      sbRPC(LOGIN_URL, "getToken", [company, apiKey]).catch(() => null),
      sbRPC(LOGIN_URL, "getUserToken", [company, userLogin, userPass, secretKey]),
    ]);

    if (!adminToken || typeof adminToken !== "string") {
      return Response.json({
        error: "SimplyBook admin authentication failed. Check SIMPLYBOOK_USER_LOGIN, SIMPLYBOOK_USER_PASSWORD, and SIMPLYBOOK_SECRET_KEY.",
        detail: adminToken,
      }, { status: 500 });
    }

    // Use whichever token is available for reads; use admin token for writes
    const readToken = (typeof publicToken === "string" && publicToken) ? publicToken : adminToken;

    const readHeaders = {
      "X-Company-Login": company,
      "X-Token": readToken,
      "X-User-Token": readToken,
    };

    const adminHeaders = {
      "X-Company-Login": company,
      "X-Token": adminToken,
      "X-User-Token": adminToken,
    };

    // ── Load services and providers ────────────────────────────────────────
    // Use BASE_URL (not /admin/) for read operations — this is the working pattern
    const [servicesRaw, providersRaw] = await Promise.all([
      sbRPC(BASE_URL, "getEventList", [], readHeaders),
      sbRPC(BASE_URL, "getUnitList", [], readHeaders),
    ]);

    const services  = asArrayMap(servicesRaw);
    const providers = asArrayMap(providersRaw);

    const bookingsCreated = [];
    const errors = [];
    const debug = [];

    // ── Process each treatment slot ────────────────────────────────────────
    for (const rawItem of intake.selectedTreatments) {
      let entry = {};
      if (typeof rawItem === "string") {
        try { entry = JSON.parse(rawItem); } catch { entry = { serviceName: rawItem }; }
      } else if (typeof rawItem === "object" && rawItem) {
        entry = rawItem;
      }

      const entryName       = clean(entry?.serviceName || entry?.name || "Unknown treatment");
      const entryGuestName  = clean(entry?.guestName || "") || guestName;
      const entryGuestEmail = clean(entry?.email || guestEmail).toLowerCase();
      const entryGuestPhone = clean(entry?.phone || guestPhone);

      // ── Validate date and time are present ────────────────────────────
      const requestedDate = clean(entry?.date || "");
      if (!requestedDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        errors.push(`"${entryName}" needs a date (YYYY-MM-DD). Edit the record and add a date to this treatment slot.`);
        continue;
      }

      const requestedTime = normalizeTime(entry?.time || "");
      if (!requestedTime) {
        errors.push(`"${entryName}" needs a start time. Edit the record and add a time to this treatment slot.`);
        continue;
      }

      // ── Match service by ID then by name ──────────────────────────────
      const requestedServiceId   = clean(entry?.serviceId || entry?.simplybookServiceId || entry?.id || "");
      const requestedServiceName = clean(entry?.serviceName || entry?.name || "");

      let svc = services.find(s => requestedServiceId && String(s.id) === requestedServiceId);
      if (!svc && requestedServiceName) {
        svc = services.find(s =>
          clean(s.name).toLowerCase() === requestedServiceName.toLowerCase()
        );
        if (!svc) {
          // Fuzzy fallback: partial name match
          svc = services.find(s =>
            clean(s.name).toLowerCase().includes(requestedServiceName.toLowerCase()) ||
            requestedServiceName.toLowerCase().includes(clean(s.name).toLowerCase())
          );
        }
      }

      if (!svc) {
        errors.push(
          `"${requestedServiceName || requestedServiceId}" not found in SimplyBook. ` +
          `Available services: ${services.map(s => s.name).join(", ")}`
        );
        debug.push({ stage: "service_not_found", requestedServiceId, requestedServiceName, availableServices: services.map(s => ({ id: s.id, name: s.name })) });
        continue;
      }

      // ── Match provider (optional) ──────────────────────────────────────
      const requestedProviderName = clean(entry?.staffName || intake?.therapistAssigned || "");
      let unitId = null;

      if (requestedProviderName) {
        const providerMatch = providers.find(p =>
          clean(p.name).toLowerCase() === requestedProviderName.toLowerCase() ||
          clean(p.name).toLowerCase().includes(requestedProviderName.toLowerCase())
        );
        if (providerMatch) unitId = String(providerMatch.id);
      }
      // If no provider match, unitId stays null — SimplyBook will auto-assign

      // ── Create or find client ─────────────────────────────────────────
      const clientPayload = { name: entryGuestName };
      if (entryGuestEmail) clientPayload.email = entryGuestEmail;
      if (entryGuestPhone) clientPayload.phone = entryGuestPhone;

      let clientId = null;
      try {
        // addClient is a write operation — use ADMIN_URL
        const addClientResult = await sbRPC(ADMIN_URL, "addClient", [clientPayload, false], adminHeaders);
        if (typeof addClientResult === "number") {
          clientId = addClientResult;
        } else if (addClientResult && typeof addClientResult === "object") {
          clientId = Number(addClientResult.id || addClientResult.client_id || 0) || null;
        }
      } catch (e) {
        errors.push(`Could not create client for "${entryName}": ${e.message}`);
        debug.push({ stage: "add_client_failed", clientPayload, error: e.message });
        continue;
      }

      if (!clientId) {
        errors.push(`No client ID returned for "${entryName}" — cannot book without a valid client`);
        continue;
      }

      // ── Book the treatment ────────────────────────────────────────────
      const durationMinutes = Number(entry?.duration || svc?.duration || svc?.duration_minutes || 60);
      const startTime = normalizeTime(requestedTime);
      const endTime   = addMinutesToTime(startTime, durationMinutes);

      const additional = {
        predefined: {
          client: { name: entryGuestName, email: entryGuestEmail, phone: entryGuestPhone },
          fields: {},
        },
      };

      // book signature: (eventId, unitId, clientId, startDate, startTime, endDate, endTime, count, additional)
      const bookPayload = [
        Number(svc.id),
        unitId ? Number(unitId) : null,
        Number(clientId),
        requestedDate,
        startTime,
        requestedDate,
        endTime,
        0,
        additional,
      ];

      let bookingResult = null;
      try {
        // book is a write operation — use ADMIN_URL
        bookingResult = await sbRPC(ADMIN_URL, "book", bookPayload, adminHeaders);
      } catch (e) {
        errors.push(`Booking failed for "${entryName}" on ${requestedDate} at ${startTime}: ${e.message}`);
        debug.push({ stage: "book_failed", serviceId: svc.id, unitId, clientId, requestedDate, startTime, endTime, error: e.message });
        continue;
      }

      // Extract booking ID from various response shapes SimplyBook may return
      const bookingObj = Array.isArray(bookingResult?.bookings)
        ? bookingResult.bookings[0]
        : bookingResult;

      const bookingId = String(
        bookingObj?.id ||
        bookingObj?.booking_id ||
        bookingResult?.id || ""
      );

      if (!bookingId) {
        errors.push(`No booking ID returned for "${entryName}" — booking may or may not have been created`);
        debug.push({ stage: "no_booking_id", bookingResult });
        continue;
      }

      const bookingHash = String(bookingObj?.hash || bookingObj?.booking_hash || "");

      // ── Save to SpaBooking entity ──────────────────────────────────────
      const spaPayload = {
        source: "simplybook",
        simplybookBookingId: bookingId,
        simplybookBookingHash: bookingHash,
        clientName: entryGuestName,
        email: entryGuestEmail,
        phone: entryGuestPhone,
        serviceName: clean(svc.name) || requestedServiceName,
        service: String(svc.id),
        staffName: unitId ? clean(providers.find(p => String(p.id) === unitId)?.name || "") : "",
        staff: unitId || "",
        startAt: `${requestedDate}T${startTime}`,
        durationMinutes,
        price: Number(entry?.price || svc?.price || 0),
        paid: false,
        status: "created",
      };

      try {
        const existing = await base44.asServiceRole.entities.SpaBooking.filter({ simplybookBookingId: bookingId });
        if (existing?.length) {
          await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, spaPayload);
        } else {
          await base44.asServiceRole.entities.SpaBooking.create(spaPayload);
        }
      } catch {
        // Non-fatal — booking was created in SimplyBook, just couldn't mirror it locally
      }

      bookingsCreated.push({
        simplybookBookingId: bookingId,
        serviceName: spaPayload.serviceName,
        staffName: spaPayload.staffName,
        startAt: spaPayload.startAt,
        status: "created",
        clientId,
      });

      debug.push({ stage: "booking_created", bookingId, serviceId: svc.id, unitId, clientId, requestedDate, startTime });
    }

    return Response.json({
      success: bookingsCreated.length > 0,
      bookings: bookingsCreated,
      errors,
      message: bookingsCreated.length > 0
        ? `${bookingsCreated.length} treatment booking${bookingsCreated.length === 1 ? "" : "s"} created in SimplyBook`
        : errors.length > 0
          ? `No bookings created. ${errors.length} error${errors.length === 1 ? "" : "s"} — see details.`
          : "No bookings created",
      debug,
    });

  } catch (e) {
    return Response.json({
      success: false,
      bookings: [],
      errors: [e?.message || "Unknown error"],
      message: "SimplyBook booking failed — see errors for details",
    }, { status: 500 });
  }
});