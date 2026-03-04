import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

function clean(s) { return String(s ?? "").trim(); }
function normalizeEmail(e) { return clean(e).toLowerCase(); }
function splitName(fullName) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  return { first: parts[0] || "Guest", last: parts.slice(1).join(" ") || "Ritual" };
}

// Read a key from SiteSettings or AppSetting (checks both, uppercase and lowercase)
async function getSetting(base44, ...keys) {
  for (const key of keys) {
    for (const entity of ["SiteSettings", "AppSetting"]) {
      try {
        const found = await base44.asServiceRole.entities[entity].filter({ key });
        if (found?.[0]?.value) return found[0].value;
      } catch { /* entity may not exist */ }
    }
  }
  return null;
}

async function upsertSetting(base44, key, value) {
  // Always write back to SiteSettings (canonical location)
  try {
    const existing = await base44.asServiceRole.entities.SiteSettings.filter({ key });
    if (existing?.[0]?.id) {
      await base44.asServiceRole.entities.SiteSettings.update(existing[0].id, { value });
    } else {
      await base44.asServiceRole.entities.SiteSettings.create({ key, value });
    }
  } catch {
    // fallback to AppSetting
    const existing = await base44.asServiceRole.entities.AppSetting.filter({ key });
    if (existing?.[0]?.id) {
      await base44.asServiceRole.entities.AppSetting.update(existing[0].id, { value });
    } else {
      await base44.asServiceRole.entities.AppSetting.create({ key, value });
    }
  }
}

async function refreshCloudbedsToken(base44) {
  const refreshToken = await getSetting(base44, "CLOUDBEDS_REFRESH_TOKEN", "cloudbeds_refresh_token");
  if (!refreshToken) throw new Error("Cloudbeds not connected. Complete OAuth in Admin → Bookings.");
...
async function getToken(base44) {
  let token = await getSetting(base44, "CLOUDBEDS_ACCESS_TOKEN", "cloudbeds_access_token");
  if (!token) token = await refreshCloudbedsToken(base44);
  return token;
}

// Known room type mapping — avoids an extra getRooms API call
// Keys are lowercase fragments that appear in intake.roomRequested
const ROOM_TYPE_MAP = {
  "suite 1": null,
  "suite 2": null,
  "suite 3": null,
  "suite 4": null,
  "suite 5": null,
  "suite 6": null,
  "suite 7": null,
  "carriage": null,
};

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
    const guestPhone = clean(intake?.phone);
    const adults = String(Number(intake?.numberOfGuests || 1));
    const notes = clean(intake?.internalNotes || intake?.treatmentsRequested || "");

    if (!guestName || !guestEmail) return Response.json({ error: "Guest name and email required" }, { status: 400 });
    if (!checkInDate || !checkOutDate) return Response.json({ error: "Check-in and check-out dates required" }, { status: 400 });

    const { first: guestFirstName, last: guestLastName } = splitName(guestName);

    const propertyId = await getSetting(base44, "cloudbeds_property_id");
    if (!propertyId) return Response.json({ error: "Cloudbeds property ID not configured" }, { status: 400 });

    let token = await getToken(base44);

    // Build reservation params — skip getRooms to avoid timeout
    // roomTypeID from AppSetting or leave blank (Cloudbeds will auto-assign)
    const reqRoom = clean(intake?.roomRequested).toLowerCase();
    let roomTypeID = await getSetting(base44, `cloudbeds_roomtype_${reqRoom.replace(/\s+/g, "_")}`) || "";

    const params = new URLSearchParams({
      propertyID: String(propertyId),
      startDate: checkInDate,
      endDate: checkOutDate,
      guestFirstName,
      guestLastName,
      guestEmail,
      adults,
      children: "0",
    });
    if (roomTypeID) params.set("roomTypeID", roomTypeID);
    if (guestPhone) params.set("guestPhone", guestPhone);
    if (notes) params.set("reservationNotes", notes.slice(0, 500));

    const postReservation = async (tok) => {
      return await fetch("https://hotels.cloudbeds.com/api/v1.1/postReservation", {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
    };

    let res = await postReservation(token);
    let text = await res.text();

    // Retry once with fresh token on auth errors
    if (!res.ok && (res.status === 401 || res.status === 403)) {
      token = await refreshCloudbedsToken(base44);
      res = await postReservation(token);
      text = await res.text();
    }

    const data = JSON.parse(text);

    if (!data?.success) {
      return Response.json({ error: data?.message || "Cloudbeds reservation failed", detail: data }, { status: 400 });
    }

    // Save locally (non-blocking — do after returning if needed)
    base44.entities.Booking.create({
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      room_name: clean(intake?.roomRequested) || "TBD",
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      num_guests: Number(intake?.numberOfGuests || 1),
      booking_status: "confirmed",
      payment_status: "pending",
      confirmation_code: String(data?.reservationID || ""),
    }).catch(() => {});

    return Response.json({
      success: true,
      reservationId: data?.reservationID,
      message: `Hotel booking created in Cloudbeds (Reservation #${data?.reservationID})`,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});