import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { startISO, endISO, staffName, status } = body;

    if (!startISO || !endISO) {
      return Response.json({ error: 'startISO and endISO are required' }, { status: 400 });
    }

    // Fetch all bookings
    const all = await base44.asServiceRole.entities.SpaBooking.list('-startAt', 500);

    // Filter by date range
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    let bookings = all.filter(b => {
      if (!b.startAt) return false;
      const t = new Date(b.startAt).getTime();
      return t >= start && t <= end;
    });

    // Filter by staff
    if (staffName && staffName !== 'ALL') {
      bookings = bookings.filter(b => b.staffName === staffName);
    }

    // Filter by status
    if (status && status !== 'ALL') {
      bookings = bookings.filter(b => (b.status || '').toLowerCase().includes(status.toLowerCase()));
    }

    // Sort ascending by start time
    bookings.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    // Build unique staff list from all (unfiltered by staff) for dropdown
    const allForStaff = all.filter(b => {
      if (!b.startAt) return false;
      const t = new Date(b.startAt).getTime();
      return t >= start && t <= end;
    });
    const staffNames = Array.from(new Set(allForStaff.map(b => b.staffName).filter(Boolean))).sort();

    return Response.json({ success: true, bookings, staffNames });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});