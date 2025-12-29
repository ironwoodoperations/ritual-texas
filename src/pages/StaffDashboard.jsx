import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  Users, Home, Sparkles, Clock, Check, 
  ChevronLeft, ChevronRight, Leaf, LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StaffDashboard() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('StaffDashboard'));
      }
    };
    loadUser();
  }, []);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['staff-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 100),
  });

  const arrivals = bookings?.filter(b => b.check_in_date === dateStr && b.booking_status !== 'cancelled') || [];
  const departures = bookings?.filter(b => b.check_out_date === dateStr && b.booking_status !== 'cancelled') || [];
  
  const treatments = bookings?.flatMap(b => {
    const bookingTreatments = b.treatments || [];
    return bookingTreatments.map(t => ({
      ...t,
      guest_name: b.guest_name,
      room_name: b.room_name
    }));
  }) || [];

  const handlePrevDay = () => {
    setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 1)));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 1)));
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-[rgb(150,170,155)]" />
            <div>
              <h1 className="text-lg font-light text-[rgb(107,85,64)]">Staff Dashboard</h1>
              <p className="text-xs text-[rgb(45,45,45)]">Hotel RITUAL</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Link 
                to={createPageUrl('AdminDashboard')}
                className="text-sm text-[rgb(150,170,155)] hover:underline"
              >
                Admin View
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)]"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Date Selector */}
        <div className="flex items-center justify-between mb-8 bg-white p-4 border border-[rgb(235,225,213)]">
          <button onClick={handlePrevDay} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-2xl font-light text-[rgb(107,85,64)]">
              {format(selectedDate, 'EEEE')}
            </p>
            <p className="text-sm text-[rgb(45,45,45)]">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <button onClick={handleNextDay} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 border border-[rgb(235,225,213)] text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-[rgb(150,170,155)]" />
            <p className="text-2xl font-light text-[rgb(107,85,64)]">{arrivals.length}</p>
            <p className="text-xs text-[rgb(45,45,45)]">Arrivals</p>
          </div>
          <div className="bg-white p-4 border border-[rgb(235,225,213)] text-center">
            <Home className="w-6 h-6 mx-auto mb-2 text-[rgb(196,155,145)]" />
            <p className="text-2xl font-light text-[rgb(107,85,64)]">{departures.length}</p>
            <p className="text-xs text-[rgb(45,45,45)]">Departures</p>
          </div>
          <div className="bg-white p-4 border border-[rgb(235,225,213)] text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-[rgb(198,182,165)]" />
            <p className="text-2xl font-light text-[rgb(107,85,64)]">{treatments.length}</p>
            <p className="text-xs text-[rgb(45,45,45)]">Treatments</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="arrivals" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full bg-[rgb(235,225,213)]">
            <TabsTrigger value="arrivals" className="data-[state=active]:bg-white">
              Arrivals ({arrivals.length})
            </TabsTrigger>
            <TabsTrigger value="cleaning" className="data-[state=active]:bg-white">
              Cleaning ({departures.length})
            </TabsTrigger>
            <TabsTrigger value="treatments" className="data-[state=active]:bg-white">
              Treatments ({treatments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="arrivals">
            <div className="bg-white border border-[rgb(235,225,213)]">
              {arrivals.length === 0 ? (
                <p className="p-8 text-center text-[rgb(45,45,45)]">No arrivals on this day</p>
              ) : (
                <div className="divide-y divide-[rgb(235,225,213)]">
                  {arrivals.map(booking => (
                    <motion.div 
                      key={booking.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[rgb(107,85,64)]">{booking.guest_name}</p>
                          <p className="text-sm text-[rgb(45,45,45)]">{booking.room_name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-4 h-4 text-[rgb(150,170,155)]" />
                            <span className="text-sm text-[rgb(45,45,45)]">
                              {booking.arrival_window === 'early_afternoon' ? '3:00 - 4:00 PM' :
                               booking.arrival_window === 'late_afternoon' ? '4:00 - 6:00 PM' : 'After 6:00 PM'}
                            </span>
                          </div>
                          {booking.special_requests && (
                            <p className="text-sm text-[rgb(196,155,145)] mt-2 italic">
                              Note: {booking.special_requests}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-[rgb(235,225,213)] px-2 py-1">
                            {booking.confirmation_code}
                          </span>
                          <p className="text-sm text-[rgb(45,45,45)] mt-2">
                            {booking.num_guests} {booking.num_guests === 1 ? 'guest' : 'guests'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cleaning">
            <div className="bg-white border border-[rgb(235,225,213)]">
              {departures.length === 0 ? (
                <p className="p-8 text-center text-[rgb(45,45,45)]">No rooms to clean on this day</p>
              ) : (
                <div className="divide-y divide-[rgb(235,225,213)]">
                  {departures.map(booking => (
                    <motion.div 
                      key={booking.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-[rgb(107,85,64)]">{booking.room_name}</p>
                        <p className="text-sm text-[rgb(45,45,45)]">Checkout: 11:00 AM</p>
                        <p className="text-xs text-[rgb(45,45,45)] mt-1">Guest: {booking.guest_name}</p>
                      </div>
                      <Badge className="bg-[rgb(196,155,145)] text-white">
                        Needs Cleaning
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="treatments">
            <div className="bg-white border border-[rgb(235,225,213)]">
              {treatments.length === 0 ? (
                <p className="p-8 text-center text-[rgb(45,45,45)]">No treatments scheduled for this day</p>
              ) : (
                <div className="divide-y divide-[rgb(235,225,213)]">
                  {treatments.map((treatment, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[rgb(107,85,64)]">{treatment.treatment_name}</p>
                          <p className="text-sm text-[rgb(45,45,45)]">{treatment.guest_name}</p>
                          <p className="text-xs text-[rgb(45,45,45)]">{treatment.room_name}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-[rgb(150,170,155)]">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{treatment.scheduled_datetime || 'Time TBD'}</span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={treatment.status === 'completed' ? 'text-green-600 border-green-600' : 'text-[rgb(198,182,165)] border-[rgb(198,182,165)]'}
                          >
                            {treatment.status || 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}