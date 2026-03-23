import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function escapeICS(text) {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toICSDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { date, staffName, status } = body;

    if (!date) {
      return Response.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const startISO = new Date(`${date}T00:00:00`).toISOString();
    const endISO = new Date(`${date}T23:59:59`).toISOString();
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();

    let all = await base44.asServiceRole.entities.SpaBooking.list('-startAt', 500);
    let bookings = all.filter(b => {
      if (!b.startAt) return false;
      const t = new Date(b.startAt).getTime();
      return t >= start && t <= end;
    });

    if (staffName && staffName !== 'ALL') {
      bookings = bookings.filter(b => b.staffName === staffName);
    }
    if (status && status !== 'ALL') {
      bookings = bookings.filter(b => (b.status || '').toLowerCase().includes(status.toLowerCase()));
    }

    bookings.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    const now = toICSDate(new Date().toISOString());
    const lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Hotel Ritual//Spa Schedule//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');

    for (const b of bookings) {
      const dtStart = toICSDate(b.startAt);
      const endTime = b.durationMinutes
        ? new Date(new Date(b.startAt).getTime() + b.durationMinutes * 60000).toISOString()
        : new Date(new Date(b.startAt).getTime() + 60 * 60000).toISOString();
      const dtEnd = toICSDate(endTime);

      const summary = `${b.serviceName || b.service || 'Spa Treatment'}${b.staffName ? ` — ${b.staffName}` : ''}`;
      const description = [
        `Guest: ${b.email || b.phone || '—'}`,
        b.durationMinutes ? `Duration: ${b.durationMinutes} min` : '',
        `Status: ${(b.status || '').replace('booking.', '')}`,
      ].filter(Boolean).join('\n');

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${escapeICS(b.squareBookingId || b.id || dtStart)}@hotelritual`);
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeICS(summary)}`);
      lines.push(`DESCRIPTION:${escapeICS(description)}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    return new Response(lines.join('\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="Ritual-Spa-${date}.ics"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});