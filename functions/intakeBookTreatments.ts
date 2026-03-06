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
  const aa = normalizeTime(a);
  const bb = normalizeTime(b);
  return aa === bb || aa.slice(0, 5) === bb.slice(0, 5);
}

// SimplyBook JSON-RPC helper
async function sbRPC(url, method, params, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const text = await resp.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`SimplyBook returned non-JSON: ${text}`);
  }

  if (!resp.ok) {
    throw new Error(`SimplyBook HTTP ${resp.status}: ${text}`);
  }

  if (json?.error) {
    throw new Error(`SimplyBook ${method} error: ${JSON.stringify(json.error)}`);
  }

  return json?.result ?? null;
}

function asArrayMap(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.entries(obj).map(([id, value]) => ({
    id: String(id),
    ...value,
  }));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const { intake } = await req.json();

    const guestName =
      clean(intake?.guestName) ||
      clean(intake?.name) ||
      clean(intake?.clientName);
    const guestEmail = clean(
      intake?.email || intake?.guestEmail || intake?.clientEmail
    ).toLowerCase();
    const guestPhone = clean(
      intake?.phone || intake?.guestPhone || intake?.clientPhone
    );

    if (!guestName) {
      return Response.json({ error: "Guest name required" }, { status: 400 });
    }

    if (
      !Array.isArray(intake?.selectedTreatments) ||
      intake.selectedTreatments.length === 0
    ) {
      return Response.json({ error: "No treatments selected" }, { status: 400 });
    }

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const apiSecret = Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "";

    if (!company || !apiKey) {
      return Response.json(
        { error: "Missing SimplyBook secrets: SIMPLYBOOK_COMPANY_LOGIN / SIMPLYBOOK_API_KEY" },
        { status: 500 }
      );
    }

    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

    const loginUrl = "https://user-api.simplybook.me/login";
    const apiUrl = "https://user-api.simplybook.me";
    const adminApiUrl = "https://user-api.simplybook.me/admin";

    // 1) Get public token for reading services/slots
    const token = await sbRPC(loginUrl, "getToken", [company, apiKey]);
    if (!token || typeof token !== "string") {
      return Response.json(
        { error: "Failed to get SimplyBook token" },
        { status: 500 }
      );
    }

    // 2) Get admin (user) token for creating bookings
    const adminToken = await sbRPC(loginUrl, "getUserToken", [company, adminLogin, adminPassword]);
    if (!adminToken || typeof adminToken !== "string") {
      return Response.json(
        { error: "Failed to get SimplyBook admin token - check SIMPLYBOOK_ADMIN_LOGIN / SIMPLYBOOK_ADMIN_PASSWORD" },
        { status: 500 }
      );
    }

    const sbHeaders = {
      "X-Company-Login": company,
      "X-Token": token,
    };

    const sbAdminHeaders = {
      "X-Company-Login": company,
      "X-User-Token": adminToken,
    };

    // 2) Pull fresh services + performers
    const [servicesRaw, performersRaw] = await Promise.all([
      sbRPC(apiUrl, "getEventList", [], sbHeaders),
      sbRPC(apiUrl, "getUnitList", [], sbHeaders),
    ]);

    const services = asArrayMap(servicesRaw);
    const performers = asArrayMap(performersRaw);

    const created = [];
    const errors = [];

    for (const rawItem of intake.selectedTreatments) {
      let entry = rawItem;

      if (typeof rawItem === "string") {
        try {
          entry = JSON.parse(rawItem);
        } catch {
          entry = { serviceName: rawItem };
        }
      }

      const entryGuestName = clean(entry?.guestName) || guestName;
      const entryGuestEmail = clean(entry?.email) || guestEmail;
      const entryGuestPhone = clean(entry?.phone) || guestPhone;

      const requestedDate = clean(entry?.date || intake?.preferredTreatmentDate);
      let requestedTime = normalizeTime(
        entry?.time || intake?.preferredTreatmentTime
      );

      const serviceId = clean(entry?.serviceId || entry?.id);
      const serviceName = clean(entry?.serviceName || entry?.name);
      const requestedStaffId = clean(entry?.staffId);
      const requestedStaffName =
        clean(entry?.staffName) || clean(intake?.preferredTherapist);
      const isFlexible = Boolean(intake?.flexibleOnTime);

      if (!requestedDate) {
        errors.push(`Missing date for "${serviceName || serviceId || "treatment"}"`);
        continue;
      }

      // Match service
      let svc =
        services.find((s) => String(s.id) === String(serviceId)) ||
        services.find(
          (s) => String(s.name || "").toLowerCase() === serviceName.toLowerCase()
        ) ||
        services.find(
          (s) =>
            String(s.name || "").toLowerCase().includes(serviceName.toLowerCase()) ||
            serviceName.toLowerCase().includes(String(s.name || "").toLowerCase())
        );

      if (!svc) {
        errors.push(`Service not found in SimplyBook: "${serviceName || serviceId}"`);
        continue;
      }

      // Decide provider/unit
      let unitId = null;

      if (requestedStaffId) {
        unitId = String(requestedStaffId);
      } else if (requestedStaffName) {
        const perf = performers.find(
          (p) => String(p.name || "").toLowerCase() === requestedStaffName.toLowerCase()
        );
        if (perf) unitId = String(perf.id);
      } else if (Array.isArray(svc.unit_map) && svc.unit_map.length > 0) {
        unitId = String(svc.unit_map[0]);
      }

      // 3) Validate availability
      let matrix = {};
      try {
        matrix = await sbRPC(
          apiUrl,
          "getStartTimeMatrix",
          [requestedDate, requestedDate, Number(svc.id), unitId ? Number(unitId) : null, 1],
          sbHeaders
        );
      } catch (e) {
        errors.push(`Could not load slots for "${svc.name}" on ${requestedDate}: ${e.message}`);
        continue;
      }

      let slots = [];
      if (matrix && typeof matrix === "object" && matrix[requestedDate]) {
        slots = Array.isArray(matrix[requestedDate])
          ? matrix[requestedDate].map((t) => normalizeTime(t))
          : Object.values(matrix[requestedDate]).map((t) => normalizeTime(t));
      }

      if (!slots.length) {
        errors.push(`No available slots for "${svc.name}" on ${requestedDate}`);
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
          errors.push(
            `Requested time ${requestedTime} is not available for "${svc.name}" on ${requestedDate}`
          );
          continue;
        }
      }

      // 4) Build client data and book via public API (no client_id needed)
      const clientData = { name: entryGuestName };
      if (entryGuestEmail) clientData.email = entryGuestEmail;
      if (entryGuestPhone) clientData.phone = entryGuestPhone;

      const additional =
        entry?.additionalFields && typeof entry.additionalFields === "object"
          ? entry.additionalFields
          : {};

      let bookingResult = null;

      try {
        // Use public API endpoint with public token — this accepts client data directly
        bookingResult = await sbRPC(
          apiUrl,
          "book",
          [
            Number(svc.id),
            unitId ? Number(unitId) : null,
            requestedDate,
            requestedTime,
            clientData,
            additional,
          ],
          sbHeaders
        );
      } catch (e) {
        errors.push(`Booking failed for "${svc.name}": ${e.message}`);
        continue;
      }

      // Normalize booking response
      const bookingObj = Array.isArray(bookingResult?.bookings)
        ? bookingResult.bookings[0]
        : bookingResult?.bookings
        ? bookingResult.bookings
        : bookingResult;

      const bookingId = String(
        bookingObj?.id || bookingObj?.booking_id || bookingResult?.id || ""
      );
      const bookingHash = String(
        bookingObj?.hash || bookingObj?.booking_hash || bookingResult?.hash || ""
      );

      if (!bookingId) {
        errors.push(`SimplyBook returned no booking id for "${svc.name}"`);
        continue;
      }

      let finalStatus = "created";

      // 5) Confirm if required
      if (bookingResult?.require_confirm === true && apiSecret && bookingHash) {
        try {
          // Simple MD5-like sign using Web Crypto (SHA-256 fallback since no md5 dep)
          const signStr = `${bookingId}${bookingHash}${apiSecret}`;
          const encoder = new TextEncoder();
          const data = encoder.encode(signStr);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const sign = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
          await sbRPC(apiUrl, "confirmBooking", [Number(bookingId), sign], sbHeaders);
          finalStatus = "confirmed";
        } catch (e) {
          finalStatus = "pending_confirmation";
          errors.push(`Booking created but confirmation failed for "${svc.name}": ${e.message}`);
        }
      } else if (bookingResult?.require_confirm === true) {
        finalStatus = "pending_confirmation";
      }

      const spaPayload = {
        source: "simplybook",
        simplybookBookingId: bookingId,
        simplybookBookingHash: bookingHash || "",
        clientName: entryGuestName,
        email: entryGuestEmail,
        phone: entryGuestPhone,
        serviceName: svc.name || serviceName,
        service: String(svc.id),
        staffName:
          requestedStaffName ||
          performers.find((p) => String(p.id) === String(unitId))?.name ||
          "",
        staff: unitId ? String(unitId) : "",
        startAt: `${requestedDate}T${requestedTime}`,
        durationMinutes: Number(entry?.duration || svc?.duration || 60),
        price: Number(entry?.price || svc?.price || 0),
        paid: false,
        status: finalStatus,
      };

      // Upsert into SpaBooking
      const existing = await base44.asServiceRole.entities.SpaBooking.filter({
        simplybookBookingId: bookingId,
      });

      if (existing?.length) {
        await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, spaPayload);
      } else {
        await base44.asServiceRole.entities.SpaBooking.create(spaPayload);
      }

      created.push({
        simplybookBookingId: bookingId,
        serviceName: spaPayload.serviceName,
        startAt: spaPayload.startAt,
        status: finalStatus,
      });
    }

    return Response.json({
      success: created.length > 0,
      bookings: created,
      errors,
      message: `${created.length} treatment booking${created.length === 1 ? "" : "s"} created`,
    });
  } catch (e) {
    console.error("intakeBookTreatments error:", e);
    return Response.json(
      { error: e?.message || "Unknown intakeBookTreatments error" },
      { status: 500 }
    );
  }
});