import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

function clean(s) {
  return String(s ?? "").trim();
}

// Admin JSON-RPC call (uses getUserToken + X-User-Token + /admin/ endpoint)
async function sbAdminRPC(method, params, token, company) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["X-Company-Login"] = company;
    headers["X-User-Token"] = token;
  }
  const url = token
    ? "https://user-api.simplybook.me/admin/"
    : "https://user-api.simplybook.me/login";

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await resp.json();
  if (json?.error) throw new Error(`SB RPC ${method}: ${JSON.stringify(json.error)}`);
  return json?.result ?? json;
}

// User (read-only) JSON-RPC — used for getEventList / getUnitList
async function sbUserRPC(method, params, token, company) {
  const resp = await fetch("https://user-api.simplybook.me", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Login": company,
      "X-Token": token,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await resp.json();
  if (json?.error) throw new Error(`SB User RPC ${method}: ${JSON.stringify(json.error)}`);
  return json?.result ?? json;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { intake } = await req.json();

    const guestName = clean(intake?.guestName);
    const guestEmail = clean(intake?.email || intake?.guestEmail || "").toLowerCase();
    const phone = clean(intake?.phone);

    if (!guestName) return Response.json({ error: "Guest name required" }, { status: 400 });
    if (!Array.isArray(intake?.selectedTreatments) || !intake.selectedTreatments.length) {
      return Response.json({ error: "No treatments selected" }, { status: 400 });
    }

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

    if (!apiKey || !company) {
      return Response.json({ error: "SimplyBook not configured" }, { status: 500 });
    }

    // 1) Get user token (read-only, for service/staff lists)
    const userToken = await sbUserRPC("getToken", [company, apiKey], null, null).catch(() => null)
      || await (async () => {
        const r = await fetch("https://user-api.simplybook.me/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getToken", params: [company, apiKey] }),
        });
        const j = await r.json();
        return j?.result;
      })();

    if (!userToken || typeof userToken !== "string") {
      return Response.json({ error: "Failed to get SimplyBook user token" }, { status: 500 });
    }

    // 2) Get admin token (for client management + booking)
    let adminToken = null;
    if (adminLogin && adminPassword) {
      try {
        adminToken = await (async () => {
          const r = await fetch("https://user-api.simplybook.me/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getUserToken", params: [company, adminLogin, adminPassword] }),
          });
          const j = await r.json();
          if (j?.error) throw new Error(JSON.stringify(j.error));
          return j?.result;
        })();
      } catch (e) {
        console.log("Admin token failed:", e.message);
      }
    }

    // 3) Get service list (user token)
    const servicesRaw = await (async () => {
      const r = await fetch("https://user-api.simplybook.me", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Company-Login": company, "X-Token": userToken },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getEventList", params: [] }),
      });
      const j = await r.json();
      // Handle both j.result and j.result.result (double-wrapped)
      const raw = j?.result ?? {};
      return raw?.result ?? raw;
    })();
    const services = typeof servicesRaw === "object" && !Array.isArray(servicesRaw)
      ? Object.entries(servicesRaw).map(([id, s]) => ({ id, ...s }))
      : [];

    console.log("Services loaded:", services.map(s => `${s.id}:${s.name}`).join(" | "));

    // 4) Get performer list (user token)
    const performersRaw = await (async () => {
      const r = await fetch("https://user-api.simplybook.me", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Company-Login": company, "X-Token": userToken },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getUnitList", params: [] }),
      });
      const j = await r.json();
      const raw = j?.result ?? {};
      return raw?.result ?? raw;
    })();
    const performers = typeof performersRaw === "object" && !Array.isArray(performersRaw)
      ? Object.entries(performersRaw).map(([id, p]) => ({ id, ...p }))
      : [];

    // 5) Find or create client using admin token
    let clientId = null;

    if (adminToken) {
      // Try to find existing client by scanning list
      if (guestEmail) {
        try {
          const clientList = await sbAdminRPC("getClientList", [], adminToken, company);
          const arr = clientList && typeof clientList === "object" ? Object.values(clientList) : [];
          const found = arr.find((c) => String(c.email || "").toLowerCase() === guestEmail);
          if (found) clientId = String(found.id || found.client_id);
          console.log("Client list count:", arr.length, "found:", clientId);
        } catch (e) {
          console.log("Client list scan failed:", e.message);
        }
      }

      // Create client if not found
      if (!clientId) {
        // Build client data — only include email if it looks valid
        const clientData = { name: guestName };
        if (guestEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) clientData.email = guestEmail;
        if (phone) clientData.phone = phone;

        try {
          const newClient = await sbAdminRPC("addClient", [clientData], adminToken, company);
          clientId = String(newClient?.id || newClient?.client_id || newClient || "");
          console.log("addClient result:", JSON.stringify(newClient));
        } catch (e) {
          // If "already exists" error, extract the ID from error data
          const errMsg = e.message || "";
          const idMatch = errMsg.match(/"id"\s*:\s*"?(\d+)"?/);
          if (idMatch) clientId = idMatch[1];
          else console.log("addClient failed:", errMsg);
        }
      }
    }

    console.log("Final clientId:", clientId, "adminToken:", !!adminToken);
    console.log("Services available:", services.map(s => `${s.id}:${s.name}`).join(", "));

    // 6) Book each treatment
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
      const time = rawTime.includes(":") ? rawTime : rawTime;

      if (!bookingDate) {
        errors.push(`No date for "${treatmentName}" — skipping`);
        continue;
      }

      // Match service
      const svc = explicitServiceId
        ? services.find(s => String(s.id) === String(explicitServiceId))
        : services.find(s => String(s.name || "").toLowerCase().includes(treatmentName.toLowerCase()) || treatmentName.toLowerCase().includes(String(s.name || "").toLowerCase()));

      if (!svc) {
        errors.push(`Service not found: "${treatmentName}"`);
        continue;
      }

      const useStaffId = entry.staffId
        ? String(entry.staffId)
        : (performers[0]?.id || null);

      const startDateTime = `${bookingDate} ${time}:00`;

      try {
        let bookingResult;

        if (adminToken && clientId) {
          // Book via admin API
          bookingResult = await sbAdminRPC("addBooking", [
            String(svc.id),
            useStaffId,
            startDateTime,
            clientId,
            null, // additional fields
          ], adminToken, company);
        } else {
          // Fallback: record locally only
          bookingResult = { id: `local-${Date.now()}` };
          errors.push(`No admin token — "${treatmentName}" recorded locally only`);
        }

        const sbBookingId = String(bookingResult?.id || bookingResult || "");

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
      message: `${created.length} booking${created.length === 1 ? "" : "s"} created${errors.length ? ` (Warnings: ${errors.join("; ")})` : ""}`,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});