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
