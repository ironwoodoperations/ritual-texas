import React, { useEffect } from 'react';

export default function BookingRedirect() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingUrl = urlParams.get('url');
    
    if (bookingUrl) {
      setTimeout(() => {
        window.location.replace(decodeURIComponent(bookingUrl));
      }, 600);
    }
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const bookingUrl = urlParams.get('url') ? decodeURIComponent(urlParams.get('url')) : '#';

  return (
    <section style={{ background: '#F0E8DD', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{
        maxWidth: '560px',
        background: '#FCF9F4',
        borderRadius: '18px',
        padding: '22px',
        boxShadow: '0 10px 30px rgba(0,0,0,.10)',
        border: '1px solid rgba(59,72,49,.10)',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '30px' }}>
          Preparing Your Booking…
        </h1>
        <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
          You're being securely redirected to complete your booking and payment.
        </p>
        <p style={{ marginTop: '8px', fontSize: '13px', color: '#3B4831' }}>
          This usually takes less than a second.
        </p>

        <div style={{ marginTop: '14px' }}>
          <a
            href={bookingUrl}
            target="_top"
            rel="nofollow"
            style={{
              display: 'inline-block',
              background: '#C57C5D',
              color: '#FCF9F4',
              padding: '12px 16px',
              borderRadius: '14px',
              textDecoration: 'none',
              fontWeight: 900
            }}
          >
            Continue to Booking
          </a>
        </div>
      </div>
    </section>
  );
}