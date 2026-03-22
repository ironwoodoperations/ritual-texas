import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, addDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Leaf, Search, ArrowRight, User, Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyBooking() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialCode = urlParams.get('code') || '';
  
  const [searchCode, setSearchCode] = useState(initialCode);
  const [confirmedCode, setConfirmedCode] = useState(initialCode);

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['my-booking', confirmedCode],
    queryFn: () => base44.entities.Booking.filter({ confirmation_code: confirmedCode }),
    select: (data) => data?.[0],
    enabled: !!confirmedCode,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setConfirmedCode(searchCode.toUpperCase());
  };

  const nights = booking?.check_in_date && booking?.check_out_date
    ? differenceInDays(new Date(booking.check_out_date), new Date(booking.check_in_date))
    : 0;

  const generateItinerary = () => {
    if (!booking) return [];
    
    const itinerary = [];
    const checkIn = new Date(booking.check_in_date);
    
    for (let day = 0; day < nights; day++) {
      const currentDate = addDays(checkIn, day);
      const dayItems = [];
      
      if (day === 0) {
        dayItems.push({
          time: booking.arrival_window === 'early_afternoon' ? '3:00 PM' : 
                booking.arrival_window === 'late_afternoon' ? '4:00 PM' : '6:00 PM',
          activity: 'Arrival & Self Check-in',
          description: 'Your room key and welcome materials await at the front entrance'
        });
        dayItems.push({
          time: 'Evening',
          activity: 'Sauna & Soak',
          description: 'Self-guided. Towels and robes in your room.'
        });
        dayItems.push({
          time: '7:30 PM',
          activity: 'Quiet Hours Begin',
          description: 'Property-wide tranquility for deep rest'
        });
      } else {
        dayItems.push({
          time: '8:00 - 10:00 AM',
          activity: 'Light Breakfast Window',
          description: 'Available in the garden room'
        });
        
        const dayTreatments = booking.treatments?.filter(t => t.preferred_day === day + 1) || [];
        dayTreatments.forEach(t => {
          dayItems.push({
            time: t.scheduled_datetime || 'To be scheduled',
            activity: t.treatment_name,
            description: 'Your therapist will greet you in the spa lounge'
          });
        });

        if (dayTreatments.length === 0 && day < nights - 1) {
          dayItems.push({
            time: 'Afternoon',
            activity: 'Rest & Reflection',
            description: 'Property grounds, library, or private garden available'
          });
        }
        
        dayItems.push({
          time: 'Evening',
          activity: 'Optional Ritual Soak',
          description: 'Thermal waters open until 9 PM'
        });
      }
      
      if (day === nights - 1) {
        dayItems.push({
          time: '11:00 AM',
          activity: 'Check-out',
          description: 'Simply leave your key in the room. Safe travels.'
        });
      }
      
      itinerary.push({
        date: currentDate,
        dayNumber: day + 1,
        items: dayItems
      });
    }
    
    return itinerary;
  };

  const itinerary = generateItinerary();

  return (
    <div className="min-h-screen py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-4">
            My Itinerary
          </h1>
          <p className="text-[rgb(45,45,45)] font-light">
            View your stay details and daily schedule
          </p>
        </motion.div>

        {/* Search Form */}
        {!booking && (
          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSearch}
            className="max-w-md mx-auto mb-12"
          >
            <label className="text-sm text-[rgb(45,45,45)] block mb-3 text-center">
              Enter your confirmation code
            </label>
            <div className="flex gap-3">
              <Input
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="RTL..."
                className="border-[rgb(235,225,213)] text-center tracking-widest uppercase"
              />
              <Button 
                type="submit"
                className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </motion.form>
        )}

        {isLoading && confirmedCode && (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {confirmedCode && !isLoading && !booking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-10 text-center max-w-md mx-auto"
          >
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="text-2xl font-light text-[rgb(107,85,64)] mb-2">No booking found</h2>
            <p className="text-[rgb(45,45,45)] mb-6">
              We couldn't find a reservation for <span className="font-medium">{confirmedCode}</span>.
            </p>
            <p className="text-sm text-[rgb(150,150,150)] mb-8">
              Double-check the confirmation code from your booking email, or contact us directly.
            </p>
            <div className="flex flex-col gap-3 mb-6">
              <a 
                href="tel:9038106695"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[rgb(150,170,155)] text-white text-sm hover:bg-[rgb(130,150,135)] transition-colors"
              >
                📞 Call (903) 810-6695
              </a>
              <a 
                href="mailto:hotel.ritual.texas@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-[rgb(235,225,213)] text-[rgb(107,85,64)] text-sm hover:bg-[rgb(248,246,242)] transition-colors"
              >
                ✉ Email Us
              </a>
            </div>
            <button 
              onClick={() => setConfirmedCode('')}
              className="text-sm text-[rgb(150,170,155)] hover:text-[rgb(107,85,64)] transition-colors"
            >
              ← Try a different code
            </button>
          </motion.div>
        )}

        {booking && (
          <>
            {/* Booking Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[rgb(235,225,213)] p-8 mb-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-[rgb(150,170,155)]" />
                  <span className="text-xl font-light text-[rgb(107,85,64)]">Your Stay</span>
                </div>
                <span className="text-sm text-[rgb(150,170,155)] tracking-widest">
                  {booking.confirmation_code}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[rgb(150,170,155)] mt-0.5" />
                  <div>
                    <p className="text-[rgb(107,85,64)]">{booking.guest_name}</p>
                    <p className="text-sm text-[rgb(45,45,45)]">{booking.num_guests} {booking.num_guests === 1 ? 'guest' : 'guests'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[rgb(150,170,155)] mt-0.5" />
                  <div>
                    <p className="text-[rgb(107,85,64)]">{nights} {nights === 1 ? 'Night' : 'Nights'}</p>
                    <p className="text-sm text-[rgb(45,45,45)]">
                      {format(new Date(booking.check_in_date), 'MMM d')} - {format(new Date(booking.check_out_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[rgb(150,170,155)] mt-0.5" />
                  <div>
                    <p className="text-[rgb(107,85,64)]">{booking.room_name}</p>
                    <p className="text-sm text-[rgb(45,45,45)]">Hotel RITUAL, Jacksonville TX</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[rgb(150,170,155)] mt-0.5" />
                  <div>
                    <p className="text-[rgb(107,85,64)]">Check-in</p>
                    <p className="text-sm text-[rgb(45,45,45)]">
                      {booking.arrival_window === 'early_afternoon' ? '3:00 - 4:00 PM' :
                       booking.arrival_window === 'late_afternoon' ? '4:00 - 6:00 PM' : 'After 6:00 PM'}
                    </p>
                  </div>
                </div>
              </div>

              {(booking.package_name || booking.treatments?.length > 0) && (
                <div className="mt-6 pt-6 border-t border-[rgb(235,225,213)]">
                  <p className="text-sm tracking-widest text-[rgb(150,170,155)] mb-3">SPA & WELLNESS</p>
                  {booking.package_name && (
                    <p className="text-[rgb(107,85,64)] mb-2">{booking.package_name}</p>
                  )}
                  {booking.treatments?.map((t, i) => (
                    <p key={i} className="text-sm text-[rgb(45,45,45)]">• {t.treatment_name}</p>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Itinerary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-10"
            >
              <h2 className="text-2xl font-extralight text-[rgb(107,85,64)] mb-6 text-center">
                Day by Day
              </h2>

              <div className="space-y-6">
                {itinerary.map((day, idx) => (
                  <div key={idx} className="bg-white border border-[rgb(235,225,213)] p-6">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[rgb(235,225,213)]">
                      <div className="w-10 h-10 rounded-full bg-[rgb(150,170,155)] text-white flex items-center justify-center text-sm">
                        {day.dayNumber}
                      </div>
                      <div>
                        <p className="text-[rgb(107,85,64)]">Day {day.dayNumber}</p>
                        <p className="text-sm text-[rgb(45,45,45)]">{format(day.date, 'EEEE, MMMM d')}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {day.items.map((item, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-28 flex-shrink-0 text-sm text-[rgb(150,170,155)]">
                            {item.time}
                          </div>
                          <div>
                            <p className="text-[rgb(107,85,64)]">{item.activity}</p>
                            <p className="text-sm text-[rgb(45,45,45)]">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Questions */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-[rgb(45,45,45)] font-light mb-4">Have questions about your stay?</p>
              <Link
                to={createPageUrl('AskRitual')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[rgb(150,170,155)] text-white text-sm tracking-widest hover:bg-[rgb(130,150,135)] transition-all"
              >
                ASK RITUAL
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}