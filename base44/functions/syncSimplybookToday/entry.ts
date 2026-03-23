import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function sbRPC(url: string, method: string, params: any[], headers: Record<string, string>) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await resp.json();
  if (json.error) throw new Error(`RPC ${method} error: ${json.error.message || JSON.stringify(json.error)}`);
  return json.result;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin" && user?.role !== "general_manager") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const company  = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN");
    const login    = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN");
    const password = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD");

    if (!company || !login || !password) {
      return Response.json({ error: "SimplyBook credentials not configured" }, { status: 500 });
    }

    const authUrl  = "https://user-api.simplybook.me/login";
    const adminUrl = `https://user-api.simplybook.me/admin/${company}`;

    // Step 1: Get user token (3 params — same pattern as working functions)
    const token = await sbRPC(authUrl, "getUserToken", [company, login, password], {});
    const headers = { "X-Company-Login": company, "X-User-Token": token };

    const today = todayStr();

    // Step 2: Fetch all bookings for today using getBookingList
    let bookings: any[] = [];
    try {
      const result = await sbRPC(adminUrl, "getBookingList", [{
        date_from: today,
        date_to: today,
        status: "active",
      }], headers);
      bookings = Array.isArray(result) ? result : (result?.data || []);
    } catch (e: any) {
      // Fallback: try getBookings style
      try {
        const result2 = await sbRPC(adminUrl, "getBookings", [{ date_from: today, date_to: today }], headers);
        bookings = Array.isArray(result2) ? result2 : (result2?.data || []);
      } catch {
        bookings = [];
      }
    }

    // Step 3: Fetch providers (units) for name lookup
    let providers: any[] = [];
    try {
      const pResult = await sbRPC(adminUrl, "getUnitList", [false], headers);
      providers = Array.isArray(pResult) ? pResult : Object.values(pResult || {});
    } catch { providers = []; }

    // Step 4: Fetch services for name lookup
    let services: any[] = [];
    try {
      const sResult = await sbRPC(adminUrl, "getEventList", [false], headers);
      services = Array.isArray(sResult) ? sResult : Object.values(sResult || {});
    } catch { services = []; }

    // Step 5: Upsert each booking into SpaBooking entity
    const upserted: string[] = [];
    for (const b of bookings) {
      try {
        const bookingId = String(b.id || b.booking_id || "");
        if (!bookingId) continue;

        const serviceId = String(b.event_id || b.service_id || "");
        const staffId   = String(b.unit_id || b.provider_id || "");

        const svcMatch      = services.find((s: any) => String(s.id) === serviceId);
        const providerMatch = providers.find((p: any) => String(p.id) === staffId);

        const serviceName = b.event_name || b.service_name || svcMatch?.name || "";
        const staffName   = b.unit_name || b.provider_name || providerMatch?.name || "";
        const clientName  = b.client_name || [b.client?.fname, b.client?.lname].filter(Boolean).join(" ") || "";
        const email       = b.client_email || b.client?.email || "";
        const phone       = b.client_phone || b.client?.phone || "";

        // Build ISO start time — SimplyBook returns "YYYY-MM-DD HH:MM:SS"
        const rawStart = b.start_date_time || b.start || b.datetime || "";
        const startAt  = rawStart ? new Date(rawStart.replace(" ", "T")).toISOString() : "";

        const duration = Number(b.event_duration || b.duration || b.duration_minutes || 0);
        const price    = Number(b.event_price || b.price || b.amount || 0);
        const paid     = Boolean(b.paid || b.is_paid);

        // Map SimplyBook status to our status field
        const rawStatus = String(b.status || b.booking_status || "confirmed");
        const status    = rawStatus.toLowerCase().includes("cancel") ? "booking.cancelled" : "confirmed";

        const payload: Record<string, any> = {
          source: "simplybook",
          simplybookBookingId: bookingId,
          serviceName,
          service: serviceId,
          staffName,
          staff: staffId,
          clientName,
          email,
          phone,
          startAt,
          durationMinutes: duration,
          price,
          paid,
          status,
        };

        const existing = await base44.asServiceRole.entities.SpaBooking.filter({ simplybookBookingId: bookingId });
        if (existing?.length) {
          await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, payload);
        } else {
          await base44.asServiceRole.entities.SpaBooking.create(payload);
        }
        upserted.push(bookingId);
      } catch (e: any) {
        console.error("Failed to upsert booking", b?.id, e.message);
      }
    }

    return Response.json({
      success: true,
      synced: upserted.length,
      total: bookings.length,
      date: today,
    });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});
