// migrate-simplybook-to-acuity.mjs
// One-time migration: create appointments in Acuity Scheduling from SimplyBook bookings.
//
// Usage:
//   ACUITY_USER_ID=xxx ACUITY_API_KEY=xxx node scripts/migrate-simplybook-to-acuity.mjs

const ACUITY_USER_ID = process.env.ACUITY_USER_ID;
const ACUITY_API_KEY = process.env.ACUITY_API_KEY;

if (!ACUITY_USER_ID || !ACUITY_API_KEY) {
  console.error("ERROR: Set ACUITY_USER_ID and ACUITY_API_KEY environment variables.");
  process.exit(1);
}

const BASE_URL = "https://acuityscheduling.com/api/v1";
const AUTH_HEADER = "Basic " + Buffer.from(`${ACUITY_USER_ID}:${ACUITY_API_KEY}`).toString("base64");

async function acuityGet(path) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GET ${path} failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

async function acuityPost(path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: AUTH_HEADER,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return { ok: resp.ok, status: resp.status, data };
}

// ── Bookings to migrate ─────────────────────────────────────────────────────

const BOOKINGS = [
  { date: "2026-04-23", time: "15:00", firstName: "Kelley", lastName: "Bultler", email: "butler52105@yahoo.com", phone: "+14696931829", service: "Shirodhara-Glow", provider: "Whitney Graham" },
  { date: "2026-04-23", time: "09:00", firstName: "Kelley", lastName: "Butler", email: "butler52105@yahoo.com", phone: "+14696931829", service: "The Royal Treatment Facial", provider: "Whitney Graham" },
  { date: "2026-04-10", time: "14:00", firstName: "Lori", lastName: "Nunez", email: "lorinunez.1992@gmail.com", phone: "+9035041611", service: "Reiki", provider: "Whitney Graham" },
  { date: "2026-04-07", time: "15:00", firstName: "Guest", lastName: "Booking", email: "ritual.guest.apr7a@hotelritual.com", phone: "", service: "Shirodhara", provider: "Whitney Graham" },
  { date: "2026-04-07", time: "09:00", firstName: "Guest", lastName: "Booking", email: "ritual.guest.apr7b@hotelritual.com", phone: "", service: "Aura Glow", provider: "Whitney Graham" },
  { date: "2026-04-03", time: "08:00", firstName: "Guest", lastName: "Booking", email: "ritual.guest.apr3@hotelritual.com", phone: "", service: "Aura Glow", provider: "Whitney Graham" },
  { date: "2026-03-30", time: "15:00", firstName: "Sheryl", lastName: "Moore", email: "slmoore130@gmail.com", phone: "+19366720529", service: "Reiki", provider: "Whitney Graham" },
  { date: "2026-03-28", time: "14:00", firstName: "Lindsey", lastName: "Leslie", email: "lamcc0207@gmail.com", phone: "+3613191926", service: "Aura Glow", provider: "Whitney Graham" },
  { date: "2026-03-27", time: "17:00", firstName: "Lori", lastName: "Nunez", email: "lorinunez.1992@gmail.com", phone: "+9035041611", service: "Reiki", provider: "Whitney Graham" },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch appointment types
  console.log("\n=== Appointment Types ===");
  const types = await acuityGet("/appointment-types");
  for (const t of types) {
    console.log(`  [${t.id}] ${t.name}`);
  }

  // 2. Fetch calendars
  console.log("\n=== Calendars ===");
  const calendars = await acuityGet("/calendars");
  for (const c of calendars) {
    console.log(`  [${c.id}] ${c.name}`);
  }

  // 3. Find Whitney Graham's calendar
  const whitneyCalendar = calendars.find(
    (c) => c.name.toLowerCase().includes("whitney") && c.name.toLowerCase().includes("graham")
  );
  if (!whitneyCalendar) {
    console.error("\nERROR: Could not find Whitney Graham's calendar. Available calendars:");
    calendars.forEach((c) => console.error(`  [${c.id}] ${c.name}`));
    process.exit(1);
  }
  console.log(`\nUsing calendar: [${whitneyCalendar.id}] ${whitneyCalendar.name}`);

  // 4. Build a lookup map for appointment type names (case-insensitive)
  const typeMap = new Map();
  for (const t of types) {
    typeMap.set(t.name.toLowerCase(), t.id);
  }

  // 5. Create each appointment
  console.log("\n=== Creating Appointments ===\n");
  let success = 0;
  let failed = 0;

  for (const booking of BOOKINGS) {
    const appointmentTypeID = typeMap.get(booking.service.toLowerCase());
    if (!appointmentTypeID) {
      console.error(`SKIP: No matching appointment type for "${booking.service}". Available types:`);
      for (const t of types) console.error(`  [${t.id}] ${t.name}`);
      failed++;
      continue;
    }

    // America/Chicago: CDT = UTC-5 (all dates are after March 8 DST switch)
    const datetime = `${booking.date}T${booking.time}:00-05:00`;

    const body = {
      appointmentTypeID,
      calendarID: whitneyCalendar.id,
      datetime,
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
    };
    if (booking.phone) {
      body.phone = booking.phone;
    }

    const label = `${booking.firstName} ${booking.lastName} — ${booking.service} @ ${booking.date} ${booking.time}`;

    try {
      const result = await acuityPost("/appointments", body);
      if (result.ok && result.data?.id) {
        console.log(`OK: ${label} → Acuity ID ${result.data.id}`);
        success++;
      } else {
        console.error(`FAIL: ${label}`);
        console.error(`  Status: ${result.status}`);
        console.error(`  Response: ${JSON.stringify(result.data)}`);
        failed++;
      }
    } catch (err) {
      console.error(`ERROR: ${label} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${success} created, ${failed} failed ===\n`);
}

main();
