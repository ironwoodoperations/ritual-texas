import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CalendarDays, CheckCircle, Clock, Coffee, Droplets, Phone, MessageCircle, Sparkles, Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SQUARE_SERVICES_URL = "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services";
const CONCIERGE_PHONE = "9038106695";
const CONCIERGE_SMS = "+19038106695";

export default function ItineraryPage() {
  const [mode, setMode] = useState('HOTEL');

  const [confirmationCode, setConfirmationCode] = useState('');
  const [contact, setContact] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservation, setReservation] = useState(null);
  const [cloudbedsDebug, setCloudbedsDebug] = useState(null);
  const [spaBookings, setSpaBookings] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('confirmationCode');
    const email = params.get('guestEmail');

    if (code && email) {
      setMode('HOTEL');
      setConfirmationCode(code);
      setContact(email);
      handleLookup({ nextMode: 'HOTEL', nextConfirmation: code, nextContact: email });
    } else {
      const savedCode = localStorage.getItem('ritual_confirmation');
      const savedEmail = localStorage.getItem('ritual_email');
      if (savedCode && savedEmail) {
        setMode('HOTEL');
        setConfirmationCode(savedCode);
        setContact(savedEmail);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeEmail = (v) => (v || '').trim().toLowerCase();
  const normalizeContact = (v) => (v || '').trim();

  const canSubmit = (m = mode, cCode = confirmationCode, c = contact) => {
    if (m === 'HOTEL') return Boolean(cCode.trim()) && Boolean(c.trim());
    return Boolean(c.trim());
  };

  const handleLookup = async (opts = {}) => {
    const nextMode = opts.nextMode ?? mode;
    const nextConfirmation = opts.nextConfirmation ?? confirmationCode;
    const nextContact = opts.nextContact ?? contact;

    if (!canSubmit(nextMode, nextConfirmation, nextContact)) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    setReservation(null);
    setSpaBookings([]);

    try {
      if (nextMode === 'HOTEL') {
        const response = await fetch(
          `/functions/cloudbedsReservationsLookup?confirmation=${encodeURIComponent(nextConfirmation)}&contact=${encodeURIComponent(nextContact)}`
        );
        const data = await response.json();

        if (data.success && data.reservation) {
          setReservation(data.reservation);
          setCloudbedsDebug(data.debug);

          localStorage.setItem('ritual_confirmation', nextConfirmation);
          localStorage.setItem('ritual_email', nextContact);

          // Automatically fetch spa bookings using same email/phone
          const emailGuess = normalizeEmail(nextContact);
          const looksLikeEmail = emailGuess.includes('@');

          const spaResp = await base44.functions.invoke('spaBookingsLookup', looksLikeEmail
            ? { email: emailGuess }
            : { phone: normalizeContact(nextContact) }
          );

          const spaData = spaResp.data;
          if (spaData?.success) {
            setSpaBookings(spaData.spaBookings || []);
          }
        } else {
          setError("We couldn't find that hotel reservation. Double-check your confirmation code and email/phone.");
        }
      }

      if (nextMode === 'SPA_ONLY') {
        const email = normalizeEmail(nextContact);
        const spaResp = await base44.functions.invoke('spaBookingsLookup', { email });
        const spaData = spaResp.data;

        if (spaData?.success && (spaData.spaBookings || []).length > 0) {
          setSpaBookings(spaData.spaBookings || []);
        } else {
          setError("We couldn't find spa bookings for that email.");
        }
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Itinerary lookup error:', err);
      setError("We're having trouble loading your itinerary. Please try again or contact concierge.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toDateSafe = (v) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDayHeader = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      confirmed: { label: 'Confirmed', color: 'bg-[#C4A55C]' },
      checked_in: { label: 'Checked In', color: 'bg-[#C57C5D]' },
      checked_out: { label: 'Checked Out', color: 'bg-[#3B4831]' },
      cancelled: { label: 'Cancelled', color: 'bg-gray-400' }
    };
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-500' };
    return (
      <span className={`${statusInfo.color} text-white px-3 py-1 rounded-full text-xs font-medium`}>
        {statusInfo.label}
      </span>
    );
  };

  const handlePrint = () => window.print();

  const handleEmailItinerary = async () => {
    let emailAddress = reservation?.guestEmail || contact;
    if (!emailAddress) { alert('No email on file'); return; }

    try {
      await base44.functions.invoke('sendItineraryEmail', {
        guestName: reservation?.guestName || 'Guest',
        guestEmail: emailAddress,
        confirmationCode: reservation?.confirmationCode || 'N/A',
        checkIn: reservation?.checkIn || null,
        checkOut: reservation?.checkOut || null,
        roomType: reservation?.roomType || null,
        totalAmount: reservation?.totalAmount || null,
        spaBookings: spaBookings,
        spaOnly: !reservation
      });
      alert('Itinerary emailed successfully!');
    } catch (err) {
      console.error('Email error:', err);
      alert('Failed to send email. Please try again.');
    }
  };

  return (
    <div style={{ backgroundColor: '#F0E8DD' }} className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* DEBUG BLOCK — hidden */}
        {false && cloudbedsDebug && (
          <div style={{padding: 12, margin: '12px 0', border: '1px solid #ccc', borderRadius: 12, backgroundColor: '#fff9e6'}}>
            <div style={{fontWeight: 700, fontSize: 14}}>Full Raw Cloudbeds Response</div>
            <div style={{fontSize: 11, marginTop: 6, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto'}}>
              {JSON.stringify(cloudbedsDebug.fullCloudbedsResponse, null, 2)}
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light mb-4" style={{ color: '#3B4831' }}>
            Your Stay Itinerary
          </h1>
          <p className="text-lg" style={{ color: '#1B1B1B' }}>
            Everything in one place — rooms, spa, and check-in instructions.
          </p>
        </div>

        {/* Lookup Card */}
        {!reservation && spaBookings.length === 0 && (
          <Card className="p-8 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
            <h2 className="text-2xl font-light mb-6" style={{ color: '#3B4831' }}>
              View Your Itinerary
            </h2>

            {/* Mode selector */}
            <div className="flex gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="itineraryMode"
                  checked={mode === 'HOTEL'}
                  onChange={() => { setMode('HOTEL'); setError(''); }}
                  className="w-4 h-4"
                />
                <span style={{ color: '#3B4831' }}>Staying at Hotel</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="itineraryMode"
                  checked={mode === 'SPA_ONLY'}
                  onChange={() => { setMode('SPA_ONLY'); setError(''); }}
                  className="w-4 h-4"
                />
                <span style={{ color: '#3B4831' }}>Spa Only</span>
              </label>
            </div>

            <div className="space-y-4">
              {mode === 'HOTEL' && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0E8DD' }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: '#3B4831' }}>
                    Hotel Reservation (spa bookings included automatically)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#1B1B1B' }}>
                        Confirmation Code
                      </label>
                      <Input
                        type="text"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                        placeholder="e.g. 9771730958512"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#1B1B1B' }}>
                        Email or Phone
                      </label>
                      <Input
                        type="text"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="email@example.com or 903-555-1212"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {mode === 'SPA_ONLY' && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0E8DD' }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: '#3B4831' }}>
                    Spa Appointments
                  </h3>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#1B1B1B' }}>
                      Email (used when booking spa)
                    </label>
                    <Input
                      type="email"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                onClick={() => handleLookup()}
                disabled={loading || !canSubmit()}
                className="w-full text-white font-medium py-6"
                style={{ backgroundColor: '#C57C5D', opacity: (!canSubmit() || loading) ? 0.6 : 1 }}
              >
                {loading ? 'Loading…' : 'View My Itinerary'}
              </Button>
            </div>
          </Card>
        )}

        {/* Hotel Reservation Card */}
        {reservation && (
          <Card className="p-8 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-light mb-2" style={{ color: '#3B4831' }}>
                  {reservation.guestName}
                </h2>
                <p className="text-sm font-medium mb-4" style={{ color: '#1B1B1B' }}>
                  Confirmation Code: <span style={{ fontFamily: 'monospace', color: '#3B4831' }}>{reservation.confirmationCode}</span>
                </p>
              </div>
              {getStatusBadge(reservation.status)}
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#1B1B1B' }}>Check-In</p>
                <p className="font-medium text-lg" style={{ color: '#3B4831' }}>{formatDate(reservation.checkIn)}</p>
                <p className="text-xs mt-1" style={{ color: '#1B1B1B' }}>3:00 PM</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#1B1B1B' }}>Check-Out</p>
                <p className="font-medium text-lg" style={{ color: '#3B4831' }}>{formatDate(reservation.checkOut)}</p>
                <p className="text-xs mt-1" style={{ color: '#1B1B1B' }}>11:00 AM</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#1B1B1B' }}>Room</p>
                <p className="font-medium text-lg" style={{ color: '#3B4831' }}>{reservation.roomNumber || 'Assigned at check-in'}</p>
                {reservation.roomType && <p className="text-xs mt-1" style={{ color: '#1B1B1B' }}>{reservation.roomType}</p>}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#1B1B1B' }}>Total Amount</p>
                <p className="font-medium text-lg" style={{ color: '#3B4831' }}>
                  ${(reservation.total ?? reservation.totalAmount)?.toFixed(2) || '—'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Spa Bookings */}
        {spaBookings.length > 0 && (
          <Card className="p-8 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
            <h2 className="text-2xl font-light mb-6" style={{ color: '#3B4831' }}>
              Your Spa Appointments
            </h2>
            <div className="space-y-4 mb-6">
              {spaBookings.map((booking) => (
                <div
                  key={booking.id || booking.squareBookingId}
                  className="p-4 rounded-lg border"
                  style={{ borderColor: '#F0E8DD', backgroundColor: 'white' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-lg" style={{ color: '#3B4831' }}>
                      {booking.serviceName || booking.service || 'Spa Service'}
                    </h3>
                    {booking.status && (
                      <span className="text-xs px-3 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#C4A55C', color: 'white' }}>
                        {String(booking.status).replace('booking.', '')}
                      </span>
                    )}
                  </div>
                  <div className="text-sm space-y-2" style={{ color: '#1B1B1B' }}>
                    {booking.startAt && (
                      <p>
                        <CalendarDays className="w-4 h-4 inline mr-2" style={{ color: '#3B4831' }} />
                        <strong>Date & Time:</strong> {new Date(booking.startAt).toLocaleString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    )}
                    {booking.durationMinutes && (
                      <p>
                        <Clock className="w-4 h-4 inline mr-2" style={{ color: '#3B4831' }} />
                        <strong>Duration:</strong> {booking.durationMinutes} minutes
                      </p>
                    )}
                    <p>
                      <Coffee className="w-4 h-4 inline mr-2" style={{ color: '#3B4831' }} />
                      <strong>Treatment Room:</strong> {booking.roomName || 'Ask Concierge'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => window.open(SQUARE_SERVICES_URL, '_blank')}
              className="w-full text-white font-medium py-6"
              style={{ backgroundColor: '#C57C5D' }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Book Another Treatment
            </Button>
          </Card>
        )}

        {/* Contact + Actions — shown when hotel reservation loaded */}
        {reservation && (
          <>
            <Card className="p-6 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => window.open(`sms:${CONCIERGE_SMS}?&body=Hi RITUAL Concierge — I need help with my reservation. Guest: ${reservation.guestName} | Confirmation: ${reservation.confirmationCode} | Check-in: ${formatDate(reservation.checkIn)}`, '_blank')}
                  variant="outline"
                  style={{ borderColor: '#3B4831', color: '#3B4831' }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Text Concierge
                </Button>
                <Button
                  onClick={() => window.open(`tel:${CONCIERGE_PHONE}`, '_blank')}
                  variant="outline"
                  style={{ borderColor: '#3B4831', color: '#3B4831' }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Hotel
                </Button>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-8 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
              <h2 className="text-2xl font-light mb-8" style={{ color: '#3B4831' }}>
                Your Stay Timeline
              </h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C4A55C' }}>
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-light mb-2" style={{ color: '#3B4831' }}>Check-In</h3>
                    <p className="text-sm mb-3" style={{ color: '#1B1B1B' }}>{formatDate(reservation.checkIn)} at 3:00 PM</p>
                    <p className="text-sm" style={{ color: '#1B1B1B' }}>
                      Check-in instructions will be sent by text the morning of arrival. If you need help now, tap Text Concierge.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C57C5D' }}>
                      <Coffee className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-light mb-2" style={{ color: '#3B4831' }}>During Your Stay</h3>
                    <ul className="space-y-2 text-sm" style={{ color: '#1B1B1B' }}>
                      <li className="flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#3B4831' }} />
                        <span>Breakfast: 8:00–10:00 AM daily</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Droplets className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#3B4831' }} />
                        <span>Sauna & rainshower available anytime during your stay</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#3B4831' }} />
                        <span>Spa treatments can be booked through Square (link above)</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B4831' }}>
                      <CalendarDays className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-light mb-2" style={{ color: '#3B4831' }}>Check-Out</h3>
                    <p className="text-sm mb-3" style={{ color: '#1B1B1B' }}>{formatDate(reservation.checkOut)} by 11:00 AM</p>
                    <p className="text-sm" style={{ color: '#1B1B1B' }}>
                      Thank you for restoring with us. We hope to welcome you back soon.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Spa CTA if no bookings */}
            {spaBookings.length === 0 && (
              <Card className="p-8 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
                <h2 className="text-2xl font-light mb-4" style={{ color: '#3B4831' }}>Spa & Wellness</h2>
                <p className="text-sm mb-6" style={{ color: '#1B1B1B' }}>
                  Book a treatment any time. Add-ons are confirmed instantly in Square.
                </p>
                <Button
                  onClick={() => window.open(SQUARE_SERVICES_URL, '_blank')}
                  className="w-full text-white font-medium py-6"
                  style={{ backgroundColor: '#C57C5D' }}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  View All Treatments
                </Button>
              </Card>
            )}

            {/* Save & Share */}
            <Card className="p-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
              <h2 className="text-2xl font-light mb-4" style={{ color: '#3B4831' }}>Save & Share</h2>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handlePrint} variant="outline" style={{ borderColor: '#3B4831', color: '#3B4831' }}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Itinerary
                </Button>
                <Button onClick={handleEmailItinerary} variant="outline" style={{ borderColor: '#3B4831', color: '#3B4831' }}>
                  Email This Itinerary
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* Spa-only Save & Share */}
        {!reservation && spaBookings.length > 0 && (
          <Card className="p-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
            <h2 className="text-2xl font-light mb-4" style={{ color: '#3B4831' }}>Save & Share</h2>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handlePrint} variant="outline" style={{ borderColor: '#3B4831', color: '#3B4831' }}>
                <Printer className="w-4 h-4 mr-2" />
                Print Itinerary
              </Button>
              <Button onClick={handleEmailItinerary} variant="outline" style={{ borderColor: '#3B4831', color: '#3B4831' }}>
                Email This Itinerary
              </Button>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}