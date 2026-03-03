// functions/simplybookCallback.js
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

async function rpcCall(url, method, params, headers = {}) {
  const payload = { jsonrpc: "2.0", id: 1, method, params };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`RPC non-JSON response (${resp.status}): ${text}`);
  }
  if (!resp.ok) throw new Error(`RPC HTTP ${resp.status}: ${text}`);
  if (json.error) throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  return json.result;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const companyLogin = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const userLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const userPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

    if (!companyLogin || !userLogin || !userPassword) {
      return Response.json(
        { error: "Missing SimplyBook secrets: SIMPLYBOOK_COMPANY_LOGIN / SIMPLYBOOK_ADMIN_LOGIN / SIMPLYBOOK_ADMIN_PASSWORD" },
        { status: 500 }
      );
    }

    const rawBody = await req.text();
    let payload = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    }

    const bookingId = payload.booking_id || payload.bookingId || payload.id;
    const bookingHash = payload.booking_hash || payload.bookingHash || payload.hash;
    const notificationType = payload.notification_type || payload.type || "unknown";
    const payloadCompany = payload.company || payload.company_login || "";

    if (!bookingId) {
      return Response.json(
        { received: true, warning: "No booking_id in payload", payload },
        { status: 200 }
      );
    }

    if (payloadCompany && String(payloadCompany).toLowerCase() !== String(companyLogin).toLowerCase()) {
      return Response.json(
        { received: true, warning: "Callback company mismatch", payloadCompany, companyLogin },
        { status: 200 }
      );
    }

    const loginUrl = "https://user-api.simplybook.me/login";
    const adminUrl = "https://user-api.simplybook.me/admin";

    const userToken = await rpcCall(loginUrl, "getUserToken", [companyLogin, userLogin, userPassword]);

    const commonHeaders = {
      "X-Company-Login": companyLogin,
      "X-User-Token": String(userToken),
      "X-Token": String(userToken),
    };

    let booking = null;
    const tryCalls = [
      { method: "getBookingDetails", params: bookingHash ? [bookingId, bookingHash] : [bookingId] },
      { method: "getBooking", params: [bookingId] },
      { method: "getBookingById", params: [bookingId] },
      ...(bookingHash ? [{ method: "getBookingByHash", params: [bookingHash] }] : []),
    ];

    let lastErr = null;
    for (const t of tryCalls) {
      try {
        booking = await rpcCall(adminUrl, t.method, t.params, commonHeaders);
        if (booking) break;
      } catch (e) {
        lastErr = e;
      }
    }

    const startAt = booking?.start_date_time || booking?.start || booking?.startAt || booking?.datetime || "";
    const durationMinutes = Number(booking?.event_duration || booking?.duration || booking?.duration_minutes || booking?.durationMinutes || 0);
    const serviceName = booking?.event_name || booking?.service_name || booking?.service?.name || booking?.event?.name || booking?.serviceName || "";
    const serviceId = booking?.event_id ? String(booking.event_id) : "";
    const staffName = booking?.unit_name || booking?.provider_name || booking?.performer_name || booking?.staffName || "";
    const staffId = booking?.unit_id ? String(booking.unit_id) : "";
    const clientName = booking?.client_name || booking?.client?.name || "";
    const email = booking?.client_email || booking?.client?.email || booking?.email || "";
    const phone = booking?.client_phone || booking?.client?.phone || booking?.phone || "";
    const price = Number(booking?.event_price || booking?.price || booking?.amount || booking?.total || 0);
    const paid = Boolean(booking?.paid || booking?.is_paid || booking?.invoice?.payment_received > 0);

    const spaBookingPayload = {
      source: "simplybook",
      simplybookBookingId: String(bookingId),
      simplybookBookingHash: bookingHash ? String(bookingHash) : "",
      status: String(notificationType),
      serviceName,
      service: serviceId,
      staffName,
      staff: staffId,
      clientName,
      startAt,
      durationMinutes,
      price,
      paid,
      email,
      phone,
      raw: {
        callbackPayload: payload,
        booking,
        bookingFetchError: booking ? null : String(lastErr?.message || lastErr || ""),
      },
      createdAt: new Date().toISOString(),
    };

    // Upsert directly using service role (no extra function hop)
    let action = "created";
    const existing = await base44.asServiceRole.entities.SpaBooking.filter({ simplybookBookingId: String(bookingId) });
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, spaBookingPayload);
      action = "updated";
    } else {
      await base44.asServiceRole.entities.SpaBooking.create(spaBookingPayload);
    }

    return Response.json(
      {
        received: true,
        action,
        simplybookBookingId: bookingId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("simplybookCallback error:", err);
    return Response.json(
      { received: true, error: String(err?.message || err) },
      { status: 200 }
    );
  }
});