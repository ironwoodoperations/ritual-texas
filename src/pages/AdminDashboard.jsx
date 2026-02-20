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
  CalendarDays, BookOpen, Brush, AlertTriangle
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
    queryFn: () => base44.entities.HkTask.filter({ taskDate: format(new Date(), 'yyyy-MM-dd') }),
  });

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const pendingReservations = restaurantReservations.filter(r => r.status === 'pending');
  const pendingEvents = eventLeads.filter(e => e.status === 'pending');
  const pendingHkTasks = hkTasks.filter(t => t.status !== 'completed');

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
        {/* Quick stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Today's Spa", value: '—', color: 'rgb(150,170,155)' },
            { label: 'Pending Requests', value: pendingReservations.length + pendingEvents.length, color: 'rgb(196,155,145)' },
            { label: 'HK Tasks Today', value: pendingHkTasks.length, color: 'rgb(120,140,160)' },
            { label: 'Open Issues', value: hkIssues.length, color: hkIssues.length > 0 ? 'rgb(200,80,80)' : 'rgb(150,170,155)' },
          ].map(stat => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-[rgb(235,225,213)] p-4 rounded-lg">
              <p className="text-2xl font-light" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-[rgb(150,150,150)] mt-1">{stat.label}</p>
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