import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const DESIGN_TOKENS = {
  bg: '#F0E8DD',
  cardBg: '#FCF9F4',
  cardBorderRadius: '18px',
  cardShadow: '0 10px 30px rgba(0,0,0,.08)',
  cardBorder: '1px solid rgba(59,72,49,.10)',
  primaryGreen: '#3B4831',
  accentTerracotta: '#C57C5D',
  mutedBrown: '#8B7355',
  lightBorder: 'rgba(59,72,49,.15)',
  bodyText: '#1B1B1B',
  mutedText: '#8B7355',
  headingFont: 'Georgia, serif',
  bodyFont: 'system-ui, -apple-system, sans-serif',
  maxWidth: '680px',
  padding: '24px 16px',
};

const STEP_LABELS = ['Dates', 'Room', 'Treatments', 'Your Info', 'Review'];

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn + 'T00:00:00');
  const b = new Date(checkOut + 'T00:00:00');
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function StepProgressBar({ currentStep }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '40px',
        flexWrap: 'wrap',
      }}
    >
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = n === currentStep;
        const done = n < currentStep;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                color: done ? '#fff' : active ? '#fff' : DESIGN_TOKENS.mutedText,
                backgroundColor: done ? DESIGN_TOKENS.primaryGreen : active ? DESIGN_TOKENS.accentTerracotta : 'transparent',
                border: `2px solid ${done || active ? 'transparent' : DESIGN_TOKENS.lightBorder}`,
              }}
            >
              {done ? '✓' : n}
            </div>
            <span
              style={{
                fontSize: '12px',
                color: active ? DESIGN_TOKENS.primaryGreen : DESIGN_TOKENS.mutedText,
                fontWeight: active ? 600 : 400,
                display: 'none',
              }}
              className="step-label-mobile"
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: done ? DESIGN_TOKENS.primaryGreen : DESIGN_TOKENS.lightBorder,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function GuestBookNow() {
  const today = getTodayStr();

  // Step navigation
  const [step, setStep] = useState(1);

  // Step 1 — Dates
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);

  // Step 2 — Room
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Step 3 — Treatments
  const [treatments, setTreatments] = useState([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(true);
  const [selectedOnline, setSelectedOnline] = useState([]);
  const [selectedCallToBook, setSelectedCallToBook] = useState([]);

  // Step 4 — Guest info
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [howHeard, setHowHeard] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Step 5 — Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  // Load treatments on mount
  useEffect(() => {
    base44.entities.Treatment.list()
      .then((all) => {
        setTreatments(
          all
            .filter((t) => t.is_available !== false)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        );
      })
      .finally(() => setTreatmentsLoading(false));
  }, []);

  const handleStep1Continue = async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setRoomsLoading(true);
    setRoomsError(null);
    setSelectedRoom(null);
    setStep(2);
    try {
      const res = await base44.functions.invoke('cloudbedsGetAvailableRooms', {
        startDate: checkIn,
        endDate: checkOut,
      });
      if (res.data?.success && res.data?.rooms?.length > 0) {
        setRooms(res.data.rooms);
      } else {
        setRooms([]);
        setRoomsError('No rooms available for those dates. Please try different dates or call us at (903) 810-6695.');
      }
    } catch (err) {
      setRooms([]);
      setRoomsError('Unable to check availability. Please call us at (903) 810-6695.');
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleAddTreatmentOnline = (treatment) => {
    setSelectedOnline([...selectedOnline, { treatment, date: '', time: '', slots: [], slotsLoading: false, slotsError: null, staffId: '', staffName: '' }]);
  };

  const handleTreatmentDateChange = async (treatmentId, date) => {
    setSelectedOnline((prev) =>
      prev.map((item) =>
        item.treatment.id === treatmentId
          ? { ...item, date, time: '', slots: [], slotsLoading: true, slotsError: null }
          : item
      )
    );

    try {
      const res = await base44.functions.invoke('guestGetAvailability', { date });
      const svcData = res.data?.services?.find(
        (s) => String(s.id) === String(treatmentId) || s.name?.toLowerCase() === item.treatment.name?.toLowerCase()
      );

      setSelectedOnline((prev) =>
        prev.map((item) =>
          item.treatment.id === treatmentId
            ? {
                ...item,
                slots: svcData?.slots || [],
                staffId: svcData?.staffId || '',
                staffName: svcData?.staffName || '',
                slotsLoading: false,
                slotsError: svcData?.slots?.length ? null : 'No availability on this date. Try another date.',
              }
            : item
        )
      );
    } catch (err) {
      setSelectedOnline((prev) =>
        prev.map((item) =>
          item.treatment.id === treatmentId
            ? { ...item, slots: [], slotsLoading: false, slotsError: 'Could not load availability.' }
            : item
        )
      );
    }
  };

  const handleRemoveOnline = (treatmentId) => {
    setSelectedOnline((prev) => prev.filter((item) => item.treatment.id !== treatmentId));
  };

  const handleAddTreatmentCallToBook = (treatment) => {
    setSelectedCallToBook([...selectedCallToBook, { treatment, date: '' }]);
  };

  const handleRemoveCallToBook = (treatmentId) => {
    setSelectedCallToBook((prev) => prev.filter((item) => item.treatment.id !== treatmentId));
  };

  const handleSubmit = async () => {
    if (!guestName || !email || !phone) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        guestName,
        email,
        phone,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: guests,
        cloudbedsRoomTypeId: selectedRoom?.roomTypeID,
        roomRequested: selectedRoom?.name,
        roomPricePerNight: selectedRoom?.price,
        selectedTreatments: selectedOnline
          .filter((item) => item.date && item.time)
          .map((item) =>
            JSON.stringify({
              id: item.treatment.id,
              name: item.treatment.name,
              serviceName: item.treatment.name,
              price: item.treatment.price,
              duration: item.treatment.duration_minutes,
              date: item.date,
              time: item.time,
              staffId: item.staffId,
              staffName: item.staffName,
              guestName,
            })
          ),
        callToBookTreatments: selectedCallToBook.map((item) =>
          JSON.stringify({
            id: item.treatment.id,
            name: item.treatment.name,
            price: item.treatment.price,
            duration: item.treatment.duration_minutes,
            date: item.date,
            guestName,
          })
        ),
        specialRequests,
        howDidYouHearAboutUs: howHeard,
      };

      const res = await base44.functions.invoke('guestSubmitBooking', payload);

      if (res.data?.success) {
        setResult(res.data);
        setStep(6);
        if (res.data.type === 'booking' && res.data.publicUrl) {
          setTimeout(() => {
            window.location.href = res.data.publicUrl;
          }, 2000);
        }
      } else {
        setSubmitError(res.data?.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setSubmitError('An error occurred. Please call us at (903) 810-6695.');
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid = checkIn && checkOut && checkOut > checkIn;
  const isStep2Valid = selectedRoom;
  const isStep3Valid = selectedOnline.every((item) => item.date && item.time) || selectedCallToBook.length > 0 || (selectedOnline.length === 0 && selectedCallToBook.length === 0);
  const isStep4Valid = guestName && email && phone;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ backgroundColor: DESIGN_TOKENS.bg, minHeight: '100vh', padding: DESIGN_TOKENS.padding }}>
      <div style={{ maxWidth: DESIGN_TOKENS.maxWidth, margin: '0 auto', paddingTop: '32px' }}>
        <h1 style={{ fontFamily: DESIGN_TOKENS.headingFont, fontSize: '36px', color: DESIGN_TOKENS.primaryGreen, marginBottom: '8px', fontWeight: 300, letterSpacing: '0.5px' }}>
          Book Your Retreat
        </h1>
        <p style={{ color: DESIGN_TOKENS.mutedText, fontSize: '15px', marginBottom: '40px' }}>
          Complete the following steps to reserve your room and spa treatments.
        </p>

        <StepProgressBar currentStep={step} />

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ backgroundColor: DESIGN_TOKENS.cardBg, borderRadius: DESIGN_TOKENS.cardBorderRadius, border: DESIGN_TOKENS.cardBorder, boxShadow: DESIGN_TOKENS.cardShadow, padding: '32px 24px', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: DESIGN_TOKENS.headingFont, fontSize: '24px', color: DESIGN_TOKENS.primaryGreen, marginBottom: '24px', fontWeight: 400 }}>
              When would you like to visit?
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Check-In
                </label>
                <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={today} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '8px', fontFamily: DESIGN_TOKENS.bodyFont }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Check-Out
                </label>
                <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || today} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '8px', fontFamily: DESIGN_TOKENS.bodyFont }} />
              </div>
            </div>
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Number of Guests
              </label>
              <select value={guests} onChange={(e) => setGuests(parseInt(e.target.value))} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '8px', fontFamily: DESIGN_TOKENS.bodyFont }}>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} guest{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            {!isStep1Valid && checkIn && (
              <div style={{ color: DESIGN_TOKENS.accentTerracotta, fontSize: '13px', marginBottom: '20px' }}>
                Check-out date must be after check-in.
              </div>
            )}
            <button
              onClick={handleStep1Continue}
              disabled={!isStep1Valid}
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '15px',
                fontWeight: 600,
                color: isStep1Valid ? '#fff' : DESIGN_TOKENS.mutedBrown,
                backgroundColor: isStep1Valid ? DESIGN_TOKENS.primaryGreen : 'transparent',
                border: `2px solid ${isStep1Valid ? 'transparent' : DESIGN_TOKENS.lightBorder}`,
                borderRadius: '8px',
                cursor: isStep1Valid ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Continue to Rooms →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ marginBottom: '32px' }}>
            {roomsLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                {[1, 2].map((i) => (
                  <div key={i} style={{ backgroundColor: DESIGN_TOKENS.cardBg, borderRadius: DESIGN_TOKENS.cardBorderRadius, height: '140px', opacity: 0.5, animation: 'pulse 2s infinite' }} />
                ))}
              </div>
            )}

            {roomsError && (
              <div style={{ 
                backgroundColor: 'rgba(201, 160, 80, 0.1)', 
                border: `1px solid ${DESIGN_TOKENS.accentTerracotta}`, 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '24px', 
                fontSize: '14px', 
                color: DESIGN_TOKENS.accentTerracotta 
              }}>
                {roomsError}
              </div>
            )}

            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <div style={{ color: DESIGN_TOKENS.mutedText, fontSize: '14px', padding: '32px', textAlign: 'center' }}>
                No rooms available.
              </div>
            )}

            {!roomsLoading && rooms.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
                {rooms.map((room) => (
                  <div
                    key={room.roomTypeID}
                    onClick={() => setSelectedRoom(room)}
                    style={{
                      backgroundColor: DESIGN_TOKENS.cardBg,
                      borderRadius: DESIGN_TOKENS.cardBorderRadius,
                      border: selectedRoom?.roomTypeID === room.roomTypeID ? `2px solid ${DESIGN_TOKENS.accentTerracotta}` : DESIGN_TOKENS.cardBorder,
                      boxShadow: DESIGN_TOKENS.cardShadow,
                      padding: '20px 24px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: selectedRoom?.roomTypeID === room.roomTypeID ? `rgba(197, 124, 93, 0.06)` : DESIGN_TOKENS.cardBg,
                    }}
                  >
                    <h3 style={{ fontFamily: DESIGN_TOKENS.headingFont, fontSize: '20px', color: DESIGN_TOKENS.primaryGreen, marginBottom: '8px', fontWeight: 400 }}>
                      {room.name}
                    </h3>
                    {room.maxOccupancy && <p style={{ fontSize: '13px', color: DESIGN_TOKENS.mutedText, marginBottom: '12px' }}>Up to {room.maxOccupancy} guests</p>}
                    <p style={{ fontSize: '18px', fontWeight: 700, color: DESIGN_TOKENS.primaryGreen }}>
                      {room.price ? `$${room.price}/night` : 'Contact for pricing'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: DESIGN_TOKENS.primaryGreen,
                  backgroundColor: 'transparent',
                  border: `2px solid ${DESIGN_TOKENS.lightBorder}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!isStep2Valid}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isStep2Valid ? '#fff' : DESIGN_TOKENS.mutedBrown,
                  backgroundColor: isStep2Valid ? DESIGN_TOKENS.primaryGreen : 'transparent',
                  border: `2px solid ${isStep2Valid ? 'transparent' : DESIGN_TOKENS.lightBorder}`,
                  borderRadius: '8px',
                  cursor: isStep2Valid ? 'pointer' : 'not-allowed',
                }}
              >
                Continue to Treatments →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div style={{ marginBottom: '32px' }}>
            <p style={{ fontSize: '13px', color: DESIGN_TOKENS.mutedText, marginBottom: '20px', fontStyle: 'italic' }}>
              Spa treatments are optional — you can skip this step and add them later.
            </p>

            {treatmentsLoading ? (
              <div style={{ color: DESIGN_TOKENS.mutedText, textAlign: 'center', padding: '32px' }}>
                Loading treatments…
              </div>
            ) : (
              <>
                {/* Book Online Treatments */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontFamily: DESIGN_TOKENS.headingFont, fontSize: '18px', color: DESIGN_TOKENS.primaryGreen, marginBottom: '16px', fontWeight: 400 }}>
                    Book Online
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {treatments
                      .filter((t) => !t.booking_mode || t.booking_mode === 'book_online')
                      .map((treatment) => {
                        const isSelected = selectedOnline.some((item) => item.treatment.id === treatment.id);
                        const selectedItem = selectedOnline.find((item) => item.treatment.id === treatment.id);

                        return (
                          <div
                            key={treatment.id}
                            style={{
                              backgroundColor: DESIGN_TOKENS.cardBg,
                              borderRadius: DESIGN_TOKENS.cardBorderRadius,
                              border: DESIGN_TOKENS.cardBorder,
                              padding: '16px 20px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: isSelected ? '16px' : '0' }}>
                              <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, color: DESIGN_TOKENS.bodyText, marginBottom: '4px' }}>
                                  {treatment.name}
                                </h4>
                                <p style={{ fontSize: '12px', color: DESIGN_TOKENS.mutedText }}>
                                  {treatment.duration_minutes} min · ${treatment.price}
                                </p>
                              </div>
                              {!isSelected && (
                                <button
                                  onClick={() => handleAddTreatmentOnline(treatment)}
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: DESIGN_TOKENS.accentTerracotta,
                                    backgroundColor: 'transparent',
                                    border: `1.5px solid ${DESIGN_TOKENS.accentTerracotta}`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Add to Booking
                                </button>
                              )}
                            </div>

                            {isSelected && selectedItem && (
                              <div style={{ borderTop: `1px solid ${DESIGN_TOKENS.lightBorder}`, paddingTop: '12px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Date
                                  </label>
                                  <input
                                    type="date"
                                    value={selectedItem.date}
                                    onChange={(e) => handleTreatmentDateChange(treatment.id, e.target.value)}
                                    min={checkIn}
                                    max={checkOut}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '6px' }}
                                  />
                                </div>

                                {selectedItem.date && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Time
                                    </label>
                                    {selectedItem.slotsLoading && <p style={{ fontSize: '12px', color: DESIGN_TOKENS.mutedText }}>Checking availability…</p>}
                                    {selectedItem.slotsError && <p style={{ fontSize: '12px', color: DESIGN_TOKENS.accentTerracotta }}>{selectedItem.slotsError}</p>}
                                    {!selectedItem.slotsLoading && selectedItem.slots.length > 0 && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {selectedItem.slots.map((slot) => (
                                          <button
                                            key={slot}
                                            onClick={() =>
                                              setSelectedOnline((prev) =>
                                                prev.map((item) =>
                                                  item.treatment.id === treatment.id ? { ...item, time: slot } : item
                                                )
                                              )
                                            }
                                            style={{
                                              padding: '8px 14px',
                                              borderRadius: '20px',
                                              fontSize: '12px',
                                              border: selectedItem.time === slot ? `2px solid ${DESIGN_TOKENS.accentTerracotta}` : `1px solid ${DESIGN_TOKENS.lightBorder}`,
                                              backgroundColor: selectedItem.time === slot ? `rgba(197, 124, 93, 0.1)` : 'transparent',
                                              color: selectedItem.time === slot ? DESIGN_TOKENS.accentTerracotta : DESIGN_TOKENS.primaryGreen,
                                              cursor: 'pointer',
                                              fontWeight: selectedItem.time === slot ? 700 : 400,
                                            }}
                                          >
                                            {slot}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <button
                                  onClick={() => handleRemoveOnline(treatment.id)}
                                  style={{
                                    fontSize: '12px',
                                    color: DESIGN_TOKENS.accentTerracotta,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0,
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Call to Book Treatments */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontFamily: DESIGN_TOKENS.headingFont, fontSize: '18px', color: DESIGN_TOKENS.primaryGreen, marginBottom: '8px', fontWeight: 400 }}>
                    Treatments Requiring Confirmation
                  </h3>
                  <p style={{ fontSize: '12px', color: DESIGN_TOKENS.mutedBrown, marginBottom: '16px' }}>
                    These treatments are booked upon confirmation with our therapist. Adding one converts your booking to a request — we'll contact you to confirm.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {treatments
                      .filter((t) => t.booking_mode === 'call_to_book' || t.booking_mode === 'call_and_info')
                      .map((treatment) => {
                        const isSelected = selectedCallToBook.some((item) => item.treatment.id === treatment.id);
                        const selectedItem = selectedCallToBook.find((item) => item.treatment.id === treatment.id);

                        return (
                          <div
                            key={treatment.id}
                            style={{
                              backgroundColor: DESIGN_TOKENS.cardBg,
                              borderRadius: DESIGN_TOKENS.cardBorderRadius,
                              border: DESIGN_TOKENS.cardBorder,
                              padding: '16px 20px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: isSelected ? '16px' : '0' }}>
                              <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, color: DESIGN_TOKENS.bodyText, marginBottom: '4px' }}>
                                  {treatment.name}
                                </h4>
                                <p style={{ fontSize: '12px', color: DESIGN_TOKENS.mutedText }}>
                                  {treatment.duration_minutes} min · ${treatment.price}
                                </p>
                              </div>
                              {!isSelected && (
                                <button
                                  onClick={() => handleAddTreatmentCallToBook(treatment)}
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: DESIGN_TOKENS.primaryGreen,
                                    backgroundColor: 'transparent',
                                    border: `1.5px solid ${DESIGN_TOKENS.primaryGreen}`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Add to Request
                                </button>
                              )}
                            </div>

                            {isSelected && selectedItem && (
                              <div style={{ borderTop: `1px solid ${DESIGN_TOKENS.lightBorder}`, paddingTop: '12px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Preferred Date (we'll confirm timing with you)
                                </label>
                                <input
                                  type="date"
                                  value={selectedItem.date}
                                  onChange={(e) =>
                                    setSelectedCallToBook((prev) =>
                                      prev.map((item) =>
                                        item.treatment.id === treatment.id ? { ...item, date: e.target.value } : item
                                      )
                                    )
                                  }
                                  min={checkIn}
                                  max={checkOut}
                                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '6px', marginBottom: '12px' }}
                                />
                                <button
                                  onClick={() => handleRemoveCallToBook(treatment.id)}
                                  style={{
                                    fontSize: '12px',
                                    color: DESIGN_TOKENS.accentTerracotta,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0,
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {selectedCallToBook.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(201, 160, 80, 0.1)', border: `1px solid rgba(201, 160, 80, 0.3)`, borderRadius: '8px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px', color: DESIGN_TOKENS.mutedBrown }}>
                    <strong>Your booking includes call-to-book treatments.</strong> We'll contact you to confirm availability before finalizing your reservation. Room and any online treatments will still be booked automatically.
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: DESIGN_TOKENS.primaryGreen,
                  backgroundColor: 'transparent',
                  border: `2px solid ${DESIGN_TOKENS.lightBorder}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: DESIGN_TOKENS.primaryGreen,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {selectedCallToBook.length > 0 ? 'Continue as Request →' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div style={{ backgroundColor: DESIGN_TOKENS.cardBg, borderRadius: DESIGN_TOKENS.cardBorderRadius, border: DESIGN_TOKENS.cardBorder, boxShadow: DESIGN_TOKENS.cardShadow, padding: '32px 24px', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: DESIGN_TOKENS.headingFont, fontSize: '24px', color: DESIGN_TOKENS.primaryGreen, marginBottom: '24px', fontWeight: 400 }}>
              Your Information
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '8px', fontFamily: DESIGN_TOKENS.bodyFont }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '8px', fontFamily: DESIGN_TOKENS.bodyFont }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '8px', fontFamily: DESIGN_TOKENS.bodyFont }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                How did you hear about us?
              </label>
              <input
                type="text"
                value={howHeard}
                onChange={(e) => setHowHeard(e.target.value)}
                placeholder="Search, referral, social media…"
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${DESIGN_TOKENS.lightBorder}`, borderRadius: '8px', fontFamily: DESIGN_TOKENS.bodyFont }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Special Requests
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Room preferences, dietary needs, birthday celebration…"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: `1px solid ${DESIGN_TOKENS.lightBorder}`,
                  borderRadius: '8px',
                  fontFamily: DESIGN_TOKENS.bodyFont,
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: DESIGN_TOKENS.primaryGreen,
                  backgroundColor: 'transparent',
                  border: `2px solid ${DESIGN_TOKENS.lightBorder}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={!isStep4Valid}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isStep4Valid ? '#fff' : DESIGN_TOKENS.mutedBrown,
                  backgroundColor: isStep4Valid ? DESIGN_TOKENS.primaryGreen : 'transparent',
                  border: `2px solid ${isStep4Valid ? 'transparent' : DESIGN_TOKENS.lightBorder}`,
                  borderRadius: '8px',
                  cursor: isStep4Valid ? 'pointer' : 'not-allowed',
                }}
              >
                Review & Book →
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — Review */}
        {step === 5 && (
          <div style={{ backgroundColor: DESIGN_TOKENS.cardBg, borderRadius: DESIGN_TOKENS.cardBorderRadius, border: DESIGN_TOKENS.cardBorder, boxShadow: DESIGN_TOKENS.cardShadow, padding: '32px 24px', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: DESIGN_TOKENS.headingFont, fontSize: '24px', color: DESIGN_TOKENS.primaryGreen, marginBottom: '24px', fontWeight: 400 }}>
              Review Your Booking
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px', paddingBottom: '20px', borderBottom: `1px solid ${DESIGN_TOKENS.lightBorder}` }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Dates
                </p>
                <p style={{ fontSize: '14px', color: DESIGN_TOKENS.bodyText, fontWeight: 500 }}>
                  {checkIn} → {checkOut}
                  <br />
                  <span style={{ fontSize: '12px', color: DESIGN_TOKENS.mutedText }}>
                    {calculateNights(checkIn, checkOut)} night{calculateNights(checkIn, checkOut) > 1 ? 's' : ''}
                  </span>
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Room
                </p>
                <p style={{ fontSize: '14px', color: DESIGN_TOKENS.bodyText, fontWeight: 500 }}>
                  {selectedRoom?.name}
                  <br />
                  <span style={{ fontSize: '12px', color: DESIGN_TOKENS.mutedText }}>
                    {guests} guest{guests > 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>

            {(selectedOnline.length > 0 || selectedCallToBook.length > 0) && (
              <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: `1px solid ${DESIGN_TOKENS.lightBorder}` }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Treatments
                </p>
                {selectedOnline.map((item) => (
                  <p key={item.treatment.id} style={{ fontSize: '13px', color: DESIGN_TOKENS.bodyText, marginBottom: '4px' }}>
                    {item.treatment.name} • {item.date} {item.time ? `@ ${item.time}` : 'Time: TBD'}
                  </p>
                ))}
                {selectedCallToBook.map((item) => (
                  <p key={item.treatment.id} style={{ fontSize: '13px', color: DESIGN_TOKENS.bodyText, marginBottom: '4px' }}>
                    {item.treatment.name} • {item.date} (to be confirmed)
                  </p>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '28px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: DESIGN_TOKENS.mutedBrown, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Guest Info
              </p>
              <p style={{ fontSize: '13px', color: DESIGN_TOKENS.bodyText, marginBottom: '4px' }}>{guestName}</p>
              <p style={{ fontSize: '13px', color: DESIGN_TOKENS.bodyText, marginBottom: '4px' }}>{email}</p>
              <p style={{ fontSize: '13px', color: DESIGN_TOKENS.bodyText }}>
                <a href={`tel:${phone}`} style={{ color: DESIGN_TOKENS.accentTerracotta, textDecoration: 'none' }}>
                  {phone}
                </a>
              </p>
            </div>

            {submitError && (
              <div style={{ backgroundColor: 'rgba(197, 124, 93, 0.1)', border: `1px solid ${DESIGN_TOKENS.accentTerracotta}`, borderRadius: '8px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px', color: DESIGN_TOKENS.accentTerracotta }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(4)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: DESIGN_TOKENS.primaryGreen,
                  backgroundColor: 'transparent',
                  border: `2px solid ${DESIGN_TOKENS.lightBorder}`,
                  borderRadius: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: DESIGN_TOKENS.primaryGreen,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Processing...' : 'Complete Booking'}
              </button>
            </div>
          </div>
        )}

        {/* Step 6 — Confirmation */}
        {step === 6 && result && (
          <div style={{ backgroundColor: DESIGN_TOKENS.cardBg, borderRadius: DESIGN_TOKENS.cardBorderRadius, border: DESIGN_TOKENS.cardBorder, boxShadow: DESIGN_TOKENS.cardShadow, padding: '40px 24px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {result.type === 'booking' ? '✓' : '✓'}
            </div>
            <h2 style={{ fontFamily: DESIGN_TOKENS.headingFont, fontSize: '28px', color: DESIGN_TOKENS.primaryGreen, marginBottom: '8px', fontWeight: 400 }}>
              {result.type === 'booking' ? 'Booking Confirmed!' : 'Request Received!'}
            </h2>
            <p style={{ fontSize: '15px', color: DESIGN_TOKENS.mutedText, marginBottom: '24px' }}>
              {result.message}
            </p>
            {result.type === 'booking' && result.publicUrl ? (
              <p style={{ fontSize: '13px', color: DESIGN_TOKENS.mutedText }}>
                Redirecting to payment page in 2 seconds… or{' '}
                <a href={result.publicUrl} style={{ color: DESIGN_TOKENS.accentTerracotta, textDecoration: 'none', fontWeight: 600 }}>
                  click here
                </a>
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: DESIGN_TOKENS.mutedText }}>
                We'll contact you within 24 hours at the number provided to confirm your booking.
              </p>
            )}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.8; }
          }
          @media (max-width: 640px) {
            .step-label-mobile { display: inline !important; }
          }
        `}
      </style>
    </div>
  );
}