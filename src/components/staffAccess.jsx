import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'ritual_staff_session_v1';

export function getStaffSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.exp || Date.now() > parsed.exp) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStaffSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStaffSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function verifyPin(pin) {
  const rows = await base44.entities.StaffPin.list();
  const match = (rows || []).find(r =>
    String(r.pin || '').trim() === String(pin).trim() &&
    (r.is_active ?? true) === true
  );
  if (!match) return null;
  return { role: match.role || 'staff', name: match.name || 'Staff' };
}

export async function getModuleSettings() {
  const rows = await base44.entities.StaffModuleSetting.list();
  const map = new Map();
  (rows || []).forEach(r => { if (r?.key) map.set(r.key, r); });
  return map;
}

export const DEFAULT_MODULES = [
  { key: 'staff_home', label: 'Staff Home', defaultVisible: true, defaultRoles: 'staff,chef,manager' },
  { key: 'kitchen_inventory', label: 'Kitchen: Inventory', defaultVisible: true, defaultRoles: 'chef,manager' },
  { key: 'housekeeping_tasks', label: 'Housekeeping Tasks', defaultVisible: true, defaultRoles: 'staff,chef,manager' },
  { key: 'spa_schedule', label: 'Spa Schedule', defaultVisible: false, defaultRoles: 'staff,chef,manager' },
  { key: 'arrivals_today', label: "Today's Arrivals", defaultVisible: false, defaultRoles: 'staff,manager' },
];

export function isRoleAllowed(settingRow, role) {
  const allowed = String(settingRow?.allowed_roles || '').trim();
  if (!allowed) return true;
  return allowed.split(',').map(s => s.trim()).filter(Boolean).includes(role);
}