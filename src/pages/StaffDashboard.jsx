import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Users, Home, Sparkles, Clock, ChevronLeft, ChevronRight,
  Leaf, LogOut, Package, LayoutDashboard, Menu, X, ClipboardList,
  UtensilsCrossed, Hotel, Soup, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getStaffSession, clearStaffSession, getModuleSettings,
  DEFAULT_MODULES, isRoleAllowed
} from '@/components/staffAccess';
import StaffChecklist from '@/components/StaffChecklist';
import StaffHotelReservations from '@/components/staff/StaffHotelReservations';
import StaffDailySpecials from '@/components/staff/StaffDailySpecials';
import StaffHousekeepingView from '@/components/staff/StaffHousekeepingView';
import GeneralManagerDashboard from '@/components/staff/GeneralManagerDashboard';

// Lazy import for spa schedule (it's heavy)
import AdminSpaSchedule from '@/pages/AdminSpaSchedule';

// ─── Staff Overview (arrivals/departures/HK) ─────────────────────────────────
function StaffHome({ session, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openTaskId, setOpenTaskId] = useState(null);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: bookings = [] } = useQuery({
    queryKey: ['staff-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 100),
  });

  const { data: hkTasks = [], refetch: refetchHk } = useQuery({
    queryKey: ['hk-tasks-staff', dateStr],
    queryFn: () => base44.entities.HkTask.filter({ taskDate: dateStr }),
  });

  const arrivals = bookings.filter(b => b.check_in_date === dateStr && b.booking_status !== 'cancelled');
  const departures = bookings.filter(b => b.check_out_date === dateStr && b.booking_status !== 'cancelled');

  const openHkTasks = hkTasks.filter(t => t.status !== 'completed' && (t.completionPercent || 0) < 100);
  const doneHkTasks = hkTasks.filter(t => t.status === 'completed' || (t.completionPercent >= 100 && t.totalItems > 0));

  const handlePrevDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const handleNextDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });

  const STATUS_COLOR = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    paused: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    needs_review: "bg-red-100 text-red-800",
  };
  const TYPE_LABEL = {
    checkout: "Checkout", stayover: "Stayover", deep_clean: "Deep Clean",
    opening_duty: "Opening Duty", closing_duty: "Closing Duty",
    public_space: "Public Space", manual: "Manual",
  };

  // If a task is open, show the task detail view inline
  if (openTaskId) {
    const StaffHousekeepingTask = React.lazy(() => import('@/components/staff/StaffHousekeepingTask'));
    return (
      <React.Suspense fallback={<div className="p-8 text-center text-[rgb(150,150,150)]">Loading…</div>}>
        <StaffHousekeepingTask taskId={openTaskId} onBack={() => { setOpenTaskId(null); refetchHk(); }} />
      </React.Suspense>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-4">
        <p className="text-[rgb(107,85,64)] font-light text-lg">Welcome, <strong>{session?.name || 'Staff'}</strong></p>
        <p className="text-sm text-[rgb(45,45,45)] capitalize">Role: {session?.role || 'server'}</p>
      </div>

      <div className="flex items-center justify-between bg-white p-4 border border-[rgb(235,225,213)] rounded-lg">
        <button onClick={handlePrevDay} className="p-2 hover:bg-[rgb(235,225,213)] rounded"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-2xl font-light text-[rgb(107,85,64)]">{format(selectedDate, 'EEEE')}</p>
          <p className="text-sm text-[rgb(45,45,45)]">{format(selectedDate, 'MMMM d, yyyy')}</p>
        </div>
        <button onClick={handleNextDay} className="p-2 hover:bg-[rgb(235,225,213)] rounded"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 border border-[rgb(235,225,213)] rounded-lg text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-[rgb(150,170,155)]" />
          <p className="text-2xl font-light text-[rgb(107,85,64)]">{arrivals.length}</p>
          <p className="text-xs text-[rgb(45,45,45)]">Arrivals</p>
        </div>
        <div className="bg-white p-3 border border-[rgb(235,225,213)] rounded-lg text-center">
          <Home className="w-5 h-5 mx-auto mb-1 text-[rgb(196,155,145)]" />
          <p className="text-2xl font-light text-[rgb(107,85,64)]">{departures.length}</p>
          <p className="text-xs text-[rgb(45,45,45)]">Departures</p>
        </div>
        <button
          onClick={() => onNavigate('housekeeping_tasks')}
          className={`p-3 border rounded-lg text-center transition-colors ${openHkTasks.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-[rgb(235,225,213)]'}`}
        >
          <Package className={`w-5 h-5 mx-auto mb-1 ${openHkTasks.length > 0 ? 'text-amber-500' : 'text-[rgb(198,182,165)]'}`} />
          <p className={`text-2xl font-light ${openHkTasks.length > 0 ? 'text-amber-700' : 'text-[rgb(107,85,64)]'}`}>{openHkTasks.length}</p>
          <p className="text-xs text-[rgb(45,45,45)]">Open Rooms</p>
        </button>
      </div>

      {/* Open HK Rooms — prominent section */}
      {openHkTasks.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold mb-2">🧹 Rooms Needing Cleaning</p>
          <div className="bg-white border border-amber-200 rounded-lg divide-y divide-[rgb(235,225,213)]">
            {openHkTasks.map(t => (
              <button
                key={t.id}
                onClick={() => setOpenTaskId(t.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-amber-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-amber-700">{t.roomNumber}</span>
                  </div>
                  <div>
                    <p className="font-medium text-[rgb(107,85,64)]">{t.roomNumber}</p>
                    <p className="text-sm text-[rgb(45,45,45)]">{TYPE_LABEL[t.taskType] || t.taskType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[t.status] || 'bg-gray-100 text-gray-700'}`}>
                    {t.status?.replace('_', ' ')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[rgb(150,150,150)]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="arrivals" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full bg-[rgb(235,225,213)]">
          <TabsTrigger value="arrivals" className="data-[state=active]:bg-white">Arrivals ({arrivals.length})</TabsTrigger>
          <TabsTrigger value="cleaning" className="data-[state=active]:bg-white">Checkouts ({departures.length})</TabsTrigger>
          <TabsTrigger value="hk" className="data-[state=active]:bg-white">All HK ({hkTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals">
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg divide-y divide-[rgb(235,225,213)]">
            {arrivals.length === 0 ? (
              <p className="p-8 text-center text-[rgb(45,45,45)]">No arrivals today</p>
            ) : arrivals.map(b => (
              <div key={b.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[rgb(107,85,64)]">{b.guest_name}</p>
                    <p className="text-sm text-[rgb(45,45,45)]">{b.room_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-[rgb(150,170,155)]" />
                      <span className="text-sm text-[rgb(45,45,45)]">
                        {b.arrival_window === 'early_afternoon' ? '3:00–4:00 PM' :
                         b.arrival_window === 'late_afternoon' ? '4:00–6:00 PM' : 'After 6:00 PM'}
                      </span>
                    </div>
                    {b.special_requests && (
                      <p className="text-sm text-[rgb(196,155,145)] mt-1 italic">Note: {b.special_requests}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-[rgb(235,225,213)] px-2 py-1 rounded">{b.confirmation_code}</span>
                    <p className="text-sm text-[rgb(45,45,45)] mt-1">{b.num_guests} guest(s)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cleaning">
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg divide-y divide-[rgb(235,225,213)]">
            {departures.length === 0 ? (
              <p className="p-8 text-center text-[rgb(45,45,45)]">No checkouts today</p>
            ) : departures.map(b => (
              <div key={b.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[rgb(107,85,64)]">{b.room_name}</p>
                  <p className="text-sm text-[rgb(45,45,45)]">{b.guest_name} — Check-out by 11:00 AM</p>
                </div>
                <Badge variant="outline">Needs cleaning</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hk">
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg divide-y divide-[rgb(235,225,213)]">
            {hkTasks.length === 0 ? (
              <p className="p-8 text-center text-[rgb(45,45,45)]">No housekeeping tasks for this day</p>
            ) : hkTasks.map(t => (
              <button
                key={t.id}
                onClick={() => setOpenTaskId(t.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[rgb(248,246,242)] transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-[rgb(107,85,64)]">{t.roomNumber}</p>
                  <p className="text-sm text-[rgb(45,45,45)] capitalize">{TYPE_LABEL[t.taskType] || t.taskType} · {t.priority}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[t.status] || 'bg-gray-100 text-gray-700'}`}>
                    {t.status?.replace('_', ' ')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[rgb(150,150,150)]" />
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP = {
  staff_home:              LayoutDashboard,
  ritual_kitchen_inventory: UtensilsCrossed,
  housekeeping_tasks:      Home,
  spa_schedule:            Sparkles,
  hotel:                   Hotel,
  restaurant_daily:        Soup,
  daily_checklists:        ClipboardList,
  gm_home:                 LayoutDashboard,
};

// ─── Main StaffDashboard ──────────────────────────────────────────────────────
export default function StaffDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [settingsMap, setSettingsMap] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState('staff_home');

  useEffect(() => {
    const s = getStaffSession();
    if (!s) { navigate(createPageUrl('StaffLogin')); return; }
    setSession(s);
    (async () => {
      try { setSettingsMap(await getModuleSettings()); }
      catch { setSettingsMap(new Map()); }
    })();
  }, [navigate]);

  const visibleModules = React.useMemo(() => {
    if (!session) return [];
    // Support multi-role: use roles if available, else fall back to role
    const roleKey = session.roles || session.role || 'server';
    const map = settingsMap || new Map();
    return DEFAULT_MODULES.map(m => {
      const row = map.get(m.key);
      const staffVisible = row?.staff_visible ?? m.defaultVisible;
      const allowedRoles = row?.allowed_roles ?? m.defaultRoles;
      return { ...m, staffVisible: !!staffVisible, okRole: isRoleAllowed({ allowed_roles: allowedRoles }, roleKey) };
    }).filter(m => m.staffVisible && m.okRole);
  }, [session, settingsMap]);

  const onLogout = () => { clearStaffSession(); navigate(createPageUrl('StaffLogin')); };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'daily_checklists':    return <StaffChecklist session={session} />;
      case 'spa_schedule':        return <AdminSpaSchedule />;
      case 'hotel':               return <StaffHotelReservations />;
      case 'restaurant_daily':    return <StaffDailySpecials />;
      case 'housekeeping_tasks':  return <StaffHousekeepingView />;
      case 'gm_home':             return <GeneralManagerDashboard />;
      case 'staff_home':
      default:                    return <StaffHome session={session} onNavigate={setView} />;
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)] overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-[rgb(150,170,155)]" />
            <div>
              <h1 className="text-lg font-light text-[rgb(107,85,64)]">Staff Dashboard</h1>
              <p className="text-xs text-[rgb(45,45,45)]">Hotel RITUAL · {session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')} className="text-xs text-[rgb(107,85,64)] hover:underline hidden sm:block">← Back to Site</Link>
            <button
              onClick={() => setNavOpen(!navOpen)}
              className="md:hidden p-2 rounded hover:bg-[rgb(235,225,213)]"
            >
              {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button onClick={onLogout} className="p-2 text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)]" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 md:grid md:grid-cols-4 md:gap-6">
        {/* Sidebar */}
        <aside className={`md:col-span-1 mb-6 md:mb-0 ${navOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-4 space-y-1">
            <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] mb-3">Menu</p>
            {visibleModules.map(m => {
              const Icon = ICON_MAP[m.key] || LayoutDashboard;
              if (m.externalUrl) {
                return (
                  <a
                    key={m.key}
                    href={m.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors text-[rgb(45,45,45)] hover:bg-[rgb(235,225,213)]"
                  >
                    <Icon className="w-4 h-4" />
                    {m.label}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </a>
                );
              }
              return (
                <button
                  key={m.key}
                  onClick={() => { setView(m.key); setNavOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                    ${view === m.key ? 'bg-[rgb(150,170,155)] text-white' : 'text-[rgb(45,45,45)] hover:bg-[rgb(235,225,213)]'}`}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              );
            })}
            {visibleModules.length === 0 && (
              <p className="text-xs text-[rgb(45,45,45)] py-2">No modules enabled. Ask admin.</p>
            )}
            <div className="border-t border-[rgb(235,225,213)] mt-3 pt-3">
              <Link
                to={createPageUrl('Home')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[rgb(45,45,45)] hover:bg-[rgb(235,225,213)] transition-colors"
              >
                <Home className="w-4 h-4" />
                Back to Website
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-3">
          {renderView()}
        </main>
      </div>
    </div>
  );
}