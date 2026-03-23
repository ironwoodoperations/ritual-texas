import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const t = todayStr();

    const [bookings, spa, hkToday, hkOverdue, pkgInq] = await Promise.all([
      base44.asServiceRole.entities.Booking.filter({ check_in_date: t }),
      base44.asServiceRole.entities.SpaBooking.list("-startAt", 200),
      base44.asServiceRole.entities.HkTask.filter({ taskDate: t }),
      base44.asServiceRole.entities.HkTask.filter({ taskDate: { $lt: t } }),
      base44.asServiceRole.entities.PackageInquiry.filter({ status: "new" }),
    ]);

    const spaToday = (spa || []).filter((b) => b.startAt?.slice(0, 10) === t && b.status !== "booking.cancelled");
    const hkDueTodayOpen = (hkToday || []).filter((x) => ["pending", "in_progress"].includes(x.status));
    const hkOverdueOpen = (hkOverdue || []).filter((x) => ["pending", "in_progress"].includes(x.status));

    async function upsertTask(title, category, priority, notes) {
      const existing = await base44.asServiceRole.entities.OpsTask.filter({ dueDate: t, title });
      if (existing?.[0]?.id) return;
      await base44.asServiceRole.entities.OpsTask.create({
        title, category, dueDate: t, priority,
        status: "open", notes, source: "system",
      });
    }

    await upsertTask(
      `Review arrivals (${(bookings || []).length})`,
      "hotel", "high",
      "Open AdminBookings → verify guest notes, ETA, and room readiness."
    );
    await upsertTask(
      `Confirm spa schedule (${spaToday.length})`,
      "spa", spaToday.length > 6 ? "high" : "normal",
      "Open AdminSpaSchedule → check gaps + provider coverage."
    );
    await upsertTask(
      `Housekeeping needs (${hkDueTodayOpen.length + hkOverdueOpen.length})`,
      "housekeeping", hkOverdueOpen.length > 0 ? "high" : "normal",
      "Open AdminHousekeeping → complete overdue first."
    );
    await upsertTask(
      `Package inquiries (${(pkgInq || []).length})`,
      "hotel", (pkgInq || []).length > 0 ? "high" : "low",
      "Open AdminPackageInquiries → respond/close loop."
    );
    await upsertTask(
      "Sync Toast today sales + labor",
      "restaurant", "normal",
      "Tap Toast panel → Sync Today (if pending, tap again in 30–60s)."
    );

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
});