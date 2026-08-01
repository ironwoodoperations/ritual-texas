import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// ── One-off maintenance function ─────────────────────────────────────────────
// Re-pulls email/phone from Acuity for acuity-sourced SpaBooking rows that are
// missing contact info (or have badly-cased emails), so guests can find their
// treatments on the itinerary page.
//
// Run from the Base44 functions tester:
//   {}                                → dry run, upcoming appointments only
//   {"dryRun": false}                 → apply changes, upcoming only
//   {"dryRun": false, "includePast": true} → apply to the whole table
//
// Note: appointments that have no email in Acuity itself cannot be backfilled —
// the fix for those is operational (staff must enter the guest's email when
// creating appointments in Acuity).

const ACUITY_BASE = "https://acuityscheduling.com/api/v1";

function acuityAuth(): string {
  const userId = Deno.env.get("ACUITY_USER_ID") || "";
  const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
  return "Basic " + btoa(userId + ":" + apiKey);
}

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);

  // Allow admin users OR no-session callers (functions tester / scheduled use) —
  // same pattern as adminSpaBookingsLookup.
  let isAuthorized = false;
  try {
    const user = await base44.auth.me();
    if (user?.role === "admin") isAuthorized = true;
  } catch { isAuthorized = true; }
  if (!isAuthorized) return Response.json({ error: "Forbidden" }, { status: 403 });

  let dryRun = true;
  let includePast = false;
  try {
    const body = await req.json();
    dryRun = body?.dryRun !== false; // dry run unless explicitly disabled
    includePast = body?.includePast === true;
  } catch { /* no body → defaults */ }

  try {
    const all = await base44.asServiceRole.entities.SpaBooking.list("startAt", 2000);
    const today = new Date().toISOString().slice(0, 10);

    const needsFix = (b: any) =>
      !b.email ||
      b.email !== b.email.trim().toLowerCase() ||
      !b.phone;

    const targets = (all || []).filter((b: any) =>
      b.source === "acuity" &&
      b.simplybookBookingId &&
      (includePast || (b.startAt || "") >= today) &&
      needsFix(b)
    );

    const updated: any[] = [];
    const unchanged: any[] = [];
    const failed: any[] = [];

    for (const b of targets) {
      try {
        const resp = await fetch(`${ACUITY_BASE}/appointments/${b.simplybookBookingId}`, {
          headers: { Authorization: acuityAuth() },
        });
        if (!resp.ok) {
          failed.push({ id: b.id, acuityId: b.simplybookBookingId, clientName: b.clientName, error: `Acuity HTTP ${resp.status}` });
          continue;
        }
        const appt = await resp.json();

        const newEmail = (appt.email || b.email || "").trim().toLowerCase();
        const newPhone = (appt.phone || b.phone || "").trim();

        if (newEmail === (b.email || "") && newPhone === (b.phone || "")) {
          unchanged.push({ id: b.id, clientName: b.clientName, startAt: b.startAt, reason: "Acuity has no email/phone for this appointment either" });
          continue;
        }

        if (!dryRun) {
          await base44.asServiceRole.entities.SpaBooking.update(b.id, { email: newEmail, phone: newPhone });
        }

        updated.push({
          id: b.id,
          clientName: b.clientName,
          startAt: b.startAt,
          email: { from: b.email || "", to: newEmail },
          phone: { from: b.phone || "", to: newPhone },
        });
      } catch (e: any) {
        failed.push({ id: b.id, acuityId: b.simplybookBookingId, clientName: b.clientName, error: String(e?.message || e) });
      }
    }

    return Response.json({
      success: true,
      dryRun,
      includePast,
      scanned: targets.length,
      wouldUpdate: dryRun ? updated.length : undefined,
      updatedCount: dryRun ? undefined : updated.length,
      updated,
      unchangedCount: unchanged.length,
      unchanged,
      failed,
    }, { status: 200 });
  } catch (err: any) {
    console.error("backfillSpaBookingEmails error:", err);
    return Response.json({
      success: false,
      error: String(err?.message || err),
    }, { status: 500 });
  }
});
