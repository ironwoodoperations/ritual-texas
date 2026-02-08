import React from 'react';

export default function AfterBooking() {
  return (
    <section style={{ background: '#F0E8DD', minHeight: '100vh', padding: '22px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '34px' }}>
              You're All Set.
            </h1>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65', maxWidth: '720px' }}>
              Your treatment request is booked (or in progress). Want to elevate your stay?
              Add another ritual below — most guests pair a body reset with a facial or sound work.
            </p>
          </div>

          <div style={{ padding: '6px 10px', borderRadius: '999px', background: 'rgba(196,165,92,.18)', border: '1px solid rgba(59,72,49,.10)', color: '#3B4831', fontWeight: 800, fontSize: '12px' }}>
            Concierge Pick
          </div>
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <div style={{ fontWeight: 900, color: '#1B1B1B' }}>Pairing that books out fastest</div>
            <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.6' }}>
              <b>Sound Bath</b> (private or group) + <b>Swedish Massage</b> is a favorite for deep nervous-system calm.
            </div>
          </div>
        </div>

        <h2 style={{ margin: '18px 0 10px', color: '#3B4831', fontFamily: 'serif', fontSize: '26px' }}>
          Add Another Treatment
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          <a href="/booking?service=royal" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
              <div style={{ color: '#3B4831', fontWeight: 900 }}>Royal Treatment Facial</div>
              <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.55', fontSize: '14px' }}>
                Instant radiance with zero downtime.
              </div>
              <div style={{ marginTop: '10px', display: 'inline-block', background: '#C57C5D', color: '#FCF9F4', padding: '10px 12px', borderRadius: '14px', fontWeight: 900 }}>
                Book Now
              </div>
            </div>
          </a>

          <a href="/booking?service=aura" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
              <div style={{ color: '#3B4831', fontWeight: 900 }}>Aura Glow</div>
              <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.55', fontSize: '14px' }}>
                A full mind + body reset ritual.
              </div>
              <div style={{ marginTop: '10px', display: 'inline-block', background: '#C57C5D', color: '#FCF9F4', padding: '10px 12px', borderRadius: '14px', fontWeight: 900 }}>
                Book Now
              </div>
            </div>
          </a>

          <a href="/booking?service=swedish60" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
              <div style={{ color: '#3B4831', fontWeight: 900 }}>Swedish Massage (60)</div>
              <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.55', fontSize: '14px' }}>
                Flowing strokes to melt away stress.
              </div>
              <div style={{ marginTop: '10px', display: 'inline-block', background: '#C57C5D', color: '#FCF9F4', padding: '10px 12px', borderRadius: '14px', fontWeight: 900 }}>
                Book Now
              </div>
            </div>
          </a>

          <a href="/booking?service=soundprivate" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
              <div style={{ color: '#3B4831', fontWeight: 900 }}>Sound Bath (Private)</div>
              <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.55', fontSize: '14px' }}>
                A full-body frequency reset.
              </div>
              <div style={{ marginTop: '10px', display: 'inline-block', background: '#C57C5D', color: '#FCF9F4', padding: '10px 12px', borderRadius: '14px', fontWeight: 900 }}>
                Book Now
              </div>
            </div>
          </a>
        </div>

        <div style={{ marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href="/Treatments" style={{ textDecoration: 'none', padding: '12px 14px', borderRadius: '14px', fontWeight: 900, border: '1px solid rgba(59,72,49,.18)', color: '#3B4831', background: 'transparent' }}>
            Browse All Treatments
          </a>
          <a href="/AskRitual" style={{ textDecoration: 'none', padding: '12px 14px', borderRadius: '14px', fontWeight: 900, background: '#3B4831', color: '#FCF9F4' }}>
            Message Concierge
          </a>
        </div>

        <p style={{ marginTop: '14px', color: '#1B1B1B', opacity: 0.75, fontSize: '12px', lineHeight: '1.5' }}>
          Tip: Add this link to your Square confirmation email as "Want to add another treatment?": <span style={{ fontWeight: 900 }}>/afterBooking</span>
        </p>

      </div>
    </section>
  );
}