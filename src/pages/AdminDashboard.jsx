import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Calendar, Users, Sparkles, Home, ArrowRight,
  Bell, UtensilsCrossed, ChefHat, BedDouble,
  ClipboardList, FileText, Image, LogOut, Leaf,
  CalendarDays, BookOpen, Brush, AlertTriangle,
  BedSingle, MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') window.location.href = createPageUrl('Home');
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('AdminDashboard'));
      }
    };
    loadUser();
  }, []);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const { data: restaurantReservations = [] } = useQuery({
    queryKey: ['restaurant-reservations-admin'],
    queryFn: () => base44.entities.RestaurantReservationRequests.list('-created_date', 50),
  });
  const { data: eventLeads = [] } = useQuery({
    queryKey: ['event-leads-admin'],
    queryFn: () => base44.entities.RestaurantEventLeads.list('-created_date', 50),
  });
  const { data: hkIssues = [] } = useQuery({
    queryKey: ['hk-issues-open-dash'],
    queryFn: () => base44.entities.HkIssue.filter({ status: 'open' }),
  });
  const { data: hkTasks = [] } = useQuery({
    queryKey: ['hk-tasks-dash'],
    queryFn: () => base44.entities.HkTask.filter({ taskDate: todayStr }),
  });
  const { data: spaBookings = [] } = useQuery({
    queryKey: ['spa-bookings-dash'],
    queryFn: () => base44.entities.SpaBooking.list('-startAt', 200),
  });
  const { data: hotelBookings = [] } = useQuery({
    queryKey: ['hotel-bookings-dash'],
    queryFn: () => base44.entities.Booking.list('-check_in_date', 200),
  });
  const { data: packageInquiries = [] } = useQuery({
    queryKey: ['pkg-inquiries-dash'],
    queryFn: () => base44.entities.PackageInquiry.filter({ status: 'new' }),
  });
  const { data: cateringQuotes = [] } = useQuery({
    queryKey: ['catering-quotes-dash'],
    queryFn: () => base44.entities.CateringQuote.list('-created_date', 100),
  });

  const pendingReservations = restaurantReservations.filter(r => r.status === 'pending');
  const pendingEvents = eventLeads.filter(e => e.status === 'pending');
  const pendingHkTasks = hkTasks.filter(t => t.status !== 'completed');
  const todaySpa = spaBookings.filter(b => b.startAt?.slice(0, 10) === todayStr && b.status !== 'booking.cancelled');
  const arrivingToday = hotelBookings.filter(b => b.check_in_date === todayStr && b.booking_status !== 'cancelled');
  const conciergeRequests = [...pendingReservations, ...pendingEvents, ...packageInquiries];
  const activeCatering = cateringQuotes.filter(q => ['draft', 'sent', 'accepted', 'deposit_paid'].includes(q.status));

  const sections = [
    {
      title: 'Rooms & Stays',
      color: 'rgb(107,85,64)',
      tiles: [
        { icon: CalendarDays, label: 'Room Bookings', page: 'AdminBookings', badge: null },
        { icon: BedDouble, label: 'Rooms', page: 'AdminRooms', badge: null },
        { icon: FileText, label: 'Packages', page: 'AdminPackages', badge: null },
        { icon: Bell, label: 'Package Inquiries', page: 'AdminPackageInquiries', badge: null },
      ]
    },
    {
      title: 'Spa & Wellness',
      color: 'rgb(150,170,155)',
      tiles: [
        { icon: Sparkles, label: 'Spa Schedule', page: 'AdminSpaSchedule', badge: null },
        { icon: Sparkles, label: 'Treatments', page: 'AdminTreatments', badge: null },
      ]
    },
    {
      title: 'Restaurant',
      color: 'rgb(196,155,145)',
      tiles: [
        { icon: UtensilsCrossed, label: 'Restaurant', page: 'AdminRestaurant', badge: pendingReservations.length + pendingEvents.length || null },
        { icon: ChefHat, label: 'Catering', page: 'AdminCatering', badge: null },
      ]
    },
    {
      title: 'Housekeeping',
      color: 'rgb(120,140,160)',
      tiles: [
        { icon: Brush, label: 'Today\'s Tasks', page: 'AdminHousekeeping', badge: pendingHkTasks.length || null },
        { icon: AlertTriangle, label: 'Issues', page: 'AdminHousekeepingIssues', badge: hkIssues.length || null },
      ]
    },
    {
      title: 'Content & Settings',
      color: 'rgb(198,182,165)',
      tiles: [
        { icon: ClipboardList, label: 'Knowledge Base', page: 'AdminKnowledge', badge: null },
        { icon: Image, label: 'Image Library', page: 'AdminImages', badge: null },
        { icon: BookOpen, label: 'Media', page: 'AdminMedia', badge: null },
      ]
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {/* Header */}
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-[rgb(150,170,155)]" />
            <div>
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Admin</h1>
              <p className="text-xs text-[rgb(150,150,150)]">{format(today, 'EEEE, MMMM d')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('StaffDashboard')} className="text-sm text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)] flex items-center gap-1">
              <Users className="w-4 h-4" /> Staff
            </Link>
            <Link to={createPageUrl('Home')} className="text-sm text-[rgb(150,170,155)] hover:underline flex items-center gap-1">
              View Site <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => base44.auth.logout(createPageUrl('Home'))} className="text-sm text-[rgb(45,45,45)] hover:text-red-500 flex items-center gap-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Today at a glance */}
        <div className="mb-2">
          <p className="text-xs tracking-widest font-medium text-[rgb(150,150,150)] mb-3">TODAY AT A GLANCE</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {[
            {
              label: 'Arriving Today',
              value: arrivingToday.length,
              icon: BedSingle,
              color: 'rgb(107,85,64)',
              page: 'AdminBookings',
              alert: false,
            },
            {
              label: "Today's Spa",
              value: todaySpa.length,
              icon: Sparkles,
              color: 'rgb(150,170,155)',
              page: 'AdminSpaSchedule',
              alert: false,
            },
            {
              label: 'HK Needs',
              value: pendingHkTasks.length,
              icon: Brush,
              color: pendingHkTasks.length > 0 ? 'rgb(120,140,160)' : 'rgb(150,150,150)',
              page: 'AdminHousekeeping',
              alert: hkIssues.length > 0,
              alertLabel: `${hkIssues.length} open issue${hkIssues.length !== 1 ? 's' : ''}`,
            },
            {
              label: 'Concierge Requests',
              value: conciergeRequests.length,
              icon: MessageSquare,
              color: conciergeRequests.length > 0 ? 'rgb(196,100,80)' : 'rgb(150,150,150)',
              page: 'AdminRestaurant',
              alert: false,
            },
            {
              label: 'Active Catering',
              value: activeCatering.length,
              icon: ChefHat,
              color: 'rgb(196,155,145)',
              page: 'AdminCatering',
              alert: false,
            },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={createPageUrl(stat.page)} className="block bg-white border border-[rgb(235,225,213)] p-4 rounded-xl hover:shadow-md hover:border-[rgb(198,182,165)] transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  {stat.alert && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                      {stat.alertLabel}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-light" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-[rgb(150,150,150)] mt-1 leading-snug">{stat.label}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Section tiles */}
        {sections.map((section, si) => (
          <div key={section.title} className="mb-8">
            <h2 className="text-xs tracking-widest font-medium mb-3" style={{ color: section.color }}>{section.title.toUpperCase()}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {section.tiles.map((tile, ti) => (
                <motion.div key={tile.page} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (si * 4 + ti) * 0.03 }}>
                  <Link to={createPageUrl(tile.page)} className="block bg-white border border-[rgb(235,225,213)] rounded-xl p-4 hover:shadow-md hover:border-[rgb(198,182,165)] transition-all group relative">
                    {tile.badge > 0 && (
                      <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: section.color }}>
                        {tile.badge}
                      </span>
                    )}
                    <tile.icon className="w-6 h-6 mb-3 transition-colors" style={{ color: section.color }} />
                    <p className="text-sm font-medium text-[rgb(45,45,45)] group-hover:text-[rgb(107,85,64)] leading-tight">{tile.label}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}