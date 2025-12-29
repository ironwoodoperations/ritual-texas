import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { 
  Calendar, Users, Sparkles, Home, ArrowRight, 
  Clock, MapPin, ChevronRight, Settings, LogOut,
  BedDouble, Menu, X, LayoutDashboard, CalendarDays,
  ClipboardList, FileText, Leaf, Bell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Home');
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('AdminDashboard'));
      }
    };
    loadUser();
  }, []);

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 100),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const todayArrivals = bookings?.filter(b => b.check_in_date === todayStr && b.booking_status !== 'cancelled') || [];
  const todayDepartures = bookings?.filter(b => b.check_out_date === todayStr && b.booking_status !== 'cancelled') || [];
  const todayTreatments = bookings?.flatMap(b => 
    (b.treatments || []).filter(t => t.scheduled_datetime?.startsWith(todayStr))
  ) || [];

  const upcomingBookings = bookings?.filter(b => {
    const checkIn = new Date(b.check_in_date);
    return checkIn >= today && b.booking_status !== 'cancelled';
  }).slice(0, 5) || [];

  const totalRevenue = bookings?.reduce((sum, b) => sum + (b.grand_total || 0), 0) || 0;

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', page: 'AdminDashboard', active: true },
    { icon: CalendarDays, label: 'Bookings', page: 'AdminBookings' },
    { icon: BedDouble, label: 'Rooms', page: 'AdminRooms' },
    { icon: Sparkles, label: 'Treatments', page: 'AdminTreatments' },
    { icon: FileText, label: 'Packages', page: 'AdminPackages' },
    { icon: ClipboardList, label: 'Knowledge Base', page: 'AdminKnowledge' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)] flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[rgb(235,225,213)] transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-[rgb(235,225,213)]">
            <div className="flex items-center gap-2">
              <Leaf className="w-6 h-6 text-[rgb(150,170,155)]" />
              <span className="text-lg tracking-widest font-light text-[rgb(107,85,64)]">RITUAL</span>
            </div>
            <p className="text-xs text-[rgb(45,45,45)] mt-1">Admin Portal</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-[rgb(150,170,155)]/10 text-[rgb(150,170,155)]' 
                    : 'text-[rgb(45,45,45)] hover:bg-[rgb(235,225,213)]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-[rgb(235,225,213)]">
            <Link 
              to={createPageUrl('StaffDashboard')}
              className="flex items-center gap-3 px-4 py-3 text-[rgb(45,45,45)] hover:bg-[rgb(235,225,213)] rounded-lg"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm">Staff View</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-[rgb(45,45,45)] hover:bg-[rgb(235,225,213)] rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h1 className="text-xl font-light text-[rgb(107,85,64)]">Dashboard</h1>
                <p className="text-sm text-[rgb(45,45,45)]">{format(today, 'EEEE, MMMM d, yyyy')}</p>
              </div>
            </div>
            <Link 
              to={createPageUrl('Home')}
              className="text-sm text-[rgb(150,170,155)] hover:underline flex items-center gap-1"
            >
              View Site <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <div className="p-6">
          {/* Today's Overview */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 border border-[rgb(235,225,213)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[rgb(45,45,45)]">Today's Arrivals</span>
                <Users className="w-5 h-5 text-[rgb(150,170,155)]" />
              </div>
              <p className="text-3xl font-light text-[rgb(107,85,64)]">{todayArrivals.length}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 border border-[rgb(235,225,213)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[rgb(45,45,45)]">Today's Departures</span>
                <Home className="w-5 h-5 text-[rgb(196,155,145)]" />
              </div>
              <p className="text-3xl font-light text-[rgb(107,85,64)]">{todayDepartures.length}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 border border-[rgb(235,225,213)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[rgb(45,45,45)]">Today's Treatments</span>
                <Sparkles className="w-5 h-5 text-[rgb(198,182,165)]" />
              </div>
              <p className="text-3xl font-light text-[rgb(107,85,64)]">{todayTreatments.length}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 border border-[rgb(235,225,213)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[rgb(45,45,45)]">Total Revenue</span>
                <Calendar className="w-5 h-5 text-[rgb(150,170,155)]" />
              </div>
              <p className="text-3xl font-light text-[rgb(107,85,64)]">${totalRevenue.toLocaleString()}</p>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Today's Arrivals */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-[rgb(235,225,213)]"
            >
              <div className="p-4 border-b border-[rgb(235,225,213)] flex items-center justify-between">
                <h2 className="font-light text-[rgb(107,85,64)]">Today's Arrivals</h2>
                <Badge className="bg-[rgb(150,170,155)]">{todayArrivals.length}</Badge>
              </div>
              <div className="divide-y divide-[rgb(235,225,213)]">
                {todayArrivals.length === 0 ? (
                  <p className="p-6 text-center text-[rgb(45,45,45)]">No arrivals today</p>
                ) : (
                  todayArrivals.map(booking => (
                    <div key={booking.id} className="p-4 hover:bg-[rgb(248,246,242)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[rgb(107,85,64)]">{booking.guest_name}</p>
                          <p className="text-sm text-[rgb(45,45,45)]">{booking.room_name}</p>
                          <p className="text-xs text-[rgb(150,170,155)] mt-1">
                            {booking.arrival_window === 'early_afternoon' ? '3-4 PM' :
                             booking.arrival_window === 'late_afternoon' ? '4-6 PM' : 'After 6 PM'}
                          </p>
                        </div>
                        <span className="text-xs bg-[rgb(235,225,213)] px-2 py-1">
                          {booking.confirmation_code}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Today's Departures */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white border border-[rgb(235,225,213)]"
            >
              <div className="p-4 border-b border-[rgb(235,225,213)] flex items-center justify-between">
                <h2 className="font-light text-[rgb(107,85,64)]">Today's Departures (Cleaning Needed)</h2>
                <Badge className="bg-[rgb(196,155,145)]">{todayDepartures.length}</Badge>
              </div>
              <div className="divide-y divide-[rgb(235,225,213)]">
                {todayDepartures.length === 0 ? (
                  <p className="p-6 text-center text-[rgb(45,45,45)]">No departures today</p>
                ) : (
                  todayDepartures.map(booking => (
                    <div key={booking.id} className="p-4 hover:bg-[rgb(248,246,242)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[rgb(107,85,64)]">{booking.room_name}</p>
                          <p className="text-sm text-[rgb(45,45,45)]">{booking.guest_name}</p>
                          <p className="text-xs text-[rgb(196,155,145)] mt-1">
                            Checkout by 11:00 AM
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[rgb(196,155,145)] border-[rgb(196,155,145)]">
                          Needs Cleaning
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Upcoming Bookings */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-[rgb(235,225,213)] lg:col-span-2"
            >
              <div className="p-4 border-b border-[rgb(235,225,213)] flex items-center justify-between">
                <h2 className="font-light text-[rgb(107,85,64)]">Next 7 Days</h2>
                <Link 
                  to={createPageUrl('AdminBookings')}
                  className="text-sm text-[rgb(150,170,155)] hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="divide-y divide-[rgb(235,225,213)]">
                {upcomingBookings.length === 0 ? (
                  <p className="p-6 text-center text-[rgb(45,45,45)]">No upcoming bookings</p>
                ) : (
                  upcomingBookings.map(booking => (
                    <div key={booking.id} className="p-4 hover:bg-[rgb(248,246,242)] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[rgb(235,225,213)] flex items-center justify-center">
                          <span className="text-xs text-[rgb(107,85,64)]">
                            {format(new Date(booking.check_in_date), 'MMM')}<br/>
                            {format(new Date(booking.check_in_date), 'd')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[rgb(107,85,64)]">{booking.guest_name}</p>
                          <p className="text-sm text-[rgb(45,45,45)]">
                            {booking.room_name} • {booking.num_guests} {booking.num_guests === 1 ? 'guest' : 'guests'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[rgb(107,85,64)]">${booking.grand_total}</p>
                        <p className="text-xs text-[rgb(45,45,45)]">{booking.confirmation_code}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}