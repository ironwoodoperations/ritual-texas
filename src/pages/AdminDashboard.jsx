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
  ClipboardList, FileText, Leaf, Bell, UtensilsCrossed, ChefHat
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

  // Spa bookings from Square
  const { data: spaBookings = [] } = useQuery({
    queryKey: ['spa-bookings'],
    queryFn: () => base44.entities.SpaBooking.list('-created_date', 100),
  });

  // Restaurant data
  const { data: restaurantSpecials = [] } = useQuery({
    queryKey: ['restaurant-specials-admin'],
    queryFn: () => base44.entities.RestaurantDailySpecials.filter({ isArchived: false }),
  });

  const { data: restaurantReservations = [] } = useQuery({
    queryKey: ['restaurant-reservations-admin'],
    queryFn: () => base44.entities.RestaurantReservationRequests.list('-created_date', 50),
  });

  const { data: eventLeads = [] } = useQuery({
    queryKey: ['event-leads-admin'],
    queryFn: () => base44.entities.RestaurantEventLeads.list('-created_date', 50),
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments-admin'],
    queryFn: () => base44.entities.Treatment.list(),
  });

  const { data: knowledgeBase = [] } = useQuery({
    queryKey: ['knowledge-base-admin'],
    queryFn: () => base44.entities.KnowledgeBase.list(),
  });

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Spa bookings for today
  const todaySpaBookings = spaBookings.filter(b => {
    if (!b.startAt) return false;
    const bookingDate = format(new Date(b.startAt), 'yyyy-MM-dd');
    return bookingDate === todayStr;
  });

  // Restaurant stats
  const activeSpecials = restaurantSpecials.filter(s => s.isActiveToday);
  const pendingReservations = restaurantReservations.filter(r => r.status === 'pending');
  const pendingEvents = eventLeads.filter(e => e.status === 'pending');

  // Active content stats
  const activeTreatments = treatments.filter(t => t.is_available);
  const activeKnowledgeBase = knowledgeBase.filter(k => k.is_active);

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', page: 'AdminDashboard', active: true },
    { icon: CalendarDays, label: 'Room Bookings', page: 'AdminBookings' },
    { icon: Sparkles, label: 'Treatment Bookings', page: 'AdminTreatmentBookings' },
    { icon: BedDouble, label: 'Rooms', page: 'AdminRooms' },
    { icon: Sparkles, label: 'Treatments', page: 'AdminTreatments' },
    { icon: FileText, label: 'Packages', page: 'AdminPackages' },
    { icon: Bell, label: 'Package Inquiries', page: 'AdminPackageInquiries' },
    { icon: ClipboardList, label: 'Knowledge Base', page: 'AdminKnowledge' },
    { icon: MapPin, label: 'Image Library', page: 'AdminImages' },
    { icon: Settings, label: 'Restaurant', page: 'AdminRestaurant' },
    { icon: ChefHat, label: 'Catering', page: 'AdminCatering' },
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

          <div className="p-4 border-t border-[rgb(235,225,213)] space-y-1">
            <Link 
              to={createPageUrl('Home')}
              className="flex items-center gap-3 px-4 py-3 text-[rgb(45,45,45)] hover:bg-[rgb(235,225,213)] rounded-lg"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm">Back to Home</span>
            </Link>
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
                <span className="text-sm text-[rgb(45,45,45)]">Today's Spa Bookings</span>
                <Sparkles className="w-5 h-5 text-[rgb(150,170,155)]" />
              </div>
              <p className="text-3xl font-light text-[rgb(107,85,64)]">{todaySpaBookings.length}</p>
              <p className="text-xs text-[rgb(45,45,45)] mt-1">From Square</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 border border-[rgb(235,225,213)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[rgb(45,45,45)]">Active Specials</span>
                <UtensilsCrossed className="w-5 h-5 text-[rgb(196,155,145)]" />
              </div>
              <p className="text-3xl font-light text-[rgb(107,85,64)]">{activeSpecials.length}</p>
              <p className="text-xs text-[rgb(45,45,45)] mt-1">Today's menu</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 border border-[rgb(235,225,213)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[rgb(45,45,45)]">Pending Requests</span>
                <Bell className="w-5 h-5 text-[rgb(198,182,165)]" />
              </div>
              <p className="text-3xl font-light text-[rgb(107,85,64)]">{pendingReservations.length + pendingEvents.length}</p>
              <p className="text-xs text-[rgb(45,45,45)] mt-1">Reservations & events</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 border border-[rgb(235,225,213)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[rgb(45,45,45)]">Active Treatments</span>
                <Sparkles className="w-5 h-5 text-[rgb(150,170,155)]" />
              </div>
              <p className="text-3xl font-light text-[rgb(107,85,64)]">{activeTreatments.length}</p>
              <p className="text-xs text-[rgb(45,45,45)] mt-1">Available services</p>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Today's Spa Bookings */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-[rgb(235,225,213)]"
            >
              <div className="p-4 border-b border-[rgb(235,225,213)] flex items-center justify-between">
                <h2 className="font-light text-[rgb(107,85,64)]">Today's Spa Bookings</h2>
                <Badge className="bg-[rgb(150,170,155)]">{todaySpaBookings.length}</Badge>
              </div>
              <div className="divide-y divide-[rgb(235,225,213)]">
                {todaySpaBookings.length === 0 ? (
                  <p className="p-6 text-center text-[rgb(45,45,45)]">No spa bookings today</p>
                ) : (
                  todaySpaBookings.map(booking => (
                    <div key={booking.id} className="p-4 hover:bg-[rgb(248,246,242)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[rgb(107,85,64)]">{booking.serviceName || 'Spa Service'}</p>
                          <p className="text-sm text-[rgb(45,45,45)]">{booking.email}</p>
                          <p className="text-xs text-[rgb(150,170,155)] mt-1">
                            {booking.startAt && format(new Date(booking.startAt), 'h:mm a')}
                            {booking.durationMinutes && ` • ${booking.durationMinutes} min`}
                          </p>
                        </div>
                        {booking.staffName && (
                          <span className="text-xs bg-[rgb(235,225,213)] px-2 py-1">
                            {booking.staffName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Pending Restaurant Requests */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white border border-[rgb(235,225,213)]"
            >
              <div className="p-4 border-b border-[rgb(235,225,213)] flex items-center justify-between">
                <h2 className="font-light text-[rgb(107,85,64)]">Pending Requests</h2>
                <Badge className="bg-[rgb(196,155,145)]">{pendingReservations.length + pendingEvents.length}</Badge>
              </div>
              <div className="divide-y divide-[rgb(235,225,213)]">
                {pendingReservations.length === 0 && pendingEvents.length === 0 ? (
                  <p className="p-6 text-center text-[rgb(45,45,45)]">No pending requests</p>
                ) : (
                  <>
                    {pendingReservations.slice(0, 3).map(req => (
                      <div key={req.id} className="p-4 hover:bg-[rgb(248,246,242)]">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-[rgb(107,85,64)]">{req.name}</p>
                            <p className="text-sm text-[rgb(45,45,45)]">
                              {req.dateTimeRequested && format(new Date(req.dateTimeRequested), 'MMM d, h:mm a')}
                            </p>
                            <p className="text-xs text-[rgb(150,170,155)] mt-1">
                              Party of {req.partySize}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[rgb(196,155,145)] border-[rgb(196,155,145)]">
                            Reservation
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {pendingEvents.slice(0, 2).map(event => (
                      <div key={event.id} className="p-4 hover:bg-[rgb(248,246,242)]">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-[rgb(107,85,64)]">{event.name}</p>
                            <p className="text-sm text-[rgb(45,45,45)]">
                              {event.dateRequested && format(new Date(event.dateRequested), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-[rgb(150,170,155)] mt-1">
                              {event.eventType} • {event.partySize} guests
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[rgb(196,155,145)] border-[rgb(196,155,145)]">
                            Event
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-[rgb(235,225,213)] lg:col-span-2"
            >
              <div className="p-4 border-b border-[rgb(235,225,213)]">
                <h2 className="font-light text-[rgb(107,85,64)]">Quick Actions</h2>
              </div>
              <div className="p-6 grid md:grid-cols-3 gap-4">
                <Link
                  to={createPageUrl('AdminRestaurant')}
                  className="p-4 border border-[rgb(235,225,213)] rounded-lg hover:bg-[rgb(248,246,242)] transition-colors"
                >
                  <UtensilsCrossed className="w-6 h-6 text-[rgb(150,170,155)] mb-2" />
                  <h3 className="font-medium text-[rgb(107,85,64)] mb-1">Update Menu</h3>
                  <p className="text-xs text-[rgb(45,45,45)]">Manage specials & sections</p>
                </Link>
                <Link
                  to={createPageUrl('AdminTreatments')}
                  className="p-4 border border-[rgb(235,225,213)] rounded-lg hover:bg-[rgb(248,246,242)] transition-colors"
                >
                  <Sparkles className="w-6 h-6 text-[rgb(150,170,155)] mb-2" />
                  <h3 className="font-medium text-[rgb(107,85,64)] mb-1">Spa Services</h3>
                  <p className="text-xs text-[rgb(45,45,45)]">Manage treatments</p>
                </Link>
                <Link
                  to={createPageUrl('AdminKnowledge')}
                  className="p-4 border border-[rgb(235,225,213)] rounded-lg hover:bg-[rgb(248,246,242)] transition-colors"
                >
                  <ClipboardList className="w-6 h-6 text-[rgb(150,170,155)] mb-2" />
                  <h3 className="font-medium text-[rgb(107,85,64)] mb-1">Knowledge Base</h3>
                  <p className="text-xs text-[rgb(45,45,45)]">{activeKnowledgeBase.length} active articles</p>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}