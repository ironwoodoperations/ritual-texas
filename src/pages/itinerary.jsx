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
  const [hotelChecked, setHotelChecked] = useState(true);
  const [spaChecked, setSpaChecked] = useState(false);
  
  const [confirmationCode, setConfirmationCode] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [spaEmail, setSpaEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservation, setReservation] = useState(null);
  const [spaBookings, setSpaBookings] = useState([]);

  useEffect(() => {
    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const code = params.get('confirmationCode');
    const email = params.get('guestEmail');

    if (code && email) {
      setConfirmationCode(code);
      setGuestEmail(email);
      handleLookup(code, email);
    } else {
      // Try localStorage
      const savedCode = localStorage.getItem('ritual_confirmation');
      const savedEmail = localStorage.getItem('ritual_email');
      if (savedCode && savedEmail) {
        setConfirmationCode(savedCode);
        setGuestEmail(savedEmail);
      }
    }
  }, []);

  const canSubmit = () => {
    if (!hotelChecked && !spaChecked) return false;
    if (hotelChecked && (!confirmationCode.trim() || !guestEmail.trim())) return false;
    if (spaChecked && !spaEmail.trim()) return false;
    return true;
  };

  const handleLookup = async () => {
    if (!canSubmit()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    setReservation(null);
    setSpaBookings([]);

    try {
      // Fetch hotel reservation if checked
      if (hotelChecked) {
        const response = await fetch(
          `/functions/cloudbedsReservationsLookup?confirmation=${encodeURIComponent(confirmationCode)}&contact=${encodeURIComponent(guestEmail)}`
        );
        const data = await response.json();

        if (data.success && data.reservation) {
          setReservation(data.reservation);
          localStorage.setItem('ritual_confirmation', confirmationCode);
          localStorage.setItem('ritual_email', guestEmail);
        } else {
          setError('We couldn\'t find that hotel reservation. Double-check your confirmation code and email.');
        }
      }

      // Fetch spa bookings if checked
      if (spaChecked) {
        const response = await fetch(
          `/functions/spaBookingsLookup?email=${encodeURIComponent(spaEmail.trim().toLowerCase())}`
        );
        const data = await response.json();

        if (data.success) {
          setSpaBookings(data.spaBookings || []);
        } else {
          if (!hotelChecked) {
            setError('We couldn\'t find spa bookings for that email.');
          }
        }
      }
    } catch (err) {
      setError('We\'re having trouble loading your itinerary. Please try again or text concierge.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ backgroundColor: '#F0E8DD' }} className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
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
            
            {/* Checkboxes */}
            <div className="flex gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hotelChecked}
                  onChange={(e) => setHotelChecked(e.target.checked)}
                  className="w-4 h-4"
                />
                <span style={{ color: '#3B4831' }}>Hotel Stay</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spaChecked}
                  onChange={(e) => setSpaChecked(e.target.checked)}
                  className="w-4 h-4"
                />
                <span style={{ color: '#3B4831' }}>Spa Bookings</span>
              </label>
            </div>

            <div className="space-y-4">
              {/* Hotel Fields */}
              {hotelChecked && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0E8DD' }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: '#3B4831' }}>
                    Hotel Reservation
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
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="email@example.com or 903-555-1212"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Spa Fields */}
              {spaChecked && (
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
                      value={spaEmail}
                      onChange={(e) => setSpaEmail(e.target.value)}
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
                onClick={handleLookup}
                disabled={loading || !canSubmit()}
                className="w-full text-white font-medium py-6"
                style={{ backgroundColor: '#C57C5D', opacity: (!canSubmit() || loading) ? 0.6 : 1 }}
              >
                {loading ? 'Loading…' : 'View My Itinerary'}
              </Button>
            </div>
          </Card>
        )}

        {/* Reservation Summary */}
        {reservation && (
          <>
            <Card className="p-8 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-light mb-2" style={{ color: '#3B4831' }}>
                    {reservation.guestName}
                  </h2>
                  <p className="text-sm" style={{ color: '#1B1B1B' }}>
                    Confirmation: {reservation.confirmationCode}
                  </p>
                </div>
                {getStatusBadge(reservation.status)}
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5" style={{ color: '#3B4831' }} />
                  <div>
                    <p className="text-xs" style={{ color: '#1B1B1B' }}>Check-In</p>
                    <p className="font-medium" style={{ color: '#3B4831' }}>
                      {formatDate(reservation.checkIn)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5" style={{ color: '#3B4831' }} />
                  <div>
                    <p className="text-xs" style={{ color: '#1B1B1B' }}>Check-Out</p>
                    <p className="font-medium" style={{ color: '#3B4831' }}>
                      {formatDate(reservation.checkOut)}
                    </p>
                  </div>
                </div>
              </div>

              {reservation.roomType && (
                <div className="mb-6 pb-6 border-b" style={{ borderColor: '#F0E8DD' }}>
                  <p className="text-sm" style={{ color: '#1B1B1B' }}>Room Type</p>
                  <p className="font-medium" style={{ color: '#3B4831' }}>{reservation.roomType}</p>
                </div>
              )}

              {reservation.totalAmount && (
                <div className="mb-6">
                  <p className="text-sm" style={{ color: '#1B1B1B' }}>Total Amount</p>
                  <p className="text-2xl font-light" style={{ color: '#3B4831' }}>
                    ${reservation.totalAmount.toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => window.open(SQUARE_SERVICES_URL, '_blank')}
                  className="text-white font-medium"
                  style={{ backgroundColor: '#C57C5D' }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Book Another Treatment
                </Button>
                <Button
                  onClick={() => window.open(`sms:${CONCIERGE_SMS}?&body=Hi RITUAL Concierge — I need help with my itinerary. My confirmation is ${reservation.confirmationCode}`, '_blank')}
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
                {/* Check-In */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C4A55C' }}>
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-light mb-2" style={{ color: '#3B4831' }}>
                      Check-In
                    </h3>
                    <p className="text-sm mb-3" style={{ color: '#1B1B1B' }}>
                      {formatDate(reservation.checkIn)} at 3:00 PM
                    </p>
                    <p className="text-sm" style={{ color: '#1B1B1B' }}>
                      Check-in instructions will be sent by text the morning of arrival. If you need help now, tap Text Concierge.
                    </p>
                  </div>
                </div>

                {/* During Stay */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C57C5D' }}>
                      <Coffee className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-light mb-2" style={{ color: '#3B4831' }}>
                      During Your Stay
                    </h3>
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

                {/* Check-Out */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B4831' }}>
                      <CalendarDays className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-light mb-2" style={{ color: '#3B4831' }}>
                      Check-Out
                    </h3>
                    <p className="text-sm mb-3" style={{ color: '#1B1B1B' }}>
                      {formatDate(reservation.checkOut)} by 11:00 AM
                    </p>
                    <p className="text-sm" style={{ color: '#1B1B1B' }}>
                      Thank you for restoring with us. We hope to welcome you back soon.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Spa Bookings Section */}
            {spaBookings.length > 0 && (
              <Card className="p-8 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
                <h2 className="text-2xl font-light mb-4" style={{ color: '#3B4831' }}>
                  Your Spa Appointments
                </h2>
                <div className="space-y-4 mb-6">
                  {spaBookings.map((booking) => (
                    <div
                      key={booking.id || booking.squareBookingId}
                      className="p-4 rounded-lg border"
                      style={{ borderColor: '#F0E8DD', backgroundColor: 'white' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium" style={{ color: '#3B4831' }}>
                          {booking.service || 'Spa Service'}
                        </h3>
                        {booking.status && (
                          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#C4A55C', color: 'white' }}>
                            {booking.status.replace('booking.', '')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm space-y-1" style={{ color: '#1B1B1B' }}>
                        {booking.startAt && (
                          <p>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(booking.startAt).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                        {booking.durationMinutes && (
                          <p>{booking.durationMinutes} minutes</p>
                        )}
                        {booking.staff && (
                          <p className="text-xs opacity-70">Staff ID: {booking.staff}</p>
                        )}
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

            {/* Spa CTA (if no bookings yet) */}
            {spaBookings.length === 0 && (
              <Card className="p-8 mb-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
                <h2 className="text-2xl font-light mb-4" style={{ color: '#3B4831' }}>
                  Spa & Wellness
                </h2>
                <p className="text-sm mb-6" style={{ color: '#1B1B1B' }}>
                  {spaChecked ? 'No spa appointments found for that email yet.' : 'Book a treatment any time. Add-ons are confirmed instantly in Square.'}
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

            {/* Actions */}
            <Card className="p-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
              <h2 className="text-2xl font-light mb-4" style={{ color: '#3B4831' }}>
                Save & Share
              </h2>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  style={{ borderColor: '#3B4831', color: '#3B4831' }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Itinerary
                </Button>
                <Button
                  variant="outline"
                  style={{ borderColor: '#3B4831', color: '#3B4831' }}
                  disabled
                >
                  Email Me This Itinerary
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}