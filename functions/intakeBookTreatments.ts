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
  if (json?.error) throw new Error(`SimplyBook RPC error: ${JSON.stringify(json.error)}`);
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

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    if (!apiKey || !company) {
      return Response.json({ error: "SimplyBook not configured" }, { status: 500 });
    }

    // 1) Authenticate via JSON-RPC
    const token = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    if (!token || typeof token !== "string") {
      return Response.json({ error: "Failed to get SimplyBook token", detail: token }, { status: 500 });
    }

    const sbHeaders = { "X-Company-Login": company, "X-Token": token };

    // 2) Get service list
    const servicesRaw = await sbRPC("https://user-api.simplybook.me", "getServiceList", [], sbHeaders);
    const services = servicesRaw && typeof servicesRaw === "object" ? Object.entries(servicesRaw).map(([id, s]) => ({ id, ...s })) : [];

    // 3) Get performer (staff) list
    const performersRaw = await sbRPC("https://user-api.simplybook.me", "getUnitList", [], sbHeaders);
    const performers = performersRaw && typeof performersRaw === "object" ? Object.entries(performersRaw).map(([id, p]) => ({ id, ...p })) : [];

    // 4) Find or create client using the correct SimplyBook RPC methods
    let clientId = null;
    if (guestEmail) {
      try {
        const clientList = await sbRPC("https://user-api.simplybook.me", "getClientByEmail", [guestEmail], sbHeaders);
        if (clientList && (clientList.id || clientList.client_id)) {
          clientId = String(clientList.id || clientList.client_id);
        }
      } catch (e) {
        // client not found, will create below
      }
    }

    if (!clientId) {
      const newClient = await sbRPC("https://user-api.simplybook.me", "createClient", [{
        name: guestName,
        email: guestEmail || undefined,
        phone: phone || undefined,
      }], sbHeaders);
      clientId = String(newClient?.id || newClient?.client_id || newClient || "");
      if (!clientId || clientId === "null" || clientId === "undefined") {
        return Response.json({ error: "Failed to create SimplyBook client", detail: newClient }, { status: 500 });
      }
    }

    // 5) Book each treatment
    const created = [];
    const errors = [];

    const treatmentList = Array.isArray(intake.selectedTreatments) ? intake.selectedTreatments : [];

    for (const item of treatmentList) {
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

      // Match service
      const needle = String(treatmentName).toLowerCase();
      const svc = explicitServiceId
        ? services.find(s => String(s.id) === String(explicitServiceId))
        : services.find(s => String(s.name || "").toLowerCase().includes(needle) || needle.includes(String(s.name || "").toLowerCase()));

      if (!svc) {
        errors.push(`Service not found: "${treatmentName}"`);
        continue;
      }

      // Match staff
      const useStaffId = entry.staffId
        ? String(entry.staffId)
        : (performers[0]?.id || null);

      const startDateTime = `${bookingDate} ${time}:00`;

      let sbBookingId = null;
      try {
        const bookingResult = await sbRPC("https://user-api.simplybook.me", "addBooking", [
          String(svc.id),
          useStaffId ? String(useStaffId) : null,
          startDateTime,
          clientId,
          { name: guestName, email: guestEmail || "", phone: phone || "" },
        ], sbHeaders);

        sbBookingId = String(bookingResult?.id || bookingResult || "");

        const local = await base44.entities.SpaBooking.create({
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

        created.push({ simplybookId: sbBookingId, local });
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