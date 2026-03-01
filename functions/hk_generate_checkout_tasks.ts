import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (service role) or admin user calls
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch {
      // May be a scheduled/service call — check body for a shared key or just allow
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || todayStr();

    // Fetch all bookings checking out today
    const [bookings, rooms, templates] = await Promise.all([
      base44.asServiceRole.entities.Booking.filter({ check_out_date: targetDate }),
      base44.asServiceRole.entities.HkRoom.list('sortOrder', 50),
      base44.asServiceRole.entities.HkTemplate.filter({ active: true }),
    ]);

    // Get checkout template (prefer taskType=checkout)
    const checkoutTemplate = templates.find(t => t.taskType === 'checkout');

    // Get existing HK tasks for that date to avoid duplicates
    const existingTasks = await base44.asServiceRole.entities.HkTask.filter({ taskDate: targetDate });

    let created = 0;
    let skipped = 0;

    for (const booking of bookings) {
      if (['cancelled'].includes(booking.booking_status)) continue;

      // Match booking room to HkRoom
      const room = rooms.find(r =>
        r.roomNumber === booking.room_name ||
        r.id === booking.room_id
      );

      if (!room) {
        skipped++;
        continue;
      }

      // Skip if task already exists for this room + date
      const alreadyExists = existingTasks.some(
        t => t.roomId === room.id && t.taskDate === targetDate && t.taskType === 'checkout'
      );
      if (alreadyExists) {
        skipped++;
        continue;
      }

      // Create the HK task
      const task = await base44.asServiceRole.entities.HkTask.create({
        taskDate: targetDate,
        roomId: room.id,
        roomNumber: room.roomNumber,
        taskType: 'checkout',
        priority: 'normal',
        status: 'pending',
        source: 'admin',
        cloudbedsReservationId: booking.confirmation_code || null,
        adminNotes: booking.special_requests || '',
        totalItems: checkoutTemplate?.items?.length || 0,
        completedItems: 0,
        completionPercent: 0,
      });

      // Seed checklist items from template
      if (checkoutTemplate?.items?.length) {
        await Promise.all(
          checkoutTemplate.items.map((item, i) =>
            base44.asServiceRole.entities.HkTaskItem.create({
              ...item,
              taskId: task.id,
              isDone: false,
              sortOrder: i,
            })
          )
        );
      }

      created++;
    }

    return Response.json({ ok: true, date: targetDate, created, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});