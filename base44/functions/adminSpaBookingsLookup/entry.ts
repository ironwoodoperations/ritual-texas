import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin users OR no-session callers (scheduled/dashboard use)
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === "admin") isAuthorized = true;
    } catch { isAuthorized = true; }
    if (!isAuthorized) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { startISO, endISO, staffName, status, _debug } = body;

    function fmtDate(iso: string) {
      return new Date(iso).toISOString().split("T")[0];
    }
    const fromDate = fmtDate(startISO || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const toDate = fmtDate(endISO || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY");
    const companyLogin = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN");

    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Fetch bookings via REST v3
    const bookingsResp = await fetch(
      `https://user-api.simplybook.me/api/v3/${companyLogin}/bookings?from_date=${fromDate}&to_date=${toDate}`,
      { headers, method: "GET" }
    );
    const bookingsJson = await bookingsResp.json();

    // Fetch clients via REST v3
    const clientsResp = await fetch(
      `https://user-api.simplybook.me/api/v3/${companyLogin}/clients`,
      { headers, method: "GET" }
    );
    const clientsJson = await clientsResp.json();

    // Return raw data when debugging
    if (_debug) {
      return Response.json({ bookingsJson, clientsJson });
    }

    const clientsMap: Record<string, any> = {};
    if (Array.isArray(clientsJson)) {
      clientsJson.forEach((c: any) => { clientsMap[c.id] = c; });
    }

    // Fetch providers via JSON-RPC admin API
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN");
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD");

    const providersMap: Record<string, any> = {};
    try {
      // Get user token
      const tokenResp = await fetch("https://user-api.simplybook.me/admin/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getUserToken",
          params: [companyLogin, adminLogin, adminPassword],
        }),
      });
      const tokenJson = await tokenResp.json();
      const adminToken = tokenJson?.result;

      if (adminToken) {
        const unitsResp = await fetch("https://user-api.simplybook.me/admin/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Token": adminToken,
            "X-Company-Login": companyLogin!,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "getUnitList",
            params: [],
          }),
        });
        const unitsJson = await unitsResp.json();
        const unitList = unitsJson?.result;
        if (unitList && typeof unitList === "object") {
          Object.values(unitList).forEach((u: any) => {
            if (u?.id) providersMap[u.id] = u;
          });
        }
      }
    } catch (_e) {
      // Non-fatal: provider names will fall back to booking fields
    }

    // Map bookings to response shape
    const bookings = Array.isArray(bookingsJson) ? bookingsJson.map((b: any) => {
      const client = clientsMap[b.client_id] || {};
      const provider = providersMap[b.unit_id] || {};

      const rawStatus = String(b.status || "");
      const isCancelled = rawStatus === "0" || rawStatus.includes("cancel");

      return {
        simplybookBookingId: String(b.id || ""),
        clientName: `${client.first_name || ""} ${client.last_name || ""}`.trim() || b.client_name || "",
        email: client.email || b.client_email || "",
        phone: client.phone || b.client_phone || "",
        serviceName: b.service_name || b.event_name || "",
        service: String(b.service_id || b.event_id || ""),
        staffName: provider.name || b.unit_name || b.provider_name || "",
        staff: String(b.unit_id || ""),
        startAt: b.start_date ? new Date(b.start_date).toISOString() : "",
        endAt: b.end_date ? new Date(b.end_date).toISOString() : null,
        durationMinutes: Number(b.duration || b.event_duration || 0),
        price: Number(b.price || b.amount || 0),
        paid: Boolean(b.paid || b.is_paid),
        status: isCancelled ? "booking.cancelled" : "booking.accepted",
        source: "simplybook",
      };
    }) : [];

    // Filter: exclude cancelled by default
    let filtered = bookings.filter((b: any) => b.status !== "booking.cancelled");

    if (status && status !== "ALL") {
      filtered = bookings.filter((b: any) => b.status.includes(status.toLowerCase()));
    }
    if (staffName && staffName !== "ALL") {
      filtered = filtered.filter((b: any) => b.staffName === staffName);
    }
    filtered.sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    const staffNames = Array.from(new Set(bookings.map((b: any) => b.staffName).filter(Boolean))).sort();

    return Response.json({ success: true, bookings: filtered, staffNames, _rawCount: bookings.length });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
