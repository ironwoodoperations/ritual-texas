import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, addDays } from 'date-fns';
import { Check, Calendar, MapPin, Clock, Leaf, ArrowRight, Download, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookingConfirmation() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => base44.entities.Booking.filter({ id: bookingId }),
    select: (data) => data?.[0],
    enabled: !!bookingId,
  });

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
        // Arrival day
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
        // Regular days
        dayItems.push({
          time: '8:00 - 10:00 AM',
          activity: 'Light Breakfast Window',
          description: 'Available in the garden room'
        });
        
        // Add treatments if scheduled for this day
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
      
      // Departure day
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

  if (isLoading) {
    return (
      <div className="min-h-screen py-16 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen py-16 px-6 text-center">
        <h1 className="text-2xl text-[rgb(107,85,64)]">Booking not found</h1>
        <Link to={createPageUrl('Home')} className="mt-4 text-[rgb(150,170,155)]">Return home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[rgb(150,170,155)] flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-2">
            Your Sanctuary Awaits
          </h1>
          <p className="text-[rgb(45,45,45)] font-light">
            Confirmation #{booking.confirmation_code}
          </p>
        </motion.div>

        {/* Booking Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[rgb(235,225,213)] p-8 mb-10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Leaf className="w-5 h-5 text-[rgb(150,170,155)]" />
            <span className="text-xl font-light text-[rgb(107,85,64)]">Your Stay</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[rgb(150,170,155)] mt-0.5" />
              <div>
                <p className="text-[rgb(107,85,64)]">{nights} {nights === 1 ? 'Night' : 'Nights'}</p>
                <p className="text-sm text-[rgb(45,45,45)]">
                  {format(new Date(booking.check_in_date), 'MMMM d')} - {format(new Date(booking.check_out_date), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[rgb(150,170,155)] mt-0.5" />
              <div>
                <p className="text-[rgb(107,85,64)]">{booking.room_name}</p>
                <p className="text-sm text-[rgb(45,45,45)]">{booking.num_guests} {booking.num_guests === 1 ? 'guest' : 'guests'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[rgb(150,170,155)] mt-0.5" />
              <div>
                <p className="text-[rgb(107,85,64)]">Arrival Window</p>
                <p className="text-sm text-[rgb(45,45,45)]">
                  {booking.arrival_window === 'early_afternoon' ? '3:00 - 4:00 PM' :
                   booking.arrival_window === 'late_afternoon' ? '4:00 - 6:00 PM' : 'After 6:00 PM'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[rgb(150,170,155)] mt-0.5" />
              <div>
                <p className="text-[rgb(107,85,64)]">Confirmation sent to</p>
                <p className="text-sm text-[rgb(45,45,45)]">{booking.guest_email}</p>
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

          <div className="mt-6 pt-6 border-t border-[rgb(235,225,213)] flex justify-between items-center">
            <span className="text-[rgb(107,85,64)]">Total</span>
            <span className="text-2xl font-light text-[rgb(107,85,64)]">${booking.grand_total}</span>
          </div>
        </motion.div>

        {/* Itinerary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="text-2xl font-extralight text-[rgb(107,85,64)] mb-6 text-center">
            Your Itinerary
          </h2>

          <div className="space-y-8">
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

        {/* What's Next */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[rgb(235,225,213)] p-8 text-center"
        >
          <h3 className="text-xl font-light text-[rgb(107,85,64)] mb-4">What Happens Next</h3>
          <div className="space-y-3 text-[rgb(45,45,45)] font-light">
            <p>✓ Confirmation email sent to {booking.guest_email}</p>
            <p>✓ Check-in instructions sent 24 hours before arrival</p>
            <p>✓ Daily itinerary emailed each morning at 7 AM</p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={createPageUrl('MyBooking') + `?code=${booking.confirmation_code}`}
              className="px-6 py-3 border border-[rgb(107,85,64)] text-[rgb(107,85,64)] text-sm tracking-widest hover:bg-[rgb(107,85,64)] hover:text-white transition-all"
            >
              VIEW MY ITINERARY
            </Link>
            <Link
              to={createPageUrl('AskRitual')}
              className="px-6 py-3 bg-[rgb(150,170,155)] text-white text-sm tracking-widest hover:bg-[rgb(130,150,135)] transition-all flex items-center justify-center gap-2"
            >
              ASK RITUAL A QUESTION
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}