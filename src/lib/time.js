// Format a "HH:mm" or "HH:mm:ss" 24-hour string as "h:mm AM/PM".
// Returns "" for falsy / unparseable input. Display-only; do not use
// for sorting or API payloads.
export function fmtTime(t) {
  if (!t) return '';
  const [hStr, mStr] = String(t).split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Hotel RITUAL operates on Central Time. Every INSTANT rendered anywhere in
// this app — staff screens, guest screens, emails — must display in
// America/Chicago regardless of the viewer's device or the server runtime.
//
// IANA zone, never a fixed offset: America/Chicago resolves CST (-6) and
// CDT (-5) automatically across DST boundaries.
//
// INSTANT  = a moment in time (created_date, startAt, lastActivityAt, any ISO
//            string with a time component). Convert to Central.
// CALENDAR = a date with no time (check_in_date, "2026-08-03"). NEVER
//            timezone-convert; use fmtCalendarDate below.
// ---------------------------------------------------------------------------

export const HOTEL_TZ = 'America/Chicago';

// Base44 stores timestamps in UTC. Some fields come back with a trailing "Z",
// some do not. A datetime string WITHOUT a zone designator is parsed by JS as
// *local* time, which silently shifts it. Force UTC interpretation.
export function parseInstant(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  let s = String(v).trim();
  const hasTime = s.includes('T') || / \d{2}:\d{2}/.test(s);
  const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (hasTime && !hasZone) s = s.replace(' ', 'T') + 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// "12:33 PM"
export function ctTime(v) {
  const d = parseInstant(v);
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', {
    timeZone: HOTEL_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// "Aug 3, 2026" — pass opts to override or add parts
export function ctDate(v, opts) {
  const d = parseInstant(v);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    timeZone: HOTEL_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}

// "Aug 3, 12:33 PM"
export function ctDateTime(v, opts) {
  const d = parseInstant(v);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    timeZone: HOTEL_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...opts,
  });
}

// "YYYY-MM-DD" — the Central calendar day an instant falls on.
// en-CA gives ISO ordering; the timeZone option does the real work.
export function ctDayISO(v = new Date()) {
  const d = parseInstant(v);
  if (!d) return '';
  return d.toLocaleDateString('en-CA', { timeZone: HOTEL_TZ });
}

// Today's date in Central, "YYYY-MM-DD".
export function ctTodayISO() {
  return ctDayISO(new Date());
}

// Current wall-clock time in Central, "HH:mm" 24-hour.
export function ctNowHHMM() {
  return new Date()
    .toLocaleTimeString('en-GB', {
      timeZone: HOTEL_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .slice(0, 5);
}

// CALENDAR-date passthrough. For "YYYY-MM-DD" values that are NOT instants
// (check-in / check-out dates). Anchors at local noon so no timezone math can
// shift the day. Never route an instant through this.
export function fmtCalendarDate(s, opts) {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}
