import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

async function rpcCall(
  url: string,
  method: string,
  params: any[],
  headers: Record<string, string> = {},
) {
  const payload = { jsonrpc: "2.0", id: 1, method, params };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`RPC non-JSON response (${resp.status}): ${text.slice(0, 300)}`);
  }
  if (!resp.ok) throw new Error(`RPC HTTP ${resp.status}: ${text.slice(0, 300)}`);
  if (json.error) throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  return json.result;
}

function clean(v: any): string {
  return String(v ?? "").trim();
}

function addMinutesToTime(hms: string, add: number): string {
  const parts = hms.split(":").map((n) => parseInt(n || "0", 10));
  const total = parts[0] * 60 + parts[1] + add;
  const mins = ((total % 1440) + 1440) % 1440;
  return (
    String(Math.floor(mins / 60)).padStart(2, "0") +
    ":" +
    String(mins % 60).padStart(2, "0")
  );
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();

    const guestName = clean(body.guestName);
    const guestEmail = clean(body.guestEmail || body.email).toLowerCase();
    const guestPhone = clean(body.guestPhone || body.phone);
    const serviceId = clean(body.serviceId);
    const providerId = clean(body.providerId);
    const date = clean(body.date);
    const rawTime = clean(body.time);

    if (!guestName) return Response.json({ error: "guestName required" }, { status: 400 });
    if (!guestEmail) return Response.json({ error: "guestEmail required" }, { status: 400 });
    if (!serviceId) return Response.json({ error: "serviceId required" }, { status: 400 });
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!rawTime) return Response.json({ error: "time required (HH:MM or HH:MM:SS)" }, { status: 400 });

    // Strip seconds → HH:MM
    const startTime = rawTime.substring(0, 5);

    // Credentials
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const userLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const userPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

    if (!company || !userLogin || !userPassword) {
      return Response.json(
        { error: "Missing SimplyBook secrets: SIMPLYBOOK_COMPANY_LOGIN / SIMPLYBOOK_ADMIN_LOGIN / SIMPLYBOOK_ADMIN_PASSWORD" },
        { status: 500 },
      );
    }

    const loginUrl = "https://user-api.simplybook.me/login";
    const adminUrl = "https://user-api.simplybook.me/admin";

    // Authenticate — getUserToken with 3 params only (matching simplybookCallback)
    const userToken = await rpcCall(loginUrl, "getUserToken", [company, userLogin, userPassword]);

    if (!userToken || typeof userToken !== "string") {
      return Response.json({ error: "SimplyBook admin auth failed" }, { status: 500 });
    }

    const commonHeaders = {
      "X-Company-Login": company,
      "X-User-Token": String(userToken),
      "X-Token": String(userToken),
    };

    // Verify the service exists
    const servicesRaw = await rpcCall(adminUrl, "getEventList", [], commonHeaders);
    const svc = servicesRaw?.[serviceId];
    if (!svc) {
      return Response.json({ error: `Service ${serviceId} not found in SimplyBook` }, { status: 404 });
    }

    // Resolve provider — if empty, pick first available for the slot
    let resolvedProviderId = providerId || null;

    if (!resolvedProviderId) {
      const unitIds = Array.isArray(svc.unit_map) && svc.unit_map.length > 0
        ? svc.unit_map.map(String)
        : Object.keys((await rpcCall(adminUrl, "getUnitList", [], commonHeaders)) || {});

      for (const uid of unitIds) {
        try {
          const matrix = await rpcCall(adminUrl, "getStartTimeMatrix", [date, date, serviceId, uid, 1], commonHeaders);
          if (matrix?.[date]) {
            const slots = Array.isArray(matrix[date]) ? matrix[date] : Object.keys(matrix[date]);
            const hasSlot = slots.some((s: any) => String(s).substring(0, 5) === startTime);
            if (hasSlot) {
              resolvedProviderId = uid;
              break;
            }
          }
        } catch {
          continue;
        }
      }

      if (!resolvedProviderId) {
        return Response.json(
          { error: "slot_taken", message: "That time slot is no longer available. Please select another time." },
          { status: 409 },
        );
      }
    }

    // Create client in SimplyBook
    const clientPayload: Record<string, string> = { name: guestName };
    if (guestEmail) clientPayload.email = guestEmail;
    if (guestPhone) clientPayload.phone = guestPhone;

    let clientId: number | null = null;
    try {
      const addClientResult = await rpcCall(adminUrl, "addClient", [clientPayload, false], commonHeaders);
      console.log("addClient full response:", JSON.stringify(addClientResult));
      clientId =
        addClientResult?.id ||
        addClientResult?.client_id ||
        addClientResult?.data?.id ||
        (typeof addClientResult === "number" ? addClientResult : null) ||
        (typeof addClientResult === "string" && !isNaN(Number(addClientResult)) ? Number(addClientResult) : null);
      if (clientId) clientId = Number(clientId);
    } catch (e: any) {
      return Response.json({ error: `Failed to create client: ${e.message}` }, { status: 500 });
    }

    if (!clientId) {
      return Response.json(
        { error: "No client ID returned from SimplyBook. Check logs for full addClient response." },
        { status: 500 },
      );
    }

    // Book the appointment
    const durationMinutes = Number(svc.duration || 60);
    const endTime = addMinutesToTime(startTime, durationMinutes);

    const bookPayload = [
      Number(serviceId),
      Number(resolvedProviderId),
      Number(clientId),
      date,
      startTime,
      date,
      endTime,
      0,
      { predefined: { client: { name: guestName, email: guestEmail, phone: guestPhone }, fields: {} } },
    ];

    let bookingResult: any = null;
    try {
      bookingResult = await rpcCall(adminUrl, "book", bookPayload, commonHeaders);
    } catch (e: any) {
      const msg = (e.message || "").toLowerCase();
      if (msg.includes("busy") || msg.includes("occupied") || msg.includes("not available") || msg.includes("already booked")) {
        return Response.json(
          { error: "slot_taken", message: "That time slot was just taken. Please select another time." },
          { status: 409 },
        );
      }
      return Response.json({ error: `Booking failed: ${e.message}` }, { status: 500 });
    }

    // Extract booking ID
    const bookingObj = Array.isArray(bookingResult?.bookings) ? bookingResult.bookings[0] : bookingResult;
    const bookingId = String(bookingObj?.id || bookingObj?.booking_id || bookingResult?.id || "");
    const bookingHash = String(bookingObj?.hash || bookingObj?.booking_hash || "");

    if (!bookingId) {
      return Response.json(
        { error: "Booking may have been created but no ID was returned. Check email for confirmation.", bookingResult },
        { status: 500 },
      );
    }

    // Get provider name
    let providerName = "";
    try {
      const unitsRaw = await rpcCall(adminUrl, "getUnitList", [], commonHeaders);
      providerName = unitsRaw?.[resolvedProviderId]?.name || "";
    } catch {
      // non-fatal
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
      // non-fatal — booking was created in SimplyBook
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
