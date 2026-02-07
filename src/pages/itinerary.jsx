import React, { useState, useEffect } from 'react';

export default function Itinerary() {
  const [hotelConf, setHotelConf] = useState('');
  const [contact, setContact] = useState('');
  const [showItinerary, setShowItinerary] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('ritual_itinerary_lookup') || '{}');
    if (saved.hotelConf) setHotelConf(saved.hotelConf);
    if (saved.contact) setContact(saved.contact);
    if (saved.hotelConf || saved.contact) setShowItinerary(true);
  }, []);

  const handleSave = () => {
    const payload = {
      hotelConf: (hotelConf || '').trim(),
      contact: (contact || '').trim()
    };
    localStorage.setItem('ritual_itinerary_lookup', JSON.stringify(payload));
    setShowItinerary(true);
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleClear = () => {
    localStorage.removeItem('ritual_itinerary_lookup');
    setHotelConf('');
    setContact('');
    setShowItinerary(false);
  };

  return (
    <section style={{ background: '#F0E8DD', minHeight: '100vh', padding: '22px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>

        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '34px' }}>
              Your RITUAL Itinerary
            </h1>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65', maxWidth: '760px' }}>
              This page brings your hotel stay + spa appointments into one simple timeline.
              If something looks off, tap "Message Concierge" and we'll fix it fast.
            </p>
          </div>
          <div style={{ padding: '6px 10px', borderRadius: '999px', background: 'rgba(196,165,92,.18)', border: '1px solid rgba(59,72,49,.10)', color: '#3B4831', fontWeight: 800, fontSize: '12px' }}>
            One place. One plan.
          </div>
        </header>

        {/* Lookup Card */}
        <div style={{ marginTop: '14px', background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
          <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '22px' }}>Find your itinerary</h2>
          <p style={{ margin: '8px 0 0', color: '#1B1B1B', lineHeight: '1.6' }}>
            Enter the details you used when booking. (This is optional for now — it helps you keep everything in one place.)
          </p>

          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <label style={{ display: 'block' }}>
              <div style={{ fontWeight: 900, color: '#1B1B1B', marginBottom: '6px' }}>Hotel confirmation # (Cloudbeds)</div>
              <input
                value={hotelConf}
                onChange={(e) => setHotelConf(e.target.value)}
                placeholder="Example: CB-123456"
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid rgba(59,72,49,.22)', background: '#fff', fontSize: '16px', outline: 'none' }}
              />
            </label>

            <label style={{ display: 'block' }}>
              <div style={{ fontWeight: 900, color: '#1B1B1B', marginBottom: '6px' }}>Email or phone used to book</div>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@email.com or (903) 555-1234"
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid rgba(59,72,49,.22)', background: '#fff', fontSize: '16px', outline: 'none' }}
              />
            </label>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              style={{ background: '#C57C5D', color: '#FCF9F4', border: 'none', padding: '12px 14px', borderRadius: '14px', fontWeight: 900, cursor: 'pointer' }}
            >
              Save & View Itinerary
            </button>
            <button
              onClick={handleClear}
              style={{ background: 'transparent', color: '#3B4831', border: '1px solid rgba(59,72,49,.22)', padding: '12px 14px', borderRadius: '14px', fontWeight: 900, cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>

          <p style={{ marginTop: '10px', color: '#1B1B1B', opacity: 0.75, fontSize: '12px', lineHeight: '1.5' }}>
            Privacy note: for now this is stored only on this device/browser to help you return to your itinerary quickly.
          </p>
        </div>

        {/* Itinerary View */}
        {showItinerary && (
          <div style={{ marginTop: '14px' }}>
            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <a
                href="/afterBooking"
                style={{ textDecoration: 'none', background: '#3B4831', color: '#FCF9F4', padding: '12px 14px', borderRadius: '14px', fontWeight: 900 }}
              >
                Add Another Treatment
              </a>
              <a
                href="/AskRitual"
                style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '12px 14px', borderRadius: '14px', fontWeight: 900 }}
              >
                Message Concierge
              </a>
              <button
                onClick={() => window.print()}
                style={{ background: 'transparent', border: '1px solid rgba(59,72,49,.22)', color: '#3B4831', padding: '12px 14px', borderRadius: '14px', fontWeight: 900, cursor: 'pointer' }}
              >
                Print
              </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
                <div style={{ color: '#3B4831', fontWeight: 900 }}>Hotel Stay</div>
                <div style={{ marginTop: '8px', color: '#1B1B1B', lineHeight: '1.6' }}>
                  <div><b>Confirmation:</b> <span>{hotelConf || '—'}</span></div>
                  <div><b>Check-in:</b> 3:00 PM (or per your confirmation)</div>
                  <div><b>Check-out:</b> 11:00 AM (or per your confirmation)</div>
                </div>
                <div style={{ marginTop: '10px', color: '#1B1B1B', opacity: 0.85, fontSize: '12px', lineHeight: '1.5' }}>
                  We'll auto-pull room + dates in the next upgrade (Cloudbeds sync).
                </div>
              </div>

              <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
                <div style={{ color: '#3B4831', fontWeight: 900 }}>Spa Appointments</div>
                <div style={{ marginTop: '8px', color: '#1B1B1B', lineHeight: '1.6' }}>
                  Your spa bookings are confirmed through Square.
                </div>

                <a
                  href="https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services"
                  target="_top"
                  rel="nofollow"
                  style={{ marginTop: '10px', display: 'inline-block', background: '#C4A55C', color: '#1B1B1B', padding: '10px 12px', borderRadius: '14px', fontWeight: 900, textDecoration: 'none' }}
                >
                  View / Book Spa Services
                </a>

                <div style={{ marginTop: '10px', color: '#1B1B1B', opacity: 0.85, fontSize: '12px', lineHeight: '1.5' }}>
                  Tip: check your email/text confirmation from Square for exact appointment time(s).
                </div>
              </div>

              <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
                <div style={{ color: '#3B4831', fontWeight: 900 }}>On-Property Rituals</div>
                <div style={{ marginTop: '8px', color: '#1B1B1B', lineHeight: '1.6' }}>
                  <b>Sauna + rainshower</b> recommended pre or post treatment for maximum results.<br />
                  Rehydrate with mineral water, organic teas, and snacks in the butler's pantry.
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ marginTop: '12px', background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
              <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '22px' }}>Simple timeline</h2>
              <div style={{ marginTop: '10px', display: 'grid', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                  <div style={{ fontWeight: 900, color: '#1B1B1B' }}>Arrival</div>
                  <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.6' }}>
                    Use your confirmation and pre-arrival instructions for check-in steps, parking, and entry.
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                  <div style={{ fontWeight: 900, color: '#1B1B1B' }}>Treatments</div>
                  <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.6' }}>
                    Arrive 10 minutes early. Sauna + rainshower available pre/post treatment if desired.
                    Check your Square confirmation for exact time(s).
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                  <div style={{ fontWeight: 900, color: '#1B1B1B' }}>Departure</div>
                  <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.6' }}>
                    Check-out by 11:00 AM (or per confirmation). If you need anything, message concierge.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}