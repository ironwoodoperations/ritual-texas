import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(slot) {
  const [h, m] = String(slot).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDatesBetween(start, end) {
  const dates = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── Steps ───────────────────────────────────────────────────────────────────
const STEPS = {
  SERVICE: 'service',
  PROVIDER: 'provider',
  DATE: 'date',
  TIME: 'time',
  CONFIRM: 'confirm',
  BOOKING: 'booking',
  DONE: 'done',
};

// ── Main Component ──────────────────────────────────────────────────────────

export default function SimplyBookEngine({
  stayDates = [],
  guestNames = [],
  onBookingSelected,
  onBookingComplete,
  onSkip,
  brandColors = {},
}) {
  const colors = {
    primary: brandColors.primary || '#3B4831',
    accent: brandColors.accent || '#C57C5D',
    background: brandColors.background || '#F0E8DD',
    card: brandColors.card || '#FCF9F4',
  };

  // ── State ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState(STEPS.SERVICE);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selections
  const [selectedGuest, setSelectedGuest] = useState(guestNames.length > 0 ? guestNames[0] : '');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null); // null = "any"
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Availability
  const [availabilityMap, setAvailabilityMap] = useState({}); // { date: { hasAvailability, providers, allSlots } }
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Booking
  const [bookingError, setBookingError] = useState(null);
  const [completedBookings, setCompletedBookings] = useState([]);

  // Multi-booking mode
  const [addingAnother, setAddingAnother] = useState(false);

  // ── Load services on mount ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await base44.functions.invoke('guestGetServices', {});
        if (cancelled) return;
        if (res.data?.error) {
          setError(res.data.error);
        } else {
          setServices(res.data?.services || []);
          setProviders(res.data?.providers || []);
        }
      } catch (e) {
        if (!cancelled) setError('Unable to load treatments. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch multi-day availability when service is selected ───────────────
  const fetchAvailability = useCallback(async (service, providerId) => {
    if (!service || stayDates.length === 0) return;
    setAvailabilityLoading(true);
    setAvailabilityMap({});
    try {
      const res = await base44.functions.invoke('guestGetMultiDayAvailability', {
        serviceId: service.id,
        dates: stayDates,
        providerId: providerId || undefined,
      });
      if (res.data?.availability) {
        setAvailabilityMap(res.data.availability);
      }
    } catch {
      // Non-fatal — dates will show as unavailable
    } finally {
      setAvailabilityLoading(false);
    }
  }, [stayDates]);

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleSelectService(svc) {
    setSelectedService(svc);
    setSelectedProvider(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailabilityMap({});
    setBookingError(null);

    // If service has 0 or 1 providers, skip provider step
    if (!svc.providers || svc.providers.length === 0) {
      // No specific providers mapped — use "any available"
      setSelectedProvider(null);
      fetchAvailability(svc, undefined);
      setStep(STEPS.DATE);
    } else if (svc.providers.length === 1) {
      setSelectedProvider(svc.providers[0]);
      fetchAvailability(svc, svc.providers[0].id);
      setStep(STEPS.DATE);
    } else {
      setStep(STEPS.PROVIDER);
    }
  }

  function handleSelectProvider(provider) {
    setSelectedProvider(provider); // null means "any available"
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingError(null);
    fetchAvailability(selectedService, provider?.id);
    setStep(STEPS.DATE);
  }

  function handleSelectDate(date) {
    setSelectedDate(date);
    setSelectedTime(null);
    setBookingError(null);
    setStep(STEPS.TIME);
  }

  function handleSelectTime(time) {
    setSelectedTime(time);
    setBookingError(null);
    setStep(STEPS.CONFIRM);
  }

  function handleConfirmBooking() {
    if (!selectedService || !selectedDate || !selectedTime) return;

    const selection = {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      duration: selectedService.duration,
      providerId: selectedProvider?.id || null,
      providerName: selectedProvider?.name || null,
      date: selectedDate,
      startTime: selectedTime,
      guestName: selectedGuest || null,
    };

    setCompletedBookings(prev => [...prev, selection]);

    if (onBookingSelected) {
      onBookingSelected(selection);
    }

    setStep(STEPS.DONE);
  }

  function handleAddAnother() {
    setAddingAnother(true);
    setSelectedGuest(guestNames.length > 0 ? guestNames[0] : '');
    setSelectedService(null);
    setSelectedProvider(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailabilityMap({});
    setBookingError(null);
    setStep(STEPS.SERVICE);
  }

  function handleFinish() {
    if (onBookingComplete) {
      onBookingComplete(completedBookings);
    }
  }

  function handleSkip() {
    if (completedBookings.length > 0 && onBookingComplete) {
      onBookingComplete(completedBookings);
    } else if (onSkip) {
      onSkip();
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────

  const timeSlotsForDate = useMemo(() => {
    if (!selectedDate || !availabilityMap[selectedDate]) return [];
    const dateData = availabilityMap[selectedDate];
    if (selectedProvider) {
      const p = dateData.providers?.find(pr => pr.id === selectedProvider.id);
      return p?.slots || [];
    }
    return dateData.allSlots || [];
  }, [selectedDate, selectedProvider, availabilityMap]);

  // Check if a time slot conflicts with an already-selected booking
  const isSlotConflict = useCallback((slot) => {
    if (!selectedDate || !selectedProvider?.id) return false;
    const slotHHMM = String(slot).substring(0, 5);
    return completedBookings.some(
      b => b.providerId === selectedProvider.id &&
           b.date === selectedDate &&
           String(b.startTime).substring(0, 5) === slotHHMM
    );
  }, [selectedDate, selectedProvider, completedBookings]);

  // ── Styles ──────────────────────────────────────────────────────────────

  const cardStyle = {
    backgroundColor: colors.card,
    borderRadius: '16px',
    border: `1px solid rgba(59,72,49,.10)`,
    boxShadow: '0 4px 20px rgba(0,0,0,.06)',
    padding: '24px',
    marginBottom: '16px',
  };

  const headingStyle = {
    fontFamily: 'Georgia, serif',
    fontSize: '22px',
    color: colors.primary,
    fontWeight: 400,
    marginBottom: '16px',
  };

  const subheadStyle = {
    fontSize: '13px',
    color: '#8B7355',
    marginBottom: '20px',
  };

  const pillBtnBase = {
    padding: '10px 18px',
    borderRadius: '24px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
    fontWeight: 500,
  };

  const primaryBtn = {
    width: '100%',
    padding: '13px 20px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  };

  const secondaryBtn = {
    width: '100%',
    padding: '13px 20px',
    fontSize: '15px',
    fontWeight: 600,
    color: colors.primary,
    backgroundColor: 'transparent',
    border: `2px solid rgba(59,72,49,.15)`,
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const backLink = {
    fontSize: '13px',
    color: '#8B7355',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    textDecoration: 'underline',
    padding: 0,
    marginBottom: '16px',
    display: 'inline-block',
  };

  // ── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: '28px', height: '28px', border: `3px solid ${colors.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: '14px', color: '#8B7355' }}>Loading spa treatments...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={cardStyle}>
        <p style={{ color: colors.accent, fontSize: '14px', marginBottom: '16px' }}>{error}</p>
        <button onClick={() => window.location.reload()} style={secondaryBtn}>Try Again</button>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div style={cardStyle}>
        <p style={{ color: '#8B7355', fontSize: '14px' }}>No spa treatments are currently available. Please call us at (903) 810-6695.</p>
      </div>
    );
  }

  // ── STEP: Service Selection ───────────────────────────────────────────

  if (step === STEPS.SERVICE) {
    return (
      <div>
        {/* Show completed bookings summary */}
        {completedBookings.length > 0 && (
          <div style={{ ...cardStyle, backgroundColor: 'rgba(59,72,49,.05)', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.primary, marginBottom: '12px' }}>
              Selected Treatments ({completedBookings.length})
            </p>
            {completedBookings.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < completedBookings.length - 1 ? '1px solid rgba(59,72,49,.08)' : 'none' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: colors.primary }}>{b.serviceName}</p>
                  <p style={{ fontSize: '12px', color: '#8B7355' }}>{b.guestName ? `for ${b.guestName} · ` : ''}{formatDate(b.date)} at {formatTime(b.startTime)}{b.providerName ? ` with ${b.providerName}` : ''}</p>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: colors.primary }}>${b.price}</span>
              </div>
            ))}
          </div>
        )}

        <div style={cardStyle}>
          <h2 style={headingStyle}>
            {completedBookings.length > 0 ? 'Add Another Treatment' : 'Select a Treatment'}
          </h2>
          <p style={subheadStyle}>Choose from our signature spa experiences.</p>

          {/* Guest selector */}
          {guestNames.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B7355', marginBottom: '8px' }}>
                Who is this treatment for?
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {guestNames.map(name => {
                  const active = selectedGuest === name;
                  return (
                    <button
                      key={name}
                      onClick={() => setSelectedGuest(name)}
                      style={{
                        ...pillBtnBase,
                        backgroundColor: active ? colors.primary : colors.card,
                        color: active ? '#fff' : colors.primary,
                        border: active ? `2px solid ${colors.primary}` : `1px solid rgba(59,72,49,.15)`,
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {services.map(svc => (
              <button
                key={svc.id}
                onClick={() => handleSelectService(svc)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  backgroundColor: colors.card,
                  border: `1px solid rgba(59,72,49,.10)`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  width: '100%',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.boxShadow = '0 2px 12px rgba(197,124,93,.12)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(59,72,49,.10)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: colors.primary, marginBottom: '4px' }}>{svc.name}</p>
                  <p style={{ fontSize: '12px', color: '#8B7355' }}>
                    {svc.duration} min{svc.providers.length > 0 ? ` · ${svc.providers.length} therapist${svc.providers.length > 1 ? 's' : ''}` : ''}
                  </p>
                  {svc.description && <p style={{ fontSize: '12px', color: '#a09080', marginTop: '4px' }}>{svc.description.replace(/<[^>]*>/g, '').trim()}</p>}
                </div>
                <span style={{ fontSize: '16px', fontWeight: 700, color: colors.primary, whiteSpace: 'nowrap', marginLeft: '16px' }}>${svc.price}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          {completedBookings.length > 0 ? (
            <button onClick={handleFinish} style={primaryBtn}>
              Continue with {completedBookings.length} Treatment{completedBookings.length > 1 ? 's' : ''}
            </button>
          ) : onSkip ? (
            <button onClick={handleSkip} style={secondaryBtn}>
              Skip Treatments
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // ── STEP: Provider Selection ──────────────────────────────────────────

  if (step === STEPS.PROVIDER) {
    return (
      <div style={cardStyle}>
        <button onClick={() => { setStep(STEPS.SERVICE); setSelectedService(null); }} style={backLink}>← Back to treatments</button>
        <h2 style={headingStyle}>Choose Your Therapist</h2>
        <p style={subheadStyle}>for {selectedService?.name}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* "Any Available" option */}
          <button
            onClick={() => handleSelectProvider(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 18px',
              backgroundColor: colors.card,
              border: `1px solid rgba(59,72,49,.10)`,
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = colors.accent; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(59,72,49,.10)'; }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(59,72,49,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              ✦
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: colors.primary }}>No Preference</p>
              <p style={{ fontSize: '12px', color: '#8B7355' }}>We'll assign the best available therapist</p>
            </div>
          </button>

          {selectedService?.providers?.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectProvider(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 18px',
                backgroundColor: colors.card,
                border: `1px solid rgba(59,72,49,.10)`,
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = colors.accent; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(59,72,49,.10)'; }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: 'rgba(197,124,93,.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 700, color: colors.accent, flexShrink: 0,
              }}>
                {p.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: colors.primary }}>{p.name}</p>
                {p.position && <p style={{ fontSize: '12px', color: '#8B7355' }}>{p.position}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── STEP: Date Selection (Calendar) ───────────────────────────────────

  if (step === STEPS.DATE) {
    return (
      <div style={cardStyle}>
        <button onClick={() => {
          if (selectedService?.providers?.length > 1) {
            setStep(STEPS.PROVIDER);
          } else {
            setStep(STEPS.SERVICE);
            setSelectedService(null);
          }
        }} style={backLink}>← Back</button>

        <h2 style={headingStyle}>Pick a Date</h2>
        <p style={subheadStyle}>
          {selectedService?.name}
          {selectedProvider ? ` with ${selectedProvider.name}` : ' · any available therapist'}
        </p>

        {availabilityLoading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ width: '24px', height: '24px', border: `3px solid ${colors.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: '#8B7355' }}>Checking availability for your stay dates...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            {stayDates.map(date => {
              const dateInfo = availabilityMap[date];
              const hasSlots = dateInfo?.hasAvailability;
              const slotCount = dateInfo?.totalSlots || 0;

              return (
                <button
                  key={date}
                  onClick={() => hasSlots && handleSelectDate(date)}
                  disabled={!hasSlots}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border: hasSlots ? `1px solid rgba(59,72,49,.15)` : `1px solid rgba(0,0,0,.06)`,
                    backgroundColor: hasSlots ? colors.card : 'rgba(0,0,0,.03)',
                    cursor: hasSlots ? 'pointer' : 'not-allowed',
                    opacity: hasSlots ? 1 : 0.45,
                    textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { if (hasSlots) { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseOut={e => { if (hasSlots) { e.currentTarget.style.borderColor = 'rgba(59,72,49,.15)'; e.currentTarget.style.transform = 'none'; } }}
                >
                  <p style={{ fontSize: '14px', fontWeight: 600, color: hasSlots ? colors.primary : '#bbb', marginBottom: '4px' }}>
                    {formatDate(date)}
                  </p>
                  <p style={{ fontSize: '11px', color: hasSlots ? colors.accent : '#ccc' }}>
                    {hasSlots ? `${slotCount} time${slotCount > 1 ? 's' : ''} available` : 'Unavailable'}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {!availabilityLoading && Object.values(availabilityMap).every(d => !d.hasAvailability) && stayDates.length > 0 && (
          <p style={{ fontSize: '13px', color: colors.accent, marginTop: '16px', textAlign: 'center' }}>
            No availability for this treatment during your stay. Please call us at (903) 810-6695 for assistance.
          </p>
        )}
      </div>
    );
  }

  // ── STEP: Time Selection ──────────────────────────────────────────────

  if (step === STEPS.TIME) {
    return (
      <div style={cardStyle}>
        <button onClick={() => { setStep(STEPS.DATE); setSelectedDate(null); }} style={backLink}>← Back to dates</button>

        <h2 style={headingStyle}>Pick a Time</h2>
        <p style={subheadStyle}>
          {selectedService?.name} · {formatDate(selectedDate)}
          {selectedProvider ? ` · ${selectedProvider.name}` : ''}
        </p>

        {bookingError && (
          <div style={{ backgroundColor: 'rgba(197,124,93,.08)', border: `1px solid ${colors.accent}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: colors.accent }}>
            {bookingError}
          </div>
        )}

        {timeSlotsForDate.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {timeSlotsForDate.map(slot => {
              const isSelected = selectedTime === slot;
              const conflict = isSlotConflict(slot);
              return (
                <button
                  key={slot}
                  onClick={() => {
                    if (conflict) {
                      setBookingError('This therapist is already booked at this time. Please choose a different time.');
                      return;
                    }
                    handleSelectTime(slot);
                  }}
                  disabled={conflict}
                  style={{
                    ...pillBtnBase,
                    backgroundColor: conflict ? 'rgba(0,0,0,.04)' : isSelected ? colors.accent : colors.card,
                    color: conflict ? '#bbb' : isSelected ? '#fff' : colors.primary,
                    border: conflict ? '1px solid rgba(0,0,0,.06)' : isSelected ? `2px solid ${colors.accent}` : `1px solid rgba(59,72,49,.15)`,
                    fontWeight: isSelected ? 700 : 500,
                    transform: isSelected ? 'scale(1.05)' : 'none',
                    cursor: conflict ? 'not-allowed' : 'pointer',
                    opacity: conflict ? 0.5 : 1,
                    textDecoration: conflict ? 'line-through' : 'none',
                  }}
                  onMouseOver={e => { if (!isSelected && !conflict) e.currentTarget.style.borderColor = colors.accent; }}
                  onMouseOut={e => { if (!isSelected && !conflict) e.currentTarget.style.borderColor = 'rgba(59,72,49,.15)'; }}
                >
                  {formatTime(slot)}
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#8B7355', textAlign: 'center', padding: '20px' }}>
            No times available for this date. Please select another date.
          </p>
        )}
      </div>
    );
  }

  // ── STEP: Confirmation ────────────────────────────────────────────────

  if (step === STEPS.CONFIRM) {
    return (
      <div style={cardStyle}>
        <button onClick={() => { setStep(STEPS.TIME); setSelectedTime(null); }} style={backLink}>← Change time</button>

        <h2 style={headingStyle}>Confirm Your Booking</h2>

        {bookingError && (
          <div style={{ backgroundColor: 'rgba(197,124,93,.08)', border: `1px solid ${colors.accent}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: colors.accent }}>
            {bookingError}
          </div>
        )}

        <div style={{ backgroundColor: 'rgba(59,72,49,.04)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B7355', marginBottom: '4px' }}>Treatment</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: colors.primary }}>{selectedService?.name}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B7355', marginBottom: '4px' }}>Date</p>
                <p style={{ fontSize: '14px', color: colors.primary }}>{formatDate(selectedDate)}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B7355', marginBottom: '4px' }}>Time</p>
                <p style={{ fontSize: '14px', color: colors.primary }}>{formatTime(selectedTime)}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B7355', marginBottom: '4px' }}>Therapist</p>
                <p style={{ fontSize: '14px', color: colors.primary }}>{selectedProvider?.name || 'Best Available'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B7355', marginBottom: '4px' }}>Duration</p>
                <p style={{ fontSize: '14px', color: colors.primary }}>{selectedService?.duration} minutes</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(59,72,49,.10)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#8B7355' }}>Price</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: colors.primary }}>${selectedService?.price}</span>
            </div>
          </div>
        </div>

        {/* Guest info summary */}
        {selectedGuest && (
          <div style={{ fontSize: '13px', color: '#8B7355', marginBottom: '20px' }}>
            Treatment for <strong style={{ color: colors.primary }}>{selectedGuest}</strong>
          </div>
        )}

        <button
          onClick={handleConfirmBooking}
          style={primaryBtn}
        >
          Confirm Selection
        </button>
      </div>
    );
  }

  // ── STEP: Done ────────────────────────────────────────────────────────

  if (step === STEPS.DONE) {
    const lastBooking = completedBookings[completedBookings.length - 1];
    const total = completedBookings.reduce((s, b) => s + (b.price || 0), 0);

    return (
      <div>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(59,72,49,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' }}>
              ✓
            </div>
            <h2 style={{ ...headingStyle, marginBottom: '8px' }}>Treatment Selected!</h2>
            <p style={{ fontSize: '13px', color: '#8B7355' }}>
              {lastBooking?.serviceName}{lastBooking?.guestName ? ` for ${lastBooking.guestName}` : ''} on {formatDate(lastBooking?.date)} at {formatTime(lastBooking?.startTime)}
              {lastBooking?.providerName ? ` with ${lastBooking.providerName}` : ''}
            </p>
          </div>

          {/* All bookings summary */}
          {completedBookings.length > 1 && (
            <div style={{ borderTop: '1px solid rgba(59,72,49,.08)', paddingTop: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.primary, marginBottom: '12px' }}>
                All Selected Treatments
              </p>
              {completedBookings.map((b, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                  <span style={{ color: colors.primary }}>{b.serviceName}{b.guestName ? ` (${b.guestName})` : ''} · {formatDate(b.date)} {formatTime(b.startTime)}</span>
                  <span style={{ fontWeight: 600, color: colors.primary }}>${b.price}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: '1px solid rgba(59,72,49,.08)', marginTop: '8px', fontSize: '15px', fontWeight: 700, color: colors.primary }}>
                <span>Total</span>
                <span>${total}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleAddAnother} style={secondaryBtn}>
            + Add Another Treatment
          </button>
          <button onClick={handleFinish} style={primaryBtn}>
            {completedBookings.length > 0 ? 'Continue' : 'Done'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
