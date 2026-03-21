import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Runs nightly — archives any "booked_reserved" intakes whose checkOutDate has passed.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Fetch all booked_reserved records
    const records = await base44.asServiceRole.entities.HotelTreatmentIntake.filter({ bookingStatus: 'booked_reserved' });

    let archived = 0;
    for (const record of records) {
      // Archive if checkOutDate exists and is before today
      if (record.checkOutDate && record.checkOutDate < todayStr) {
        await base44.asServiceRole.entities.HotelTreatmentIntake.update(record.id, { bookingStatus: 'archived' });
        archived++;
      }
    }

    return Response.json({ success: true, checked: records.length, archived });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});