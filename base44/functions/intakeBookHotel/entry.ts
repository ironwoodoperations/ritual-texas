// intakeBookHotel - creates a Cloudbeds reservation from an intake record
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function readKey(base44, entityName, key) {
  try {
    const rows = await base44.asServiceRole.entities[entityName].filter({ key });
    return rows?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function getAnySetting(base44, keys) {
  for (const key of keys) {
    const v =
      (await readKey(base44, "SiteSettings", key)) ??
      (await readKey(base44, "AppSetting", key)) ??
      null;
    if (v) return v;
  }
  return null;
}

async function upsertSetting(base44, key, value) {
  const rows = await base44.asServiceRole.entities.SiteSettings.filter({ key });
  if (rows.length) {
    await base44.asServiceRole.entities.SiteSettings.update(rows[0].id, { value });
  } else {
    await base44.asServiceRole.entities.SiteSettings.create({ key, value });
  }
}

async function refreshAccessToken(base44) {
  const storedRefresh = await getAnySetting(base44, [
    "CLOUDBEDS_REFRESH_TOKEN", "cloudbeds_refresh_token", "cloudbedsRefreshToken"
  ]);
  if (!storedRefresh) throw new Error("Missing CLOUDBEDS_REFRESH_TOKEN");
  const clientId = Deno.env.get("CLOUDBEDS_CLIENT_ID");
  const clientSecret = Deno.env.get("CLOUDBEDS_CLIENT_SECRET");
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: storedRefresh,
  });
  const resp = await fetch("https://hotels.cloudbeds.com/api/v1.1/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Token refresh failed: ${text}`);
  const json = JSON.parse(text);
  const newAccess = json?.access_token || json?.data?.access_token;
  const newRefresh = json?.refresh_token || json?.data?.refresh_token || storedRefresh;
  if (!newAccess) throw new Error("No access_token in refresh response");
  await upsertSetting(base44, "CLOUDBEDS_ACCESS_TOKEN", newAccess);
  await upsertSetting(base44, "CLOUDBEDS_REFRESH_TOKEN", newRefresh);
  return newAccess;
}

async function doPostReservation(token, propertyId, params) {
  const resp = await fetch("https://hotels.cloudbeds.com/api/v1.1/postReservation", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, json: JSON.parse(text) };
}

async function cloudbedsApi(endpoint, method, params, token, propertyId) {
  const allParams = { propertyID: propertyId, ...params };
  let url = `https://hotels.cloudbeds.com/api/v1.1/${endpoint}`;
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (method === "GET") {
    url += "?" + new URLSearchParams(allParams).toString();
  } else {
    opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
    opts.body = new URLSearchParams(allParams).toString();
  }
  const resp = await fetch(url, opts);
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: resp.ok, status: resp.status, json };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const intake = body.intake || body;

    // Parse guest name
    const fullName = (intake.guestName || "").trim();
    if (!fullName) {
      return Response.json({ error: "Guest name is required" }, { status: 400 });
    }
    const nameParts = fullName.split(" ");
    const guestFirstName = nameParts[0];
    const guestLastName = nameParts.slice(1).join(" ") || "-";

    const guestEmail = intake.email || intake.guestEmail || "";
    if (!guestEmail) {
      return Response.json({ error: "Guest email is required to book in Cloudbeds" }, { status: 400 });
    }

    const startDate = intake.checkInDate;
    const endDate = intake.checkOutDate;
    if (!startDate || !endDate) {
      return Response.json({ error: "Check-in and check-out dates are required" }, { status: 400 });
    }

    const guestPhone = intake.phone || intake.guestPhone || "";
    const adults = intake.numberOfGuests || 1;
    const notes = intake.internalNotes || intake.treatmentsRequested || "";
    let roomTypeID = intake.cloudbedsRoomTypeId || intake.roomTypeID || "";

    // Get auth
    let accessToken = await getAnySetting(base44, [
      "CLOUDBEDS_ACCESS_TOKEN", "cloudbeds_access_token", "cloudbedsAccessToken"
    ]);
    const propertyId =
      (await getAnySetting(base44, [
        "CLOUDBEDS_PROPERTY_ID", "cloudbeds_property_id", "cloudbedsPropertyId"
      ])) || Deno.env.get("CLOUDBEDS_PROPERTY_ID");

    // If no access token found, try refreshing from the refresh token
    if (!accessToken) {
      try {
        accessToken = await refreshAccessToken(base44);
      } catch (refreshErr) {
        throw new Error("Cloudbeds not connected. Please complete OAuth setup in Admin → Cloudbeds. (" + refreshErr.message + ")");
      }
    }
    if (!propertyId) throw new Error("Cloudbeds property ID not configured.");

    // Post-booking Cloudbeds folio sync: when squareWebhook (or admin path with a
    // Square-paid intake) created this booking, post a folio payment for each
    // new reservation so the Cloudbeds balance reflects "paid via Square" instead
    // of showing a phantom balance due. Decoupled from booking creation —
    // sync failures set cloudbedsPaymentSyncFailed and append to internalNotes,
    // but never abort the loop or change bookingStatus.
    const paymentSyncEnabled = Number(intake.paidAmountCents) > 0 && !!intake.squarePaymentEventId;
    let postedAmount = 0;
    let paymentsPosted = 0;
    let paymentSyncFailed = false;
    const paymentSyncErrors = [];

    async function syncReservationPayment(reservationID) {
      if (!paymentSyncEnabled || !reservationID) return;
      try {
        let getRes = await cloudbedsApi("getReservation", "GET", { reservationID }, accessToken, propertyId);
        if (!getRes.ok && (getRes.status === 401 || getRes.status === 403)) {
          accessToken = await refreshAccessToken(base44);
          getRes = await cloudbedsApi("getReservation", "GET", { reservationID }, accessToken, propertyId);
        }
        const balance = Number(getRes.json?.data?.balance);
        if (!Number.isFinite(balance) || balance <= 0) return;
        const payParams = {
          reservationID,
          amount: String(balance),
          type: "Square Invoice",
          description: `Paid via Square — Order ${intake.squareOrderId || ""}`.trim(),
        };
        let payRes = await cloudbedsApi("postPayment", "POST", payParams, accessToken, propertyId);
        if (!payRes.ok && (payRes.status === 401 || payRes.status === 403)) {
          accessToken = await refreshAccessToken(base44);
          payRes = await cloudbedsApi("postPayment", "POST", payParams, accessToken, propertyId);
        }
        if (!payRes.ok || !payRes.json?.success) {
          throw new Error(payRes.json?.message || `HTTP ${payRes.status}`);
        }
        postedAmount += balance;
        paymentsPosted += 1;
      } catch (e) {
        paymentSyncFailed = true;
        paymentSyncErrors.push(`reservation ${reservationID}: ${e?.message || e}`);
      }
    }

    async function persistPaymentSyncSummary() {
      if (!paymentSyncEnabled || !intake.id) return;
      const lines = [`Cloudbeds payments posted: $${postedAmount.toFixed(2)} across ${paymentsPosted} reservation(s)`];
      if (paymentSyncErrors.length) {
        lines.push(`Cloudbeds payment sync failures: ${paymentSyncErrors.join("; ")}`);
      }
      const appendedNotes = String(intake.internalNotes || "") + lines.map(l => `\n[${l}]`).join("");
      try {
        const update = { internalNotes: appendedNotes };
        if (paymentSyncFailed) update.cloudbedsPaymentSyncFailed = true;
        await base44.asServiceRole.entities.HotelTreatmentIntake.update(intake.id, update);
      } catch { /* non-fatal */ }
    }

    // Multi-room booking: if rooms array is provided, book each room separately
    const rooms = Array.isArray(intake.rooms) && intake.rooms.length > 0 ? intake.rooms : null;
    if (rooms) {
      const results = [];
      for (const room of rooms) {
        const rid = room.roomId || "";
        if (!rid) continue;

        // Use per-room guest name if provided, otherwise fall back to primary guest
        let roomFirstName = guestFirstName;
        let roomLastName = guestLastName;
        const roomGuestName = (room.guestName || "").trim();
        if (roomGuestName) {
          const spaceIdx = roomGuestName.indexOf(" ");
          roomFirstName = spaceIdx > 0 ? roomGuestName.slice(0, spaceIdx) : roomGuestName;
          roomLastName = spaceIdx > 0 ? roomGuestName.slice(spaceIdx + 1) : "-";
        }

        const roomEntry = { roomTypeID: rid, quantity: 1 };
        const params = new URLSearchParams({
          propertyID: propertyId,
          guestFirstName: roomFirstName,
          guestLastName: roomLastName,
          guestEmail,
          startDate,
          endDate,
          adults: JSON.stringify([{ roomTypeID: rid, quantity: 1, adults: Number(adults) }]),
          children: JSON.stringify([{ roomTypeID: rid, quantity: 1, children: 0 }]),
          rooms: JSON.stringify([roomEntry]),
        });
        params.set("paymentMethod", "credit_card");
        params.set("guestCountry", "US");
        if (guestPhone) params.set("guestPhone", guestPhone);
        if (notes) params.set("notes", notes);

        let result = await doPostReservation(accessToken, propertyId, params);
        if (!result.ok && (result.status === 401 || result.status === 403)) {
          accessToken = await refreshAccessToken(base44);
          result = await doPostReservation(accessToken, propertyId, params);
        }

        if (!result.json?.success) {
          return Response.json({
            error: result.json?.message || "Cloudbeds API error",
            detail: result.json,
            room: room.roomName || rid,
          }, { status: 400 });
        }

        await syncReservationPayment(result.json?.reservationID);

        results.push({
          roomId: rid,
          roomName: room.roomName,
          reservationID: result.json?.reservationID,
          data: result.json,
        });
      }

      await persistPaymentSyncSummary();

      return Response.json({
        message: `${results.length} reservation(s) created in Cloudbeds!`,
        reservations: results,
      });
    }

    // Fetch all room types (not filtered by availability) if not provided
    let availDebug = null;
    if (!roomTypeID) {
      const availResp = await fetch(
        `https://hotels.cloudbeds.com/api/v1.1/getRoomTypes?propertyID=${propertyId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const availJson = await availResp.json();
      availDebug = availJson;
      const firstType = availJson?.data?.[0];
      if (firstType?.roomTypeID) roomTypeID = String(firstType.roomTypeID);
    }

    if (!roomTypeID) {
      return Response.json({ error: "No room type ID provided and none found in Cloudbeds.", debug: availDebug }, { status: 400 });
    }

    // Cloudbeds expects adults/children as JSON arrays (one entry per room)
    const roomEntry = { roomTypeID, quantity: 1 };

    const params = new URLSearchParams({
      propertyID: propertyId,
      guestFirstName,
      guestLastName,
      guestEmail,
      startDate,
      endDate,
      adults: JSON.stringify([{ roomTypeID, quantity: 1, adults: Number(adults) }]),
      children: JSON.stringify([{ roomTypeID, quantity: 1, children: 0 }]),
      rooms: JSON.stringify([roomEntry]),
    });
    params.set("paymentMethod", "credit_card");
    params.set("guestCountry", "US");
    if (guestPhone) params.set("guestPhone", guestPhone);
    if (notes) params.set("notes", notes);

    let result = await doPostReservation(accessToken, propertyId, params);

    // Retry with refreshed token if auth error
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      accessToken = await refreshAccessToken(base44);
      result = await doPostReservation(accessToken, propertyId, params);
    }

    if (!result.json?.success) {
      return Response.json({
        error: result.json?.message || "Cloudbeds API error",
        detail: result.json,
      }, { status: 400 });
    }

    await syncReservationPayment(result.json?.reservationID);
    await persistPaymentSyncSummary();

    return Response.json({
      message: `Reservation created in Cloudbeds! ID: ${result.json?.reservationID || "unknown"}`,
      reservationID: result.json?.reservationID,
      data: result.json,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});