import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'ritual_staff_session_v2';

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
  return { role: match.role || 'server', name: match.name || 'Staff' };
}

export async function getModuleSettings() {
  const rows = await base44.entities.StaffModuleSetting.list();
  const map = new Map();
  (rows || []).forEach(r => { if (r?.key) map.set(r.key, r); });
  return map;
}

// New role set
export const ALL_ROLES = [
  'server',
  'chef',
  'kitchen_staff',
  'housekeeping',
  'hotel_host',
  'hotel_service_provider',
  'manager',
];

export const ROLE_COLORS = {
  server:                 'bg-blue-100 text-blue-800',
  chef:                   'bg-amber-100 text-amber-800',
  kitchen_staff:          'bg-orange-100 text-orange-800',
  housekeeping:           'bg-teal-100 text-teal-800',
  hotel_host:             'bg-indigo-100 text-indigo-800',
  hotel_service_provider: 'bg-purple-100 text-purple-800',
  manager:                'bg-rose-100 text-rose-800',
};

export const ROLE_DESCRIPTIONS = {
  server:                 'Front-of-house service — restaurant, bar, daily specials.',
  chef:                   'Kitchen lead — checklists, inventory, menu management.',
  kitchen_staff:          'BOH team — kitchen checklists and prep tasks.',
  housekeeping:           'Room cleaning, turnover, and HK task list.',
  hotel_host:             'Front desk — hotel arrivals, check-ins, check-outs.',
  hotel_service_provider: 'Spa & wellness — treatment schedule, tip links, bookings.',
  manager:                'Full access to all staff modules.',
};

export const DEFAULT_MODULES = [
  {
    key: 'staff_home',
    label: 'Overview',
    defaultVisible: true,
    defaultRoles: 'server,chef,kitchen_staff,housekeeping,hotel_host,hotel_service_provider,manager',
  },
  {
    key: 'daily_checklists',
    label: 'Daily Checklists',
    defaultVisible: true,
    defaultRoles: 'server,chef,kitchen_staff,housekeeping,hotel_host,hotel_service_provider,manager',
  },
  {
    key: 'kitchen_inventory',
    label: 'Kitchen: Inventory',
    defaultVisible: true,
    defaultRoles: 'chef,kitchen_staff,manager',
  },
  {
    key: 'ritual_kitchen_inventory',
    label: 'Ritual Kitchen Inventory',
    defaultVisible: true,
    defaultRoles: 'chef,kitchen_staff,manager',
    externalUrl: 'https://stylish-innovate-flow-now.base44.app',
  },
  {
    key: 'housekeeping_tasks',
    label: 'Housekeeping Tasks',
    defaultVisible: true,
    defaultRoles: 'housekeeping,hotel_host,manager',
  },
  {
    key: 'hotel',
    label: 'Hotel Reservations',
    defaultVisible: true,
    defaultRoles: 'hotel_host,manager',
  },
  {
    key: 'spa_schedule',
    label: 'Spa Schedule',
    defaultVisible: true,
    defaultRoles: 'hotel_service_provider,manager',
  },
  {
    key: 'restaurant_daily',
    label: 'Daily Specials & Soup',
    defaultVisible: true,
    defaultRoles: 'server,chef,manager',
  },
];

export function isRoleAllowed(settingRow, role) {
  const allowed = String(settingRow?.allowed_roles || '').trim();
  if (!allowed) return true;
  return allowed.split(',').map(s => s.trim()).filter(Boolean).includes(role);
}