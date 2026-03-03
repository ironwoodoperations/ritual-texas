import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Leaf, Printer, RefreshCw, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '—';
  return format(new Date(d + 'T12:00:00'), 'MMMM d, yyyy');
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function GuestItinerary({ reservation, spaBookings }) {
  return (
    <div className="itinerary-card bg-white border border-[rgb(235,225,213)] rounded-2xl p-8 mb-8 print:mb-0 print:border-0 print:rounded-none print:p-6 print:break-after-page">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-[rgb(235,225,213)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-5 h-5 text-[rgb(150,170,155)]" />
            <span className="text-lg tracking-widest font-light text-[rgb(107,85,64)]">RITUAL</span>
          </div>
          <h2 className="text-2xl font-light text-[rgb(107,85,64)] mt-2">{reservation.guestName}</h2>
          <p className="text-sm text-[rgb(150,150,150)] font-mono mt-0.5">#{reservation.reservationID}</p>
        </div>
        <div className="text-right text-sm text-[rgb(107,85,64)]">
          <p className="font-medium">Prepared {format(new Date(), 'MMMM d, yyyy')}</p>
          <p className="text-xs text-[rgb(150,150,150)] mt-1">Welcome to Hotel RITUAL</p>
        </div>
      </div>

      {/* Stay Details */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-1">Check-In</p>
          <p className="text-[rgb(107,85,64)] font-medium">{fmtDate(reservation.checkIn)}</p>
          <p className="text-xs text-[rgb(150,150,150)] mt-0.5">3:00 PM</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-1">Check-Out</p>
          <p className="text-[rgb(107,85,64)] font-medium">{fmtDate(reservation.checkOut)}</p>
          <p className="text-xs text-[rgb(150,150,150)] mt-0.5">11:00 AM</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-1">Room</p>
          <p className="text-[rgb(107,85,64)] font-medium">{reservation.roomName || '—'}</p>
          {reservation.roomNumber && (
            <p className="text-xs text-[rgb(150,150,150)] mt-0.5">Room {reservation.roomNumber}</p>
          )}
        </div>
      </div>

      {/* During Your Stay */}
      <div className="mb-6">
        <h3 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">During Your Stay</h3>
        <div className="bg-[rgb(248,246,242)] rounded-xl p-4 text-sm text-[rgb(45,45,45)] space-y-1">
          <p>• Breakfast: 8:00–10:00 AM daily</p>
          <p>• Sauna & rainshower available anytime</p>
          <p>• Concierge: (903) 810-6695</p>
        </div>
      </div>

      {/* Spa Appointments */}
      {spaBookings.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3 flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Spa Appointments
          </h3>
          <div className="space-y-2">
            {spaBookings.map((b, i) => (
              <div key={i} className="flex items-start justify-between bg-[rgb(248,246,242)] rounded-xl p-4">
                <div>
                  <p className="font-medium text-[rgb(107,85,64)] text-sm">{b.serviceName || 'Spa Treatment'}</p>
                  {b.staffName && <p className="text-xs text-[rgb(150,150,150)] mt-0.5">Provider: {b.staffName}</p>}
                </div>
                <div className="text-right text-sm">
                  <p className="text-[rgb(45,45,45)]">
                    {b.startAt ? format(new Date(b.startAt), 'MMM d') : '—'} · {b.startAt ? fmtTime(b.startAt) : '—'}
                  </p>
                  {b.durationMinutes && <p className="text-xs text-[rgb(150,150,150)] mt-0.5">{b.durationMinutes} min</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3 flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Spa & Wellness
          </h3>
          <div className="bg-[rgb(248,246,242)] rounded-xl p-4 text-sm text-[rgb(150,150,150)]">
            No spa appointments booked — book at ritualtexas.simplybook.me
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-[rgb(235,225,213)] text-center text-xs text-[rgb(150,150,150)]">
        540 El Paso Street · Jacksonville, Texas 75766 · (903) 810-6695 · Rest. Restore. Return.
      </div>
    </div>
  );
}

export default function AdminTodayItineraries() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') window.location.href = createPageUrl('Home');
    }).catch(() => base44.auth.redirectToLogin(createPageUrl('AdminTodayItineraries')));
  }, []);

  const today = todayStr();

  const { data: cloudbedsData, isLoading: cbLoading, refetch } = useQuery({
    queryKey: ['cloudbeds-upcoming-itineraries'],
    queryFn: async () => {
      const res = await base44.functions.invoke('cloudbedsUpcomingReservations', {});
      return res.data;
    },
    enabled: !!user,
  });

  const { data: allSpaBookings = [], isLoading: spaLoading } = useQuery({
    queryKey: ['spa-bookings-today-itineraries'],
    queryFn: () => base44.entities.SpaBooking.list('-startAt', 500),
    enabled: !!user,
  });

  // Filter to today's arrivals
  const todayArrivals = (cloudbedsData?.reservations || []).filter(r => r.checkIn === today);

  // For each arrival, find their spa bookings by email
  const arrivalsWithSpa = todayArrivals.map(r => {
    const guestEmail = (r.guestEmail || '').toLowerCase().trim();
    const spa = allSpaBookings.filter(b =>
      b.status !== 'booking.cancelled' &&
      (b.email || '').toLowerCase().trim() === guestEmail &&
      b.startAt >= r.checkIn &&
      b.startAt <= (r.checkOut + 'T23:59:59')
    );
    return { reservation: r, spaBookings: spa };
  });

  const isLoading = cbLoading || spaLoading;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .itinerary-card { box-shadow: none; }
        }
      `}</style>

      {/* Header */}
      <header className="no-print bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Today's Itineraries</h1>
              <p className="text-sm text-[rgb(150,150,150)]">{format(new Date(), 'EEEE, MMMM d, yyyy')} · {todayArrivals.length} arriving today</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-[rgb(235,225,213)] rounded-lg hover:bg-[rgb(235,225,213)] text-[rgb(107,85,64)]"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[rgb(107,85,64)] text-white rounded-lg hover:bg-[rgb(85,65,45)]"
            >
              <Printer className="w-4 h-4" /> Print All
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
          </div>
        ) : !cloudbedsData?.success ? (
          <div className="text-center py-16 text-[rgb(107,85,64)]">
            {cloudbedsData?.error || 'Could not load Cloudbeds reservations.'}
          </div>
        ) : arrivalsWithSpa.length === 0 ? (
          <div className="text-center py-24 text-[rgb(150,150,150)]">
            <p className="text-lg font-light">No arrivals today.</p>
          </div>
        ) : (
          arrivalsWithSpa.map(({ reservation, spaBookings }) => (
            <GuestItinerary
              key={reservation.reservationID}
              reservation={reservation}
              spaBookings={spaBookings}
            />
          ))
        )}
      </main>
    </div>
  );
}