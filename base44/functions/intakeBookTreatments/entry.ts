import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clean(v: any): string {
  return String(v ?? "").trim();
}

function normalizeTime(raw: any): string {
  const t = clean(raw);
  if (!t) return "";
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

function asArrayMap(obj: any): any[] {
  if (!obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) return obj;
  return Object.entries(obj).map(([id, value]: [string, any]) => ({
    id: String(id),
    ...(typeof value === "object" && value ? value : { value }),
  }));
}

function timeToMinutes(hms: string): number {
  const [h, m] = normalizeTime(hms).split(":").map((n: string) => parseInt(n || "0", 10));
  return h * 60 + m;
}

function addMinutesToTime(hms: string, add: number): string {
  const total = timeToMinutes(hms) + add;
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
}

async function sbRPC(
  url: string,
  method: string,
  params: any[],
  headers: Record<string, string> = {},
): Promise<any> {
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

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);

  try {
    const me = await base44.auth.me();
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const intake = body?.intake || body || {};

    // ── Credentials ──────────────────────────────────────────────────────
    const company: string = (Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "").trim();
    const apiKey: string = (Deno.env.get("SIMPLYBOOK_API_KEY") || "").trim();

    if (!company || !apiKey) {
      return Response.json({
        error: "Missing environment variables: SIMPLYBOOK_COMPANY_LOGIN and/or SIMPLYBOOK_API_KEY",
      }, { status: 500 });
    }

    // ── Debug mode: test auth and return service list ─────────────────────
    if (body?._debugAuth) {
      const dUserLogin: string = (Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "").trim();
      const dUserPass: string = (Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "").trim();
      const LOGIN_URL_D = "https://user-api.simplybook.me/login";
      const BASE_URL_D = "https://user-api.simplybook.me";
      const [pubTok, admTok] = await Promise.all([
        sbRPC(LOGIN_URL_D, "getToken", [company, apiKey]).catch((e: any) => ({ error: e.message })),
        sbRPC(LOGIN_URL_D, "getUserToken", [company, dUserLogin, dUserPass]).catch((e: any) => ({ error: e.message })),
      ]);
      const adminOk = typeof admTok === "string";
      const rTok = adminOk ? admTok : "";
      const rHeaders: Record<string, string> = {
        "X-Company-Login": company,
        "X-Token": rTok,
        "X-User-Token": rTok,
      };
      const services = adminOk
        ? await sbRPC(BASE_URL_D, "getEventList", [], rHeaders).catch(() => null)
        : null;
      const providers = adminOk
        ? await sbRPC(BASE_URL_D, "getUnitList", [], rHeaders).catch(() => null)
        : null;
      return Response.json({
        publicTokenOk: typeof pubTok === "string",
        adminTokenOk: adminOk,
        publicTokenError: typeof pubTok !== "string" ? pubTok : null,
        adminTokenError: !adminOk ? admTok : null,
        services: services ? asArrayMap(services).map((s: any) => ({ id: s.id, name: s.name })) : null,
        providers: providers ? asArrayMap(providers).map((p: any) => ({ id: p.id, name: p.name })) : null,
      });
    }

    // ── Validate input ───────────────────────────────────────────────────
    if (!Array.isArray(intake?.selectedTreatments) || intake.selectedTreatments.length === 0) {
      return Response.json({ error: "No treatments selected" }, { status: 400 });
    }

    const guestName: string = clean(intake?.guestName || intake?.name);
    const guestEmail: string = clean(intake?.email || intake?.guestEmail || "").toLowerCase();
    const guestPhone: string = clean(intake?.phone || intake?.guestPhone || "");

    if (!guestName) {
      return Response.json({ error: "Guest name is required" }, { status: 400 });
    }

    // ── Authenticate ─────────────────────────────────────────────────────
    const LOGIN_URL = "https://user-api.simplybook.me/login";
    const BASE_URL = "https://user-api.simplybook.me";
    const ADMIN_URL = "https://user-api.simplybook.me/admin/";

    const userLogin: string = (Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "").trim();
    const userPassword: string = (Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "").trim();

    if (!userLogin || !userPassword) {
      return Response.json({
        error: "Missing env vars for admin write access: SIMPLYBOOK_ADMIN_LOGIN and SIMPLYBOOK_ADMIN_PASSWORD are required to book treatments.",
      }, { status: 500 });
    }

    // Public token — for reads (getEventList, getUnitList)
    // Admin token — for writes (addClient, book) — getUserToken with 3 params
    const [publicToken, adminToken] = await Promise.all([
      sbRPC(LOGIN_URL, "getToken", [company, apiKey]).catch(() => null),
      sbRPC(LOGIN_URL, "getUserToken", [company, userLogin, userPassword]),
    ]);

    if (!adminToken || typeof adminToken !== "string") {
      return Response.json({
        error: "SimplyBook admin authentication failed. Check SIMPLYBOOK_ADMIN_LOGIN and SIMPLYBOOK_ADMIN_PASSWORD.",
        detail: adminToken,
      }, { status: 500 });
    }

    // Use whichever token is available for reads; use admin token for writes
    const readToken: string = (typeof publicToken === "string" && publicToken) ? publicToken : adminToken;

    const readHeaders: Record<string, string> = {
      "X-Company-Login": company,
      "X-Token": readToken,
      "X-User-Token": readToken,
    };

    const adminHeaders: Record<string, string> = {
      "X-Company-Login": company,
      "X-Token": adminToken,
      "X-User-Token": adminToken,
    };

    // ── Load services and providers ──────────────────────────────────────
    const [servicesRaw, providersRaw] = await Promise.all([
      sbRPC(BASE_URL, "getEventList", [], readHeaders),
      sbRPC(BASE_URL, "getUnitList", [], readHeaders),
    ]);

    const services: any[] = asArrayMap(servicesRaw);
    const providers: any[] = asArrayMap(providersRaw);

    const bookingsCreated: any[] = [];
    const errors: string[] = [];
    const debug: any[] = [];

    // ── Find or create SimplyBook client ONCE for the guest ───────────────
    let sharedClientId: number | null = null;
    try {
      const clientListRaw: any = await sbRPC(ADMIN_URL, "getClientList", [0, 1, null, { email: guestEmail }], adminHeaders);
      const clientList: any[] = Array.isArray(clientListRaw) ? clientListRaw : asArrayMap(clientListRaw);

      if (clientList.length > 0) {
        // Existing client — reuse their ID
        const raw = clientList[0]?.id ?? clientList[0]?.client_id;
        sharedClientId = typeof raw === "string" && !isNaN(Number(raw)) ? Number(raw) : Number(raw);
        console.log(`[SimplyBook] Using existing client ID: ${sharedClientId} for email: ${guestEmail}`);
      } else {
        // New client — create once
        const clientPayload: Record<string, string> = { name: guestName };
        if (guestEmail) clientPayload.email = guestEmail;
        if (guestPhone) clientPayload.phone = guestPhone;
        const addClientRaw: any = await sbRPC(ADMIN_URL, "addClient", [clientPayload, false], adminHeaders);
        console.log("addClient raw response:", JSON.stringify(addClientRaw));
        const raw =
          addClientRaw?.id ||
          addClientRaw?.client_id ||
          addClientRaw?.data?.id ||
          (typeof addClientRaw === "number" ? addClientRaw : null) ||
          (typeof addClientRaw === "string" && !isNaN(Number(addClientRaw)) ? addClientRaw : null);
        sharedClientId = typeof raw === "string" && !isNaN(Number(raw)) ? Number(raw) : Number(raw);
        console.log(`[SimplyBook] Created new client ID: ${sharedClientId} for email: ${guestEmail}`);
      }
    } catch (e: any) {
      return Response.json({
        success: false,
        bookings: [],
        errors: [`Could not find or create SimplyBook client for "${guestEmail}": ${e.message}`],
        message: "SimplyBook client setup failed — no bookings were made.",
      }, { status: 500 });
    }

    if (!sharedClientId) {
      return Response.json({
        success: false,
        bookings: [],
        errors: [`No client ID returned for guest "${guestName}" — cannot book without a valid client`],
        message: "SimplyBook client setup failed — no bookings were made.",
      }, { status: 500 });
    }

    // ── Process each treatment slot ──────────────────────────────────────
    for (const rawItem of intake.selectedTreatments) {
      let entry: any = {};
      if (typeof rawItem === "string") {
        try {
          entry = JSON.parse(rawItem);
        } catch {
          entry = { serviceName: rawItem };
        }
      } else if (typeof rawItem === "object" && rawItem) {
        entry = rawItem;
      }

      const entryName: string = clean(entry?.serviceName || entry?.name || "Unknown treatment");
      const entryGuestName: string = clean(entry?.guestName || "") || guestName;
      const entryGuestEmail: string = clean(entry?.email || guestEmail).toLowerCase();
      const entryGuestPhone: string = clean(entry?.phone || guestPhone);

      // ── Validate date and time are present ──────────────────────────
      const requestedDate: string = clean(entry?.date || "");
      if (!requestedDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        errors.push(`"${entryName}" needs a date (YYYY-MM-DD). Edit the record and add a date to this treatment slot.`);
        continue;
      }

      const requestedTime: string = normalizeTime(entry?.time || "");
      if (!requestedTime) {
        errors.push(`"${entryName}" needs a start time. Edit the record and add a time to this treatment slot.`);
        continue;
      }

      // ── Match service by ID then by name ────────────────────────────
      const requestedSimplybookId: string = clean(entry?.simplybookServiceId || "");
      const requestedServiceId: string = clean(entry?.serviceId || entry?.id || "");
      const requestedServiceName: string = clean(entry?.serviceName || entry?.name || "");

      let svc: any =
        // 1. Direct SimplyBook ID match (most reliable — set by live availability picker)
        (requestedSimplybookId && services.find((s: any) => String(s.id) === requestedSimplybookId)) ||
        // 2. Local service ID match
        (requestedServiceId && services.find((s: any) => String(s.id) === requestedServiceId)) ||
        // 3. Exact name match
        services.find((s: any) => clean(s.name).toLowerCase() === requestedServiceName.toLowerCase()) ||
        // 4. Fuzzy name match
        services.find((s: any) => {
          const sn = clean(s.name).toLowerCase();
          const rn = requestedServiceName.toLowerCase();
          return sn && rn && (sn.includes(rn) || rn.includes(sn));
        });

      if (!svc) {
        errors.push(
          `"${requestedServiceName || requestedServiceId}" not found in SimplyBook. ` +
          `Available services: ${services.map((s: any) => s.name).join(", ")}`,
        );
        debug.push({
          stage: "service_not_found",
          requestedServiceId,
          requestedServiceName,
          availableServices: services.map((s: any) => ({ id: s.id, name: s.name })),
        });
        continue;
      }

      // ── Match provider (optional) ────────────────────────────────────
      const requestedProviderName: string = clean(entry?.staffName || intake?.therapistAssigned || "");
      let unitId: string | null = null;

      if (requestedProviderName) {
        const providerMatch = providers.find((p: any) =>
          clean(p.name).toLowerCase() === requestedProviderName.toLowerCase() ||
          clean(p.name).toLowerCase().includes(requestedProviderName.toLowerCase())
        );
        if (providerMatch) {
          unitId = String(providerMatch.id);
        }
      }
      // If no provider match, unitId stays null — SimplyBook will auto-assign

      // ── Use the shared client ID resolved before the loop ──────────────
      const clientId: number = sharedClientId;

      // ── Book the treatment ──────────────────────────────────────────
      const durationMinutes: number = Number(entry?.duration || svc?.duration || svc?.duration_minutes || 60);
      const startTime: string = normalizeTime(requestedTime);
      const endTime: string = addMinutesToTime(startTime, durationMinutes);

      const additional = {
        predefined: {
          client: { name: entryGuestName, email: entryGuestEmail, phone: entryGuestPhone },
          fields: {},
        },
      };

      // book signature: (eventId, unitId, clientId, startDate, startTime, endDate, endTime, count, additional)
      const bookPayload: any[] = [
        Number(svc.id),
        unitId ? Number(unitId) : null,
        Number(clientId),
        requestedDate,
        startTime,
        requestedDate,
        endTime,
        0,
        additional,
      ];

      let bookingResult: any = null;
      try {
        // book is a write operation — use ADMIN_URL
        bookingResult = await sbRPC(ADMIN_URL, "book", bookPayload, adminHeaders);
      } catch (e: any) {
        errors.push(`Booking failed for "${entryName}" on ${requestedDate} at ${startTime}: ${e.message}`);
        debug.push({
          stage: "book_failed",
          serviceId: svc.id,
          unitId,
          clientId,
          requestedDate,
          startTime,
          endTime,
          error: e.message,
        });
        continue;
      }

      // Extract booking ID from various response shapes SimplyBook may return
      const bookingObj: any = Array.isArray(bookingResult?.bookings)
        ? bookingResult.bookings[0]
        : bookingResult;

      const bookingId: string = String(
        bookingObj?.id ||
        bookingObj?.booking_id ||
        bookingResult?.id ||
        "",
      );

      if (!bookingId) {
        errors.push(`No booking ID returned for "${entryName}" — booking may or may not have been created`);
        debug.push({ stage: "no_booking_id", bookingResult });
        continue;
      }

      const bookingHash: string = String(bookingObj?.hash || bookingObj?.booking_hash || "");

      // ── Save to SpaBooking entity ────────────────────────────────────
      const spaPayload = {
        source: "simplybook",
        simplybookBookingId: bookingId,
        simplybookBookingHash: bookingHash,
        clientName: entryGuestName,
        email: entryGuestEmail,
        phone: entryGuestPhone,
        serviceName: clean(svc.name) || requestedServiceName,
        service: String(svc.id),
        staffName: unitId ? clean(providers.find((p: any) => String(p.id) === unitId)?.name || "") : "",
        staff: unitId || "",
        startAt: `${requestedDate}T${startTime}`,
        durationMinutes,
        price: Number(entry?.price || svc?.price || 0),
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
        // Non-fatal — booking was created in SimplyBook, just couldn't mirror it locally
      }

      bookingsCreated.push({
        simplybookBookingId: bookingId,
        serviceName: spaPayload.serviceName,
        staffName: spaPayload.staffName,
        startAt: spaPayload.startAt,
        status: "created",
        clientId,
      });

      debug.push({
        stage: "booking_created",
        bookingId,
        serviceId: svc.id,
        unitId,
        clientId,
        requestedDate,
        startTime,
      });
    }

    return Response.json({
      success: bookingsCreated.length > 0,
      bookings: bookingsCreated,
      errors,
      message: bookingsCreated.length > 0
        ? `${bookingsCreated.length} treatment booking${bookingsCreated.length === 1 ? "" : "s"} created in SimplyBook`
        : errors.length > 0
          ? `No bookings created. ${errors.length} error${errors.length === 1 ? "" : "s"} — see details.`
          : "No bookings created",
      debug,
    });
  } catch (e: any) {
    return Response.json({
      success: false,
      bookings: [],
      errors: [e?.message || "Unknown error"],
      message: "SimplyBook booking failed — see errors for details",
    }, { status: 500 });
  }
});