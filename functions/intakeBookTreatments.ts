import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { intake } = await req.json();

    if (!intake?.selectedTreatments?.length) {
      return Response.json({ error: 'No treatments selected' }, { status: 400 });
    }

    if (!intake?.guestName || !intake?.guestEmail) {
      return Response.json({ error: 'Guest name and email required' }, { status: 400 });
    }

    const startAt = intake.preferredTreatmentDate
      ? `${intake.preferredTreatmentDate}T${(intake.preferredTreatmentTime || '10:00').replace(/[^0-9:]/g, '').padEnd(5, '0')}:00`
      : null;

    const bookings = [];
    for (const treatmentName of intake.selectedTreatments) {
      const booking = await base44.entities.SpaBooking.create({
        clientName: intake.guestName,
        email: intake.guestEmail,
        phone: intake.phone || '',
        serviceName: treatmentName,
        startAt,
        durationMinutes: 60,
        price: 150,
        source: 'manual',
        status: 'pending',
      });
      bookings.push(booking);
    }

    return Response.json({
      success: true,
      bookings,
      message: `${bookings.length} treatment booking${bookings.length === 1 ? '' : 's'} created`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});