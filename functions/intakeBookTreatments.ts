import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

function clean(s) {
  return String(s ?? "").trim();
}
function normalizeEmail(email) {
  return clean(email).toLowerCase();
}

async function sbFetch(url, apiKey, init = {}) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { ok: resp.ok, status: resp.status, text, json };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { intake } = await req.json();

    const guestName = clean(intake?.guestName);
    const guestEmail = normalizeEmail(intake?.guestEmail || intake?.email);
    const phone = clean(intake?.phone);

    if (!guestName || !guestEmail) return Response.json({ error: "Guest name and email required" }, { status: 400 });
    if (!intake?.selectedTreatments?.length) return Response.json({ error: "No treatments selected" }, { status: 400 });
    if (!clean(intake?.preferredTreatmentDate)) return Response.json({ error: "Preferred treatment date is required" }, { status: 400 });

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    if (!apiKey || !company) {
      return Response.json({ error: "SimplyBook not configured: SIMPLYBOOK_API_KEY / SIMPLYBOOK_COMPANY_LOGIN" }, { status: 500 });
    }

    const base = `https://user-api.simplybook.me/api/v3/${company}`;

    // 1) Find or create client
    const clientsResp = await sbFetch(`${base}/clients`, apiKey);
    if (!clientsResp.ok) {
      return Response.json({ error: "SimplyBook clients fetch failed", detail: clientsResp.json || clientsResp.text }, { status: 500 });
    }

    const clients = Array.isArray(clientsResp.json) ? clientsResp.json : [];
    let client = clients.find((c) => String(c.email || "").toLowerCase() === guestEmail);

    if (!client) {
      const [firstName, ...rest] = guestName.split(/\s+/).filter(Boolean);
      const lastName = rest.join(" ") || "Ritual";

      const createResp = await sbFetch(`${base}/clients`, apiKey, {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName || "Guest",
          last_name: lastName,
          email: guestEmail,
          phone: phone || "",
        }),
      });

      if (!createResp.ok) {
        return Response.json(
          { error: "SimplyBook client create failed", detail: createResp.json || createResp.text },
          { status: 500 }
        );
      }
      client = createResp.json;
    }

    const clientId = client?.id || client?.client_id;
    if (!clientId) {
      return Response.json({ error: "SimplyBook client id missing after create/fetch", detail: client }, { status: 500 });
    }

    // 2) Services list
    const servicesResp = await sbFetch(`${base}/services`, apiKey);
    if (!servicesResp.ok) {
      return Response.json({ error: "SimplyBook services fetch failed", detail: servicesResp.json || servicesResp.text }, { status: 500 });
    }
    const services = Array.isArray(servicesResp.json) ? servicesResp.json : [];

    // 3) Staff list
    let staffId = null;
    const staffResp = await sbFetch(`${base}/staff`, apiKey);
    if (staffResp.ok) {
      const staff = Array.isArray(staffResp.json) ? staffResp.json : [];
      if (clean(intake?.preferredTherapist)) {
        const pref = clean(intake.preferredTherapist).toLowerCase();
        const match = staff.find((s) => String(s.name || "").toLowerCase().includes(pref));
        staffId = match?.id || match?.staff_id || null;
      }
      if (!staffId) staffId = staff?.[0]?.id || staff?.[0]?.staff_id || null;
    }

    // 4) Create bookings
    const bookingDate = clean(intake.preferredTreatmentDate); // YYYY-MM-DD
    const timeRaw = clean(intake.preferredTreatmentTime || "10:00").replace(/[^0-9:]/g, "");
    const time = (timeRaw.length === 4 ? `${timeRaw.slice(0, 2)}:${timeRaw.slice(2)}` : timeRaw).padEnd(5, "0");

    const created = [];
    const errors = [];

    for (const treatmentName of intake.selectedTreatments) {
      const needle = String(treatmentName || "").toLowerCase();
      const svc = services.find((s) =>
        String(s.name || "").toLowerCase().includes(needle) || needle.includes(String(s.name || "").toLowerCase())
      );

      if (!svc) {
        errors.push(`Service not found in SimplyBook: "${treatmentName}"`);
        continue;
      }

      const serviceId = svc.id || svc.service_id;
      if (!serviceId) {
        errors.push(`Service missing id in SimplyBook: "${treatmentName}"`);
        continue;
      }

      const createBookingPayload = {
        client_id: clientId,
        service_id: serviceId,
        start_date: `${bookingDate}T${time}:00`,
      };
      if (staffId) createBookingPayload.staff_id = staffId;

      const bResp = await sbFetch(`${base}/bookings`, apiKey, {
        method: "POST",
        body: JSON.stringify(createBookingPayload),
      });

      if (!bResp.ok) {
        errors.push(`Booking failed for "${treatmentName}": ${bResp.status} ${(bResp.json && JSON.stringify(bResp.json)) || bResp.text}`);
        continue;
      }

      const sbBooking = bResp.json;

      const local = await base44.entities.SpaBooking.create({
        simplybookBookingId: String(sbBooking?.id || ""),
        simplybookBookingHash: sbBooking?.hash || "",
        clientName: guestName,
        email: guestEmail,
        phone,
        serviceName: svc.name || treatmentName,
        service: String(serviceId),
        startAt: `${bookingDate}T${time}:00`,
        durationMinutes: Number(svc?.duration || 60),
        price: Number(svc?.price || 0),
        source: "simplybook",
        status: "create",
      });

      created.push({ simplybook: sbBooking, local });
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