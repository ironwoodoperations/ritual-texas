import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

async function getSetting(base44, key) {
  const found = await base44.asServiceRole.entities.AppSetting.filter({ key });
  return found?.[0]?.value ?? null;
}

async function upsertSetting(base44, key, value) {
  const existing = await base44.asServiceRole.entities.AppSetting.filter({ key });
  if (existing?.[0]?.id) {
    await base44.asServiceRole.entities.AppSetting.update(existing[0].id, { value });
  } else {
    await base44.asServiceRole.entities.AppSetting.create({ key, value });
  }
}

function clean(s) {
  return String(s ?? "").trim();
}

function normalizeEmail(email) {
  return clean(email).toLowerCase();
}

function splitName(fullName) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  const first = parts[0] || "Guest";
  const last = parts.slice(1).join(" ") || "Ritual";
  return { first, last };
}

async function refreshCloudbedsToken(base44) {
  const clientId = Deno.env.get("CLOUDBEDS_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("CLOUDBEDS_CLIENT_SECRET") || "";

  const refreshToken = await getSetting(base44, "cloudbeds_refresh_token");
  if (!refreshToken) throw new Error("Cloudbeds not connected. Complete OAuth setup in Admin → Cloudbeds.");

  const res = await fetch("https://hotels.cloudbeds.com/api/v1.1/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Cloudbeds token refresh failed: ${text}`);

  const data = JSON.parse(text);
  const accessToken = data?.access_token || data?.data?.access_token;
  const newRefresh = data?.refresh_token || data?.data?.refresh_token;

  if (!accessToken) throw new Error("Cloudbeds token refresh returned no access_token");

  await upsertSetting(base44, "cloudbeds_access_token", accessToken);
  if (newRefresh) await upsertSetting(base44, "cloudbeds_refresh_token", newRefresh);

  return accessToken;
}

async function getAccessToken(base44) {
  let token = await getSetting(base44, "cloudbeds_access_token");
  if (!token) token = await refreshCloudbedsToken(base44);
  return token;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { intake } = await req.json();

    const guestName = clean(intake?.guestName);
    const guestEmail = normalizeEmail(intake?.guestEmail || intake?.email);
    const checkInDate = clean(intake?.checkInDate);
    const checkOutDate = clean(intake?.checkOutDate);

    if (!checkInDate || !checkOutDate || !guestName || !guestEmail) {
      return Response.json(
        { error: "Check-in, check-out, guest name and email are required" },
        { status: 400 }
      );
    }

    const { first: guestFirstName, last: guestLastName } = splitName(guestName);
    const guestPhone = clean(intake?.phone);

    let token = await getAccessToken(base44);
    const propertyId = await getSetting(base44, "cloudbeds_property_id");
    if (!propertyId) return Response.json({ error: "Cloudbeds property ID not configured" }, { status: 400 });

    // 1) Fetch rooms
    const roomsRes = await fetch(
      `https://hotels.cloudbeds.com/api/v1.1/getRooms?propertyID=${encodeURIComponent(propertyId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let roomsText = await roomsRes.text();
    if (!roomsRes.ok && (roomsRes.status === 401 || roomsRes.status === 403)) {
      token = await refreshCloudbedsToken(base44);
      const retry = await fetch(
        `https://hotels.cloudbeds.com/api/v1.1/getRooms?propertyID=${encodeURIComponent(propertyId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      roomsText = await retry.text();
      if (!retry.ok) throw new Error(`Could not fetch rooms: ${roomsText}`);
    } else if (!roomsRes.ok) {
      throw new Error(`Could not fetch rooms: ${roomsText}`);
    }

    const roomsJson = JSON.parse(roomsText);
    const rooms = roomsJson?.data || [];

    // Try to pick a room / roomType match
    let chosen = null;
    const reqRoom = clean(intake?.roomRequested).toLowerCase();

    if (reqRoom) {
      chosen = rooms.find((r) =>
        String(r.roomName || "").toLowerCase().includes(reqRoom) ||
        String(r.roomTypeName || "").toLowerCase().includes(reqRoom)
      );
    }
    if (!chosen) chosen = rooms[0];
    if (!chosen) return Response.json({ error: "No rooms found in Cloudbeds" }, { status: 400 });

    const roomTypeID = chosen.roomTypeID || chosen.roomTypeId || chosen.room_type_id || "";
    const roomID = chosen.roomID || chosen.roomId || "";

    // 2) Create reservation
    const params = new URLSearchParams({
      propertyID: String(propertyId),
      startDate: checkInDate,
      endDate: checkOutDate,
      guestFirstName,
      guestLastName,
      guestEmail,
      adults: String(Number(intake?.numberOfGuests || 1)),
      children: "0",
    });

    if (roomTypeID) params.set("roomTypeID", String(roomTypeID));
    if (roomID) params.set("roomID", String(roomID));
    if (guestPhone) params.set("guestPhone", guestPhone);

    const createOnce = async () => {
      return await fetch("https://hotels.cloudbeds.com/api/v1.1/postReservation", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
    };

    let resRes = await createOnce();
    let resText = await resRes.text();

    if (!resRes.ok && (resRes.status === 401 || resRes.status === 403)) {
      token = await refreshCloudbedsToken(base44);
      resRes = await createOnce();
      resText = await resRes.text();
    }

    const resData = JSON.parse(resText);

    if (!resData?.success) {
      return Response.json(
        { error: resData?.message || "Cloudbeds API error", detail: resData },
        { status: 400 }
      );
    }

    // Save locally
    await base44.entities.Booking.create({
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      room_name: clean(intake?.roomRequested) || chosen?.roomName || chosen?.roomTypeName || "TBD",
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      num_guests: Number(intake?.numberOfGuests || 1),
      booking_status: "confirmed",
      payment_status: "pending",
    });

    return Response.json({
      success: true,
      reservationId: resData?.reservationID,
      message: `Hotel booking created in Cloudbeds (Reservation #${resData?.reservationID})`,
      cloudbeds: resData,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});