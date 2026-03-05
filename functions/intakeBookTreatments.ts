import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

function clean(s) {
  return String(s ?? "").trim();
}

async function sbRPC(url, method, params, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await resp.json();
  if (json?.error) throw new Error(`SimplyBook RPC error [${method}]: ${JSON.stringify(json.error)}`);
  return json?.result ?? json;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { intake } = await req.json();

    const guestName = clean(intake?.guestName);
    const guestEmail = clean(intake?.guestEmail || intake?.email || "").toLowerCase();
    const phone = clean(intake?.phone);

    if (!guestName) return Response.json({ error: "Guest name required" }, { status: 400 });
    if (!Array.isArray(intake?.selectedTreatments) || !intake.selectedTreatments.length) {
      return Response.json({ error: "No treatments selected" }, { status: 400 });
    }

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";
    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";

    if (!company || !adminLogin || !adminPassword) {
      return Response.json({ error: "SimplyBook admin credentials not configured" }, { status: 500 });
    }

    // 1) Get admin token via getUserToken on the /login endpoint
    const adminToken = await sbRPC("https://user-api.simplybook.me/login", "getUserToken", [company, adminLogin, adminPassword]);
    if (!adminToken || typeof adminToken !== "string") {
      return Response.json({ error: "Failed to get SimplyBook admin token", detail: adminToken }, { status: 500 });
    }

    // Admin API uses /admin/ endpoint and X-User-Token header
    const adminHeaders = { "X-Company-Login": company, "X-User-Token": adminToken };
    const adminUrl = "https://user-api.simplybook.me/admin/";

    // Also get user token for service/unit list
    const userToken = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    const userHeaders = { "X-Company-Login": company, "X-Token": userToken };

    // 2) Get services and performers in parallel
    const [servicesRaw, performersRaw] = await Promise.all([
      sbRPC("https://user-api.simplybook.me", "getEventList", [], userHeaders),
      sbRPC("https://user-api.simplybook.me", "getUnitList", [], userHeaders),
    ]);

    const services = servicesRaw && typeof servicesRaw === "object" ? servicesRaw : {};
    const performers = performersRaw && typeof performersRaw === "object" ? performersRaw : {};

    // 3) Find or create client via admin API
    let clientId = null;

    // Search by scanning full client list (search_string filter doesn't work by email)
    if (guestEmail) {
      try {
        const clientList = await sbRPC(adminUrl, "getClientList", [], adminHeaders);
        const arr = Array.isArray(clientList) ? clientList : (typeof clientList === "object" ? Object.values(clientList) : []);
        const found = arr.find((c) => String(c.email || "").toLowerCase() === guestEmail);
        if (found) clientId = String(found.id);
      } catch (e) {
        // will create below
      }
    }

    if (!clientId) {
      try {
        const newClient = await sbRPC(adminUrl, "addClient", [{
          name: guestName,
          email: guestEmail || undefined,
          phone: phone || undefined,
        }], adminHeaders);
        clientId = String(newClient?.id || newClient || "");
      } catch (e) {
        // If client already exists (race or missed lookup), scan list again
        if (e.message.includes("already exist") && guestEmail) {
          const retry = await sbRPC(adminUrl, "getClientList", [], adminHeaders);
          const arr = Array.isArray(retry) ? retry : (typeof retry === "object" ? Object.values(retry) : []);
          const found = arr.find((c) => String(c.email || "").toLowerCase() === guestEmail);
          if (found) clientId = String(found.id);
        }
        if (!clientId) throw e;
      }
    }

    if (!clientId || clientId === "null" || clientId === "undefined") {
      return Response.json({ error: "Failed to find or create SimplyBook client" }, { status: 500 });
    }

    // 4) Book each treatment via admin API
    const created = [];
    const errors = [];

    for (const item of intake.selectedTreatments) {
      let entry = item;
      if (typeof item === "string") {
        try { entry = JSON.parse(item); } catch { entry = { serviceName: item }; }
      }

      const treatmentName = entry.serviceName || entry.name || "";
      const explicitServiceId = entry.serviceId || entry.id || null;
      const bookingDate = entry.date || "";
      const rawTime = (entry.time || "10:00").replace(/[^0-9:]/g, "");
      const time = rawTime.includes(":") ? rawTime : (rawTime.length === 4 ? `${rawTime.slice(0, 2)}:${rawTime.slice(2)}` : rawTime);

      if (!bookingDate) {
        errors.push(`No date for "${treatmentName}" — skipping`);
        continue;
      }

      // Match service by ID or name
      const needle = String(treatmentName).toLowerCase();
      let svc = null;
      for (const [id, s] of Object.entries(services)) {
        if (explicitServiceId && String(id) === String(explicitServiceId)) { svc = { id, ...s }; break; }
        if (!explicitServiceId && (String(s.name || "").toLowerCase().includes(needle) || needle.includes(String(s.name || "").toLowerCase()))) {
          svc = { id, ...s };
          break;
        }
      }

      if (!svc) {
        errors.push(`Service not found: "${treatmentName}"`);
        continue;
      }

      // Match staff
      const useStaffId = entry.staffId
        ? String(entry.staffId)
        : (svc.unit_map?.[0] ? String(svc.unit_map[0]) : Object.keys(performers)[0] || null);

      const startDateTime = `${bookingDate} ${time}:00`;

      try {
        // Admin API book method
        const bookingResult = await sbRPC(adminUrl, "book", [
          String(svc.id),
          useStaffId,
          startDateTime,
          String(clientId),
        ], adminHeaders);

        const sbBookingId = String(bookingResult?.id || bookingResult || "");

        await base44.entities.SpaBooking.create({
          simplybookBookingId: sbBookingId,
          clientName: guestName,
          email: guestEmail,
          phone,
          serviceName: svc.name || treatmentName,
          service: String(svc.id),
          startAt: `${bookingDate}T${time}:00`,
          durationMinutes: Number(entry.duration || svc?.duration || 60),
          price: Number(entry.price || svc?.price || 0),
          source: "simplybook",
          status: "create",
        });

        created.push({ simplybookId: sbBookingId, service: svc.name || treatmentName });
      } catch (bookErr) {
        errors.push(`Booking failed for "${treatmentName}": ${bookErr.message}`);
      }
    }

    return Response.json({
      success: created.length > 0,
      bookings: created,
      errors,
      message: `${created.length} booking${created.length === 1 ? "" : "s"} created in SimplyBook${errors.length ? ` (Warnings: ${errors.join("; ")})` : ""}`,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});