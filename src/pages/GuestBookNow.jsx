import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SimplyBookEngine from '@/components/SimplyBookEngine';

// ── Brand tokens ────────────────────────────────────────────────────────────
const T = {
  primary:    'rgb(107,85,64)',
  bg:         'rgb(248,246,242)',
  accent:     'rgb(150,170,155)',
  card:       '#fff',
  cardRadius: '16px',
  cardShadow: '0 2px 16px rgba(0,0,0,.06)',
  cardBorder: '1px solid rgba(107,85,64,.10)',
  muted:      'rgb(160,148,135)',
  body:       'rgb(38,32,28)',
  heading:    'Georgia, serif',
  font:       'system-ui, -apple-system, sans-serif',
  border:     'rgba(107,85,64,.15)',
  maxW:       '640px',
};

const STEP_LABELS = ['Dates', 'Room', 'Treatments', 'Your Info', 'Review'];

const BOOKING_TYPES = [
  { key: 'hotel_and_spa', icon: '🏨', label: 'Hotel Stay & Spa Treatments', subtitle: 'Book your room and schedule spa treatments' },
  { key: 'hotel_only', icon: '🛏', label: 'Hotel Stay Only', subtitle: 'Room booking — no spa treatments' },
  { key: 'spa_only', icon: '✨', label: 'Spa Treatments Only', subtitle: 'Day spa visit — no overnight stay' },
];

const ROOM_ORDER = ['Suite 1', 'Suite 2', 'Suite 3', 'Suite 5', 'Carriage House'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function nights(a, b) {
  if (!a || !b) return 0;
  return Math.max(1, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5));
}

function datesBetween(start, end) {
  const out = [];
  const c = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  while (c <= e) { out.push(c.toISOString().split('T')[0]); c.setDate(c.getDate() + 1); }
  return out;
}

function fmtDate(s) {
  const [y, m, d] = s.split('-');
  return new Date(+y, m - 1, +d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtTime(s) {
  const [h, m] = String(s).split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ── Shared styles ───────────────────────────────────────────────────────────

const card = {
  backgroundColor: T.card,
  borderRadius: T.cardRadius,
  border: T.cardBorder,
  boxShadow: T.cardShadow,
  padding: '32px 24px',
  marginBottom: '28px',
};

const h2Style = {
  fontFamily: T.heading,
  fontSize: '24px',
  color: T.primary,
  fontWeight: 400,
  marginBottom: '24px',
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: T.muted,
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  fontSize: '14px',
  border: `1px solid ${T.border}`,
  borderRadius: '10px',
  fontFamily: T.font,
  backgroundColor: T.bg,
  color: T.body,
  outline: 'none',
};

function PrimaryBtn({ children, disabled, onClick, style: extra, id }) {
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '13px 20px',
        fontSize: '15px',
        fontWeight: 600,
        color: disabled ? T.muted : '#fff',
        backgroundColor: disabled ? 'transparent' : T.primary,
        border: disabled ? `2px solid ${T.border}` : '2px solid transparent',
        borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .2s',
        ...extra,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ children, disabled, onClick, style: extra }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '13px 20px',
        fontSize: '15px',
        fontWeight: 600,
        color: T.primary,
        backgroundColor: 'transparent',
        border: `2px solid ${T.border}`,
        borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all .2s',
        ...extra,
      }}
    >
      {children}
    </button>
  );
}

// ── Step progress bar ───────────────────────────────────────────────────────

function StepBar({ current, labels }) {
  const displayLabels = labels || STEP_LABELS;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '36px', flexWrap: 'wrap' }}>
      {displayLabels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <React.Fragment key={n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
                color: done || active ? '#fff' : T.muted,
                backgroundColor: done ? T.accent : active ? T.primary : 'transparent',
                border: done || active ? 'none' : `2px solid ${T.border}`,
                transition: 'all .2s',
              }}>
                {done ? '✓' : n}
              </div>
              <span className="step-label" style={{
                fontSize: '11px', fontWeight: active ? 700 : 400,
                color: active ? T.primary : T.muted,
                display: 'none',
              }}>
                {label}
              </span>
            </div>
            {i < displayLabels.length - 1 && <div style={{ width: '20px', height: '2px', backgroundColor: done ? T.accent : T.border }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── ReviewRow ───────────────────────────────────────────────────────────────

function ReviewRow({ label, children }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <p style={{ ...labelStyle, marginBottom: '5px' }}>{label}</p>
      <div style={{ fontSize: '14px', color: T.body, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

export default function GuestBookNow() {
  const today = todayStr();

  // Booking type
  const [bookingType, setBookingType] = useState('hotel_and_spa'); // 'hotel_and_spa' | 'hotel_only' | 'spa_only'

  // Navigation — uses "logical step" which maps to actual steps via activeSteps
  const [step, setStep] = useState(1);

  // Step 1 — Dates & Guest Names
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [guestNames, setGuestNames] = useState(['']);

  // Step 2 — Room
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Step 3 — Treatments (SimplyBookEngine bookings)
  const [spaBookings, setSpaBookings] = useState([]); // BookingResult[] from SimplyBookEngine

  // Step 4 — Guest info
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [howHeard, setHowHeard] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Step 5 — Submit
  const [submitting, setSubmitting] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  // Step flow based on booking type
  // All steps: 1=Dates, 2=Room, 3=Treatments, 4=Info, 5=Review, 6=Confirmation
  // hotel_and_spa: 1 → 2 → 3 → 4 → 5
  // hotel_only:    1 → 2 → 4 → 5  (skip treatments)
  // spa_only:      1 → 3 → 4 → 5  (skip room)
  const activeSteps = bookingType === 'hotel_only'
    ? [1, 2, 4, 5]
    : bookingType === 'spa_only'
    ? [1, 3, 4, 5]
    : [1, 2, 3, 4, 5];

  const activeStepLabels = bookingType === 'hotel_only'
    ? ['Dates', 'Room', 'Your Info', 'Review']
    : bookingType === 'spa_only'
    ? ['Dates', 'Treatments', 'Your Info', 'Review']
    : STEP_LABELS;

  const stepBarPos = activeSteps.indexOf(step) + 1; // 1-indexed position for StepBar

  function goNext(fromStep) {
    const idx = activeSteps.indexOf(fromStep);
    if (idx < activeSteps.length - 1) setStep(activeSteps[idx + 1]);
  }

  function goBack(fromStep) {
    const idx = activeSteps.indexOf(fromStep);
    if (idx > 0) setStep(activeSteps[idx - 1]);
  }

  // Scroll to top on every step change
  // Scroll top on mount and on step change
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  // ── Step 1 → next: navigate based on booking type ──────────────────────
  async function handleStep1Continue() {
    if (bookingType === 'spa_only') {
      // Clear room selection, go to treatments
      setSelectedRoom(null);
      goNext(1);
      return;
    }
    // Hotel flow — fetch rooms
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
    } catch {
      setRooms([]);
      setRoomsError('Unable to check availability. Please call us at (903) 810-6695.');
    } finally {
      setRoomsLoading(false);
    }
  }

  // ── Step 5: submit ──────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!guestName || !email || !phone) return;
    setSubmitting(true);
    setShowProcessingModal(true);
    setSubmitError(null);

    try {
      const payload = {
        guestName,
        email,
        phone,
        bookingType,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: guests,
        cloudbedsRoomTypeId: bookingType !== 'spa_only' ? selectedRoom?.roomTypeID : '',
        roomRequested: bookingType !== 'spa_only' ? selectedRoom?.name : '',
        roomPricePerNight: bookingType !== 'spa_only' ? 198 : 0,
        selectedTreatments: bookingType !== 'hotel_only' ? spaBookings.map(b => JSON.stringify({
          serviceId: b.serviceId,
          id: b.serviceId,
          name: b.serviceName,
          serviceName: b.serviceName,
          price: b.price,
          duration: b.duration,
          date: b.date,
          startTime: b.startTime,
          time: b.startTime,
          providerId: b.providerId,
          staffId: b.providerId,
          staffName: b.providerName,
          guestName: b.guestName,
        })) : [],
        callToBookTreatments: [],
        specialRequests,
        howDidYouHearAboutUs: howHeard,
      };

      const res = await base44.functions.invoke('guestSubmitBooking', payload);

      if (res.data?.success) {
        setResult(res.data);
        setStep(6);

        // Best-effort: send itinerary email
        try {
          await base44.functions.invoke('sendItineraryEmail', {
            guestEmail: email,
            guestName,
            confirmationCode: res.data.confirmationCode || res.data.reservationId || '',
          });
        } catch (e) {
          console.error('sendItineraryEmail failed (non-blocking):', e);
        }

        if (res.data.type === 'booking' && res.data.publicUrl) {
          setTimeout(() => { window.location.href = res.data.publicUrl; }, 2500);
        }
      } else {
        setSubmitError(res.data?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('An error occurred. Please call us at (903) 810-6695.');
    } finally {
      setSubmitting(false);
      setShowProcessingModal(false);
    }
  }

  // ── Validation helpers ──────────────────────────────────────────────────
  const step1Valid = bookingType === 'spa_only'
    ? checkIn && guestNames.every(n => n.trim())
    : checkIn && checkOut && checkOut > checkIn && guestNames.every(n => n.trim());
  const step2Valid = !!selectedRoom;
  const step4Valid = guestName.trim() && email.trim() && phone.trim();

  const stayDates = (checkIn && checkOut) ? datesBetween(checkIn, checkOut) : [];
  const numNights = nights(checkIn, checkOut);
  const roomRate = 198;
  const effectiveRoomSubtotal = bookingType === 'spa_only' ? 0 : roomRate * numNights;
  const roomSubtotal = effectiveRoomSubtotal;
  const effectiveTreatments = bookingType === 'hotel_only' ? [] : spaBookings;
  const treatmentTotal = effectiveTreatments.reduce((s, b) => s + (b.price || 0), 0);
  const hotelTaxRate = 0.15; // 6% state + 7% city + 2% venue
  const hotelTaxAmount = Math.round(roomSubtotal * hotelTaxRate * 100) / 100;
  const grandTotal = roomSubtotal + treatmentTotal + hotelTaxAmount;

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', padding: '24px 16px', fontFamily: T.font }}>
      <div style={{ maxWidth: T.maxW, margin: '0 auto', paddingTop: '28px' }}>

        {/* Header */}
        <h1 style={{ fontFamily: T.heading, fontSize: '34px', color: T.primary, fontWeight: 300, letterSpacing: '0.3px', marginBottom: '6px' }}>
          Book Your Retreat
        </h1>
        <p style={{ color: T.muted, fontSize: '14px', marginBottom: '36px' }}>
          {bookingType === 'hotel_only' ? 'Complete the following steps to reserve your room.'
            : bookingType === 'spa_only' ? 'Complete the following steps to book your spa treatments.'
            : 'Complete the following steps to reserve your room and spa treatments.'}
        </p>

        {step <= 5 && <StepBar current={stepBarPos} labels={activeStepLabels} />}

        {/* ═══════════ STEP 1 — DATES ═══════════ */}
        {step === 1 && (
          <div style={card}>
            {/* Booking Type Selection */}
            <h2 style={h2Style}>What would you like to book?</h2>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
              {BOOKING_TYPES.map(bt => {
                const sel = bookingType === bt.key;
                return (
                  <div
                    key={bt.key}
                    onClick={() => setBookingType(bt.key)}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: sel ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
                      backgroundColor: sel ? 'rgba(150,170,155,.06)' : T.card,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all .15s',
                    }}
                  >
                    <span style={{ fontSize: '26px' }}>{bt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: T.primary, marginBottom: '2px' }}>{bt.label}</p>
                      <p style={{ fontSize: '12px', color: T.muted }}>{bt.subtitle}</p>
                    </div>
                    {sel && (
                      <span style={{ color: T.accent, fontSize: '20px', fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>

            <h2 style={h2Style}>When would you like to visit?</h2>

            {bookingType === 'spa_only' ? (
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Treatment Date</label>
                <input type="date" value={checkIn} min={today} onChange={e => { setCheckIn(e.target.value); setCheckOut(e.target.value); }} style={inputStyle} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Check-In</label>
                  <input type="date" value={checkIn} min={today} onChange={e => setCheckIn(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Check-Out</label>
                  <input type="date" value={checkOut} min={checkIn || today} onChange={e => setCheckOut(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Number of Guests</label>
              <select value={guests} onChange={e => {
                const n = +e.target.value;
                setGuests(n);
                setGuestNames(prev => {
                  const next = [...prev];
                  while (next.length < n) next.push('');
                  return next.slice(0, n);
                });
              }} style={inputStyle}>
                <option value="1">1 guest</option>
                <option value="2">2 guests</option>
                <option value="3">3 guests</option>
                <option value="4">4 guests</option>
              </select>
            </div>

            {/* Guest name fields */}
            <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
              {guestNames.map((name, i) => (
                <div key={i}>
                  <label style={labelStyle}>Guest {i + 1} Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => {
                      const next = [...guestNames];
                      next[i] = e.target.value;
                      setGuestNames(next);
                    }}
                    placeholder={i === 0 ? 'Jane Doe' : `Guest ${i + 1}`}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            {bookingType !== 'spa_only' && checkIn && checkOut && checkOut <= checkIn && (
              <p style={{ color: 'rgb(180,100,80)', fontSize: '13px', marginBottom: '16px' }}>Check-out date must be after check-in.</p>
            )}

            <PrimaryBtn disabled={!step1Valid} onClick={handleStep1Continue}>
              {bookingType === 'spa_only' ? 'Continue to Treatments' : 'Continue to Rooms'}
            </PrimaryBtn>
          </div>
        )}

        {/* ═══════════ STEP 2 — ROOM ═══════════ */}
        {step === 2 && (
          <div style={{ marginBottom: '28px' }}>
            {roomsLoading && (
              <div style={{ display: 'grid', gap: '14px' }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ ...card, height: '120px', opacity: 0.45, animation: 'pulse 2s infinite' }} />
                ))}
              </div>
            )}

            {roomsError && (
              <div style={{ backgroundColor: 'rgba(180,100,80,.08)', border: '1px solid rgba(180,100,80,.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px', fontSize: '14px', color: 'rgb(160,90,70)' }}>
                {roomsError}
              </div>
            )}

            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <p style={{ color: T.muted, fontSize: '14px', textAlign: 'center', padding: '40px' }}>No rooms available.</p>
            )}

            {!roomsLoading && rooms.length > 0 && (() => {
              const sortedRooms = [...rooms].sort((a, b) => {
                const ai = ROOM_ORDER.findIndex(n => a.name?.includes(n) || a.name === n);
                const bi = ROOM_ORDER.findIndex(n => b.name?.includes(n) || b.name === n);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
              });
              const guestCount = Number(guests || 1);
              const visibleRooms = sortedRooms.filter(room => {
                const name = room.name || '';
                if (name.includes('Suite 4') || name.includes('Suite 6')) return guestCount >= 3;
                return true;
              });
              return (
                <>
                  <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
                    {visibleRooms.map(room => {
                      const sel = selectedRoom?.roomTypeID === room.roomTypeID;
                      const price = 198;
                      return (
                        <div
                          key={room.roomTypeID}
                          onClick={() => { setSelectedRoom(room); setTimeout(() => document.getElementById('room-continue-btn')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150); }}
                          style={{
                            ...card,
                            marginBottom: 0,
                            cursor: 'pointer',
                            borderColor: sel ? T.primary : 'rgba(107,85,64,.10)',
                            borderWidth: sel ? '2px' : '1px',
                            backgroundColor: sel ? 'rgba(150,170,155,.06)' : T.card,
                            transition: 'all .15s',
                          }}
                        >
                          <h3 style={{ fontFamily: T.heading, fontSize: '19px', color: T.primary, fontWeight: 400, marginBottom: '6px' }}>
                            {room.name}
                          </h3>
                          {room.maxOccupancy && (
                            <p style={{ fontSize: '12px', color: T.muted, marginBottom: '10px' }}>Up to {room.maxOccupancy} guests</p>
                          )}
                          <p style={{ fontSize: '18px', fontWeight: 700, color: T.primary }}>
                            ${price} / night
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {guestCount < 3 && (
                    <p style={{ fontSize: '12px', textAlign: 'center', color: 'rgb(150,150,150)', marginTop: '12px', marginBottom: '16px' }}>
                      Traveling with 3 or more guests? Additional suites are available.
                    </p>
                  )}
                </>
              );
            })()}

            <div style={{ display: 'flex', gap: '12px' }}>
              <SecondaryBtn onClick={() => goBack(2)}>Back</SecondaryBtn>
              <PrimaryBtn id="room-continue-btn" disabled={!step2Valid} onClick={() => goNext(2)}>
                {bookingType === 'hotel_only' ? 'Continue to Your Info' : 'Continue to Treatments'}
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3 — TREATMENTS (SimplyBookEngine) ═══════════ */}
        {step === 3 && (
          <div style={{ marginBottom: '28px' }}>
            {bookingType !== 'spa_only' && (
              <p style={{ fontSize: '13px', color: T.muted, marginBottom: '20px', fontStyle: 'italic' }}>
                Spa treatments are optional — you can skip this step and add them later.
              </p>
            )}

            <SimplyBookEngine
              stayDates={stayDates}
              guestNames={guestNames.filter(n => n.trim())}
              onBookingSelected={(selection) => {
                setSpaBookings(prev => [...prev, selection]);
              }}
              onBookingComplete={(allSelections) => {
                setSpaBookings(allSelections);
                goNext(3);
              }}
              onSkip={bookingType !== 'spa_only' ? () => {
                setSpaBookings([]);
                goNext(3);
              } : undefined}
              brandColors={{
                primary: T.primary,
                accent: T.accent,
                background: T.bg,
                card: T.card,
              }}
            />

            <div style={{ marginTop: '16px' }}>
              <SecondaryBtn onClick={() => goBack(3)}>
                {bookingType === 'spa_only' ? 'Back' : 'Back to Rooms'}
              </SecondaryBtn>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 4 — GUEST INFO ═══════════ */}
        {step === 4 && (
          <div style={card}>
            <h2 style={h2Style}>Your Information</h2>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Full Name *</label>
              <input type="text" value={guestName || guestNames[0] || ''} onChange={e => setGuestName(e.target.value)} onFocus={e => { if (!guestName && guestNames[0]) setGuestName(guestNames[0]); }} placeholder="Jane Doe" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Email Address *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Phone Number *</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(903) 555-1234" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>How did you hear about us?</label>
              <input type="text" value={howHeard} onChange={e => setHowHeard(e.target.value)} placeholder="Search, referral, social media..." style={inputStyle} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Special Requests</label>
              <textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                placeholder="Room preferences, dietary needs, birthday celebration..."
                style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <SecondaryBtn onClick={() => goBack(4)}>Back</SecondaryBtn>
              <PrimaryBtn disabled={!step4Valid} onClick={() => goNext(4)}>Review &amp; Book</PrimaryBtn>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 5 — REVIEW ═══════════ */}
        {step === 5 && (() => {
          // Group treatments by guest
          const byGuest = {};
          effectiveTreatments.forEach(b => {
            const g = b.guestName || 'Guest';
            if (!byGuest[g]) byGuest[g] = [];
            byGuest[g].push(b);
          });

          return (
          <div style={card}>
            <h2 style={h2Style}>Review Your Booking</h2>

            {/* Room — only for hotel bookings */}
            {bookingType !== 'spa_only' && selectedRoom && (
              <div style={{ marginBottom: '22px', paddingBottom: '18px', borderBottom: `1px solid ${T.border}` }}>
                <p style={{ ...labelStyle, marginBottom: '10px' }}>Room</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', color: T.body, fontWeight: 500 }}>{selectedRoom?.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: T.primary }}>${roomSubtotal.toFixed(2)}</span>
                </div>
                <span style={{ fontSize: '12px', color: T.muted }}>
                  {fmtDate(checkIn)} — {fmtDate(checkOut)} · {numNights} night{numNights > 1 ? 's' : ''} × ${roomRate}/night
                </span>
              </div>
            )}

            {/* Treatments grouped by guest */}
            {effectiveTreatments.length > 0 && (
              <div style={{ marginBottom: '22px', paddingBottom: '18px', borderBottom: `1px solid ${T.border}` }}>
                <p style={{ ...labelStyle, marginBottom: '10px' }}>Spa Treatments</p>
                {Object.entries(byGuest).map(([guest, bookings]) => (
                  <div key={guest} style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: T.primary, marginBottom: '6px' }}>{guest}</p>
                    {bookings.map((b, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', paddingLeft: '10px' }}>
                        <div>
                          <span style={{ fontSize: '14px', color: T.body }}>{b.serviceName}</span>
                          <br />
                          <span style={{ fontSize: '12px', color: T.muted }}>
                            {fmtDate(b.date)} at {fmtTime(b.startTime)}{b.providerName ? ` with ${b.providerName}` : ''}
                          </span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: T.primary }}>${b.price}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${T.border}`, marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: T.muted }}>Treatment Subtotal</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: T.primary }}>${treatmentTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Hotel Taxes — only for hotel bookings */}
            {bookingType !== 'spa_only' && roomSubtotal > 0 && (
              <div style={{ marginBottom: '22px', paddingBottom: '18px', borderBottom: `1px solid ${T.border}` }}>
                <p style={{ ...labelStyle, marginBottom: '10px' }}>Hotel Occupancy Taxes</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '13px', color: T.muted }}>State of Texas (6%)</span>
                  <span style={{ fontSize: '13px', color: T.body }}>${(roomSubtotal * 0.06).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '13px', color: T.muted }}>City of Jacksonville (7%)</span>
                  <span style={{ fontSize: '13px', color: T.body }}>${(roomSubtotal * 0.07).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '13px', color: T.muted }}>Jacksonville Venue Tax (2%)</span>
                  <span style={{ fontSize: '13px', color: T.body }}>${(roomSubtotal * 0.02).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${T.border}`, marginTop: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: T.muted }}>Tax Subtotal (on room only)</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: T.primary }}>${hotelTaxAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Grand Total */}
            {grandTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: T.primary }}>Total</span>
                <span style={{ fontSize: '22px', fontWeight: 700, color: T.primary }}>${grandTotal.toFixed(2)}</span>
              </div>
            )}

            {/* Guest Info */}
            <ReviewRow label="Guest Info">
              {guestName}<br />
              {email}<br />
              <a href={`tel:${phone}`} style={{ color: T.accent, textDecoration: 'none' }}>{phone}</a>
            </ReviewRow>

            {specialRequests && (
              <ReviewRow label="Special Requests">
                <span style={{ fontStyle: 'italic', color: T.muted }}>{specialRequests}</span>
              </ReviewRow>
            )}

            {submitError && (
              <div style={{ backgroundColor: 'rgba(180,100,80,.08)', border: '1px solid rgba(180,100,80,.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '13px', color: 'rgb(160,90,70)' }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <SecondaryBtn onClick={() => goBack(5)} disabled={submitting}>Back</SecondaryBtn>
              <PrimaryBtn onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <><Loader2 className="animate-spin w-4 h-4 mr-2 inline" /> Processing your booking...</>
                  : 'Complete Booking'}
              </PrimaryBtn>
            </div>
          </div>
          );
        })()}

        {/* Processing overlay */}
        {showProcessingModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: T.cardRadius,
              boxShadow: '0 8px 32px rgba(0,0,0,.18)',
              textAlign: 'center',
              padding: '48px 40px',
              maxWidth: '380px',
              width: '90%',
            }}>
              <Loader2 className="animate-spin" style={{ width: 36, height: 36, color: T.primary, margin: '0 auto 20px' }} />
              <p style={{ fontFamily: T.heading, fontSize: '20px', color: T.primary, fontWeight: 400, marginBottom: '10px' }}>
                Processing your booking...
              </p>
              <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.5 }}>
                This can take up to 60 seconds.<br />Please don't close this window.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 6 — CONFIRMATION ═══════════ */}
        {step === 6 && result && (
          <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'rgba(150,170,155,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '24px', color: T.accent,
            }}>
              ✓
            </div>

            <h2 style={{ fontFamily: T.heading, fontSize: '28px', color: T.primary, fontWeight: 400, marginBottom: '10px' }}>
              {result.type === 'booking' ? 'Booking Confirmed!' : 'Request Received!'}
            </h2>

            <p style={{ fontSize: '15px', color: T.muted, marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px' }}>
              {result.message}
            </p>

            {result.type === 'booking' && result.publicUrl ? (
              <p style={{ fontSize: '13px', color: T.muted }}>
                Redirecting to payment page...{' '}
                <a href={result.publicUrl} style={{ color: T.primary, textDecoration: 'underline', fontWeight: 600 }}>
                  Click here
                </a>{' '}
                if not redirected.
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: T.muted }}>
                We'll contact you within 24 hours to confirm your booking.
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.45} 50%{opacity:.7} }
        @media(min-width:640px){ .step-label{display:inline!important} }
      `}</style>
    </div>
  );
}