import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Users, Home, Sparkles, Clock, ChevronLeft, ChevronRight,
  Leaf, LogOut, Package, LayoutDashboard, Menu, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getStaffSession, clearStaffSession, getModuleSettings,
  DEFAULT_MODULES, isRoleAllowed
} from '@/components/staffAccess';

// ─── Staff Inventory (stock-only editing) ────────────────────────────────────
function StaffInventory({ session }) {
  const role = session?.role || 'staff';
  const isChef = role === 'chef' || role === 'manager';
  const [search, setSearch] = useState('');

  const { data: inventory = [], isLoading, refetch } = useQuery({
    queryKey: ['hk-rooms-staff'],
    queryFn: () => base44.entities.HkRoom.list(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Search rooms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Badge variant="outline">Role: {role}</Badge>
      </div>
      {!isChef && (
        <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
          View only — stock editing is for chef/manager roles.
        </p>
      )}
      {isLoading ? (
        <div className="text-[rgb(45,45,45)]">Loading…</div>
      ) : (
        <div className="space-y-2">
          {inventory
            .filter(r => !search || (r.roomNumber || '').toLowerCase().includes(search.toLowerCase()))
            .map(room => (
              <div key={room.id} className="flex items-center justify-between p-4 bg-white border border-[rgb(235,225,213)] rounded-lg">
                <div>
                  <div className="font-medium text-[rgb(107,85,64)]">Room {room.roomNumber}</div>
                  {room.roomType && <div className="text-xs text-[rgb(45,45,45)]">{room.roomType}</div>}
                </div>
                <Badge variant={room.active ? 'default' : 'secondary'}>
                  {room.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          {inventory.length === 0 && <p className="text-[rgb(45,45,45)]">No rooms found.</p>}
        </div>
      )}
    </div>
  );
}

// ─── Staff Home (arrivals/departures) ────────────────────────────────────────
function StaffHome({ session }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: bookings = [] } = useQuery({
    queryKey: ['staff-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 100),
  });

  const { data: hkTasks = [] } = useQuery({
    queryKey: ['hk-tasks-staff', dateStr],
    queryFn: () => base44.entities.HkTask.filter({ taskDate: dateStr }),
  });

  const arrivals = bookings.filter(b => b.check_in_date === dateStr && b.booking_status !== 'cancelled');
  const departures = bookings.filter(b => b.check_out_date === dateStr && b.booking_status !== 'cancelled');
  const treatments = bookings.flatMap(b =>
    (b.treatments || []).map(t => ({ ...t, guest_name: b.guest_name, room_name: b.room_name }))
  );

  const handlePrevDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const handleNextDay = () => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-4">
        <p className="text-[rgb(107,85,64)] font-light text-lg">
          Welcome, <strong>{session?.name || 'Staff'}</strong>
        </p>
        <p className="text-sm text-[rgb(45,45,45)]">Role: {session?.role || 'staff'}</p>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-between bg-white p-4 border border-[rgb(235,225,213)] rounded-lg">
        <button onClick={handlePrevDay} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-2xl font-light text-[rgb(107,85,64)]">{format(selectedDate, 'EEEE')}</p>
          <p className="text-sm text-[rgb(45,45,45)]">{format(selectedDate, 'MMMM d, yyyy')}</p>
        </div>
        <button onClick={handleNextDay} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 border border-[rgb(235,225,213)] rounded-lg text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-[rgb(150,170,155)]" />
          <p className="text-2xl font-light text-[rgb(107,85,64)]">{arrivals.length}</p>
          <p className="text-xs text-[rgb(45,45,45)]">Arrivals</p>
        </div>
        <div className="bg-white p-4 border border-[rgb(235,225,213)] rounded-lg text-center">
          <Home className="w-6 h-6 mx-auto mb-2 text-[rgb(196,155,145)]" />
          <p className="text-2xl font-light text-[rgb(107,85,64)]">{departures.length}</p>
          <p className="text-xs text-[rgb(45,45,45)]">Departures</p>
        </div>
        <div className="bg-white p-4 border border-[rgb(235,225,213)] rounded-lg text-center">
          <Package className="w-6 h-6 mx-auto mb-2 text-[rgb(198,182,165)]" />
          <p className="text-2xl font-light text-[rgb(107,85,64)]">{hkTasks.length}</p>
          <p className="text-xs text-[rgb(45,45,45)]">HK Tasks</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="arrivals" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full bg-[rgb(235,225,213)]">
          <TabsTrigger value="arrivals" className="data-[state=active]:bg-white">Arrivals ({arrivals.length})</TabsTrigger>
          <TabsTrigger value="cleaning" className="data-[state=active]:bg-white">Checkouts ({departures.length})</TabsTrigger>
          <TabsTrigger value="hk" className="data-[state=active]:bg-white">HK Tasks ({hkTasks.length})</TabsTrigger>
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
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[rgb(107,85,64)]">Room {t.roomNumber}</p>
                  <p className="text-sm text-[rgb(45,45,45)] capitalize">{t.taskType?.replace('_', ' ')} · {t.priority}</p>
                </div>
                <Badge variant={t.status === 'completed' ? 'default' : 'secondary'}>
                  {t.status}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main StaffDashboard (shell + PIN gate) ───────────────────────────────────
export default function StaffDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [settingsMap, setSettingsMap] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState('home');

  useEffect(() => {
    const s = getStaffSession();
    if (!s) {
      navigate(createPageUrl('StaffLogin'));
      return;
    }
    setSession(s);
    (async () => {
      try {
        const map = await getModuleSettings();
        setSettingsMap(map);
      } catch {
        setSettingsMap(new Map());
      }
    })();
  }, [navigate]);

  const visibleModules = React.useMemo(() => {
    if (!session) return [];
    const role = session.role || 'staff';
    const map = settingsMap || new Map();
    return DEFAULT_MODULES.map(m => {
      const row = map.get(m.key);
      const staffVisible = row?.staff_visible ?? m.defaultVisible;
      const allowedRoles = row?.allowed_roles ?? m.defaultRoles;
      return { ...m, staffVisible: !!staffVisible, okRole: isRoleAllowed({ allowed_roles: allowedRoles }, role) };
    }).filter(m => m.staffVisible && m.okRole);
  }, [session, settingsMap]);

  const onLogout = () => {
    clearStaffSession();
    navigate(createPageUrl('StaffLogin'));
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const iconMap = {
    staff_home: LayoutDashboard,
    kitchen_inventory: Package,
    housekeeping_tasks: Home,
    spa_schedule: Sparkles,
    arrivals_today: Users,
  };

  const renderView = () => {
    switch (view) {
      case 'kitchen_inventory': return <StaffInventory session={session} />;
      case 'housekeeping_tasks':
      case 'arrivals_today':
      case 'staff_home':
      default: return <StaffHome session={session} />;
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {/* Header */}
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-[rgb(150,170,155)]" />
            <div>
              <h1 className="text-lg font-light text-[rgb(107,85,64)]">Staff Dashboard</h1>
              <p className="text-xs text-[rgb(45,45,45)]">Hotel RITUAL</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              const Icon = iconMap[m.key] || LayoutDashboard;
              return (
                <button
                  key={m.key}
                  onClick={() => { setView(m.key); setNavOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                    ${view === m.key
                      ? 'bg-[rgb(150,170,155)] text-white'
                      : 'text-[rgb(45,45,45)] hover:bg-[rgb(235,225,213)]'}`}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              );
            })}
            {visibleModules.length === 0 && (
              <p className="text-xs text-[rgb(45,45,45)] py-2">No modules enabled. Ask admin.</p>
            )}
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