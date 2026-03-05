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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

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
    const roomTypeID = intake.cloudbedsRoomTypeId || intake.roomTypeID || "";

    // Get auth
    let accessToken = await getAnySetting(base44, [
      "CLOUDBEDS_ACCESS_TOKEN", "cloudbeds_access_token", "cloudbedsAccessToken"
    ]);
    const propertyId =
      (await getAnySetting(base44, [
        "CLOUDBEDS_PROPERTY_ID", "cloudbeds_property_id", "cloudbedsPropertyId"
      ])) || Deno.env.get("CLOUDBEDS_PROPERTY_ID");

    if (!accessToken) throw new Error("Cloudbeds not connected. Please complete OAuth setup.");
    if (!propertyId) throw new Error("Cloudbeds property ID not configured.");

    // Fetch available rooms to get a valid roomID
    let roomID = intake.cloudbedsRoomId || intake.roomID || "";
    if (!roomID && !roomTypeID) {
      // Try to find available rooms for the dates
      const availResp = await fetch(
        `https://hotels.cloudbeds.com/api/v1.1/getAvailableRoomTypes?propertyID=${propertyId}&startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const availJson = await availResp.json();
      const firstType = availJson?.data?.[0];
      if (firstType?.roomTypeID) roomTypeID = firstType.roomTypeID;
      if (firstType?.rooms?.[0]?.roomID) roomID = firstType.rooms[0].roomID;
    }

    // Build rooms array as required by Cloudbeds postReservation
    const roomsPayload = JSON.stringify([{
      roomTypeID: roomTypeID || undefined,
      roomID: roomID || undefined,
      adults: Number(adults),
      children: 0,
    }]);

    const params = new URLSearchParams({
      propertyID: propertyId,
      guestFirstName,
      guestLastName,
      guestEmail,
      startDate,
      endDate,
      adults: String(adults),
      children: "0",
      rooms: roomsPayload,
    });
    params.set("paymentMethod", "credit_card");
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

    return Response.json({
      message: `Reservation created in Cloudbeds! ID: ${result.json?.reservationID || "unknown"}`,
      reservationID: result.json?.reservationID,
      data: result.json,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});