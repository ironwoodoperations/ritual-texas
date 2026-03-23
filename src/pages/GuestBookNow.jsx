import React, { useState, useEffect } from 'react';
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

function PrimaryBtn({ children, disabled, onClick, style: extra }) {
  return (
    <button
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

function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '36px', flexWrap: 'wrap' }}>
      {STEP_LABELS.map((label, i) => {
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
            {i < 4 && <div style={{ width: '20px', height: '2px', backgroundColor: done ? T.accent : T.border }} />}
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

  // Navigation
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
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  // Scroll top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── Step 1 → 2: fetch rooms ─────────────────────────────────────────────
  async function goToRooms() {
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
        selectedTreatments: spaBookings.map(b => JSON.stringify({
          id: b.serviceId,
          name: b.serviceName,
          serviceName: b.serviceName,
          price: b.price,
          duration: b.duration,
          date: b.date,
          time: b.startTime,
          staffId: b.providerId,
          staffName: b.providerName,
          guestName,
        })),
        callToBookTreatments: [],
        specialRequests,
        howDidYouHearAboutUs: howHeard,
      };

      const res = await base44.functions.invoke('guestSubmitBooking', payload);

      if (res.data?.success) {
        setResult(res.data);
        setStep(6);
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
    }
  }

  // ── Validation helpers ──────────────────────────────────────────────────
  const step1Valid = checkIn && checkOut && checkOut > checkIn;
  const step2Valid = !!selectedRoom;
  const step4Valid = guestName.trim() && email.trim() && phone.trim();

  const stayDates = (checkIn && checkOut) ? datesBetween(checkIn, checkOut) : [];
  const numNights = nights(checkIn, checkOut);
  const treatmentTotal = spaBookings.reduce((s, b) => s + (b.price || 0), 0);

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
          Complete the following steps to reserve your room and spa treatments.
        </p>

        {step <= 5 && <StepBar current={step} />}

        {/* ═══════════ STEP 1 — DATES ═══════════ */}
        {step === 1 && (
          <div style={card}>
            <h2 style={h2Style}>When would you like to visit?</h2>

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

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Number of Guests</label>
              <select value={guests} onChange={e => setGuests(+e.target.value)} style={inputStyle}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>

            {checkIn && checkOut && checkOut <= checkIn && (
              <p style={{ color: 'rgb(180,100,80)', fontSize: '13px', marginBottom: '16px' }}>Check-out date must be after check-in.</p>
            )}

            <PrimaryBtn disabled={!step1Valid} onClick={goToRooms}>Continue to Rooms</PrimaryBtn>
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

            {!roomsLoading && rooms.length > 0 && (
              <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
                {rooms.map(room => {
                  const sel = selectedRoom?.roomTypeID === room.roomTypeID;
                  return (
                    <div
                      key={room.roomTypeID}
                      onClick={() => setSelectedRoom(room)}
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
                        {room.price ? `$${room.price}/night` : 'Contact for pricing'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <SecondaryBtn onClick={() => setStep(1)}>Back</SecondaryBtn>
              <PrimaryBtn disabled={!step2Valid} onClick={() => setStep(3)}>Continue to Treatments</PrimaryBtn>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3 — TREATMENTS (SimplyBookEngine) ═══════════ */}
        {step === 3 && (
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '13px', color: T.muted, marginBottom: '20px', fontStyle: 'italic' }}>
              Spa treatments are optional — you can skip this step and add them later.
            </p>

            <SimplyBookEngine
              stayDates={stayDates}
              onBookingSelected={(selection) => {
                setSpaBookings(prev => [...prev, selection]);
              }}
              onBookingComplete={(allSelections) => {
                setSpaBookings(allSelections);
                setStep(4);
              }}
              onSkip={() => {
                setSpaBookings([]);
                setStep(4);
              }}
              brandColors={{
                primary: T.primary,
                accent: T.accent,
                background: T.bg,
                card: T.card,
              }}
            />

            <div style={{ marginTop: '16px' }}>
              <SecondaryBtn onClick={() => setStep(2)}>Back to Rooms</SecondaryBtn>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 4 — GUEST INFO ═══════════ */}
        {step === 4 && (
          <div style={card}>
            <h2 style={h2Style}>Your Information</h2>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Full Name *</label>
              <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Jane Doe" style={inputStyle} />
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
              <SecondaryBtn onClick={() => setStep(3)}>Back</SecondaryBtn>
              <PrimaryBtn disabled={!step4Valid} onClick={() => setStep(5)}>Review &amp; Book</PrimaryBtn>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 5 — REVIEW ═══════════ */}
        {step === 5 && (
          <div style={card}>
            <h2 style={h2Style}>Review Your Booking</h2>

            {/* Dates + Room */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px', paddingBottom: '18px', borderBottom: `1px solid ${T.border}` }}>
              <ReviewRow label="Dates">
                {fmtDate(checkIn)} — {fmtDate(checkOut)}
                <br />
                <span style={{ fontSize: '12px', color: T.muted }}>{numNights} night{numNights > 1 ? 's' : ''}</span>
              </ReviewRow>
              <ReviewRow label="Room">
                {selectedRoom?.name}
                <br />
                <span style={{ fontSize: '12px', color: T.muted }}>
                  {guests} guest{guests > 1 ? 's' : ''}
                  {selectedRoom?.price ? ` · $${selectedRoom.price}/night` : ''}
                </span>
              </ReviewRow>
            </div>

            {/* Treatments */}
            {spaBookings.length > 0 && (
              <div style={{ marginBottom: '22px', paddingBottom: '18px', borderBottom: `1px solid ${T.border}` }}>
                <p style={{ ...labelStyle, marginBottom: '10px' }}>Spa Treatments</p>
                {spaBookings.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontSize: '14px', color: T.body, fontWeight: 500 }}>{b.serviceName}</span>
                      <br />
                      <span style={{ fontSize: '12px', color: T.muted }}>
                        {fmtDate(b.date)} at {fmtTime(b.startTime)}
                        {b.providerName ? ` · ${b.providerName}` : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: T.primary }}>${b.price}</span>
                  </div>
                ))}
                {spaBookings.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${T.border}`, marginTop: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: T.muted }}>Treatment Total</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: T.primary }}>${treatmentTotal}</span>
                  </div>
                )}
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
              <SecondaryBtn onClick={() => setStep(4)} disabled={submitting}>Back</SecondaryBtn>
              <PrimaryBtn onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Processing...' : 'Complete Booking'}
              </PrimaryBtn>
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
