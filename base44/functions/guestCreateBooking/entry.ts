import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function clean(v: any): string {
  return String(v ?? "").trim();
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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();

    // Validate required fields
    const guestName = clean(body.guestName);
    const guestEmail = clean(body.guestEmail || body.email).toLowerCase();
    const guestPhone = clean(body.guestPhone || body.phone);
    const serviceId = clean(body.serviceId);
    const providerId = clean(body.providerId); // optional — null means "any available"
    const date = clean(body.date);
    const time = normalizeTime(body.time);

    if (!guestName) return Response.json({ error: "guestName required" }, { status: 400 });
    if (!guestEmail) return Response.json({ error: "guestEmail required" }, { status: 400 });
    if (!serviceId) return Response.json({ error: "serviceId required" }, { status: 400 });
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
    if (!time) return Response.json({ error: "time required (HH:MM or HH:MM:SS)" }, { status: 400 });

    // Credentials — match simplybookCallback.ts exactly
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

    if (!company || !apiKey) {
      return Response.json({ error: "SimplyBook credentials not configured" }, { status: 500 });
    }
    if (!adminLogin || !adminPassword) {
      return Response.json({ error: "SimplyBook admin credentials not configured (SIMPLYBOOK_ADMIN_LOGIN / SIMPLYBOOK_ADMIN_PASSWORD)" }, { status: 500 });
    }

    const LOGIN_URL = "https://user-api.simplybook.me/login";
    const BASE_URL = "https://user-api.simplybook.me";
    const ADMIN_URL = "https://user-api.simplybook.me/admin/";

    // Get both tokens — getUserToken with 3 params matching simplybookCallback.ts
    const [publicToken, adminToken] = await Promise.all([
      sbRPC(LOGIN_URL, "getToken", [company, apiKey]).catch(() => null),
      sbRPC(LOGIN_URL, "getUserToken", [company, adminLogin, adminPassword]),
    ]);

    if (!adminToken || typeof adminToken !== "string") {
      return Response.json({ error: "SimplyBook admin auth failed" }, { status: 500 });
    }

    const readToken = (typeof publicToken === "string" && publicToken) ? publicToken : adminToken;
    const readHeaders = { "X-Company-Login": company, "X-Token": readToken, "X-User-Token": readToken };
    const adminHeaders = { "X-Company-Login": company, "X-Token": adminToken, "X-User-Token": adminToken };

    // Verify the service exists
    const servicesRaw = await sbRPC(BASE_URL, "getEventList", [], readHeaders);
    const svc = servicesRaw?.[serviceId];
    if (!svc) {
      return Response.json({ error: `Service ${serviceId} not found in SimplyBook` }, { status: 404 });
    }

    // Resolve provider — if "any" or empty, pick first available for the slot
    let resolvedProviderId = providerId || null;

    if (!resolvedProviderId) {
      // Try to find a provider that has the requested slot available
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
        return Response.json({
          error: "slot_taken",
          message: "That time slot is no longer available. Please select another time.",
        }, { status: 409 });
      }
    }

    // Create client in SimplyBook
    const clientPayload: any = { name: guestName };
    if (guestEmail) clientPayload.email = guestEmail;
    if (guestPhone) clientPayload.phone = guestPhone;

    let clientId: number | null = null;
    try {
      const addClientResult = await sbRPC(ADMIN_URL, "addClient", [clientPayload, false], adminHeaders);
      console.log("addClient full response:", JSON.stringify(addClientResult));
      clientId = addClientResult?.id
        || addClientResult?.client_id
        || addClientResult?.data?.id
        || (typeof addClientResult === "number" ? addClientResult : null);
      if (clientId) clientId = Number(clientId);
    } catch (e: any) {
      return Response.json({ error: `Failed to create client: ${e.message}` }, { status: 500 });
    }

    if (!clientId) {
      return Response.json({ error: "No client ID returned from SimplyBook. Check logs for full addClient response." }, { status: 500 });
    }

    // Book the appointment
    const durationMinutes = Number(svc.duration || 60);
    const startTime = time;
    const endTime = addMinutesToTime(startTime, durationMinutes);

    const additional = {
      predefined: {
        client: { name: guestName, email: guestEmail, phone: guestPhone },
        fields: {},
      },
    };

    const bookPayload = [
      Number(serviceId),
      Number(resolvedProviderId),
      Number(clientId),
      date,
      startTime,
      date,
      endTime,
      0,
      additional,
    ];

    let bookingResult: any = null;
    try {
      bookingResult = await sbRPC(ADMIN_URL, "book", bookPayload, adminHeaders);
    } catch (e: any) {
      // Check if it's a "slot taken" type error
      const msg = e.message?.toLowerCase() || "";
      if (msg.includes("busy") || msg.includes("occupied") || msg.includes("not available") || msg.includes("already booked")) {
        return Response.json({
          error: "slot_taken",
          message: "That time slot was just taken. Please select another time.",
        }, { status: 409 });
      }
      return Response.json({ error: `Booking failed: ${e.message}` }, { status: 500 });
    }

    // Extract booking ID
    const bookingObj = Array.isArray(bookingResult?.bookings) ? bookingResult.bookings[0] : bookingResult;
    const bookingId = String(bookingObj?.id || bookingObj?.booking_id || bookingResult?.id || "");
    const bookingHash = String(bookingObj?.hash || bookingObj?.booking_hash || "");

    if (!bookingId) {
      return Response.json({
        error: "Booking may have been created but no ID was returned. Please check your email for confirmation.",
        bookingResult,
      }, { status: 500 });
    }

    // Get provider name
    let providerName = "";
    try {
      const unitsRaw = await sbRPC(BASE_URL, "getUnitList", [], readHeaders);
      providerName = unitsRaw?.[resolvedProviderId]?.name || "";
    } catch {
      // Non-fatal
    }

    // Mirror to SpaBooking entity
    const spaPayload = {
      source: "simplybook",
      simplybookBookingId: bookingId,
      simplybookBookingHash: bookingHash,
      clientName: guestName,
      email: guestEmail,
      phone: guestPhone,
      serviceName: clean(svc.name),
      service: serviceId,
      staffName: providerName,
      staff: resolvedProviderId,
      startAt: `${date}T${startTime}`,
      durationMinutes,
      price: Number(svc.price || 0),
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
      // Non-fatal — booking was created in SimplyBook
    }

    return Response.json({
      success: true,
      booking: {
        bookingId,
        bookingHash,
        serviceName: svc.name,
        serviceId,
        providerId: resolvedProviderId,
        providerName,
        date,
        startTime,
        endTime,
        durationMinutes,
        price: Number(svc.price || 0),
        clientId,
        guestName,
        guestEmail,
      },
    });
  } catch (e: any) {
    console.error("guestCreateBooking error:", e);
    return Response.json({ error: e.message || "Booking failed" }, { status: 500 });
  }
});
