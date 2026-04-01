import React from 'react';
import { Link } from 'react-router-dom';

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
};

export default function BookingConfirmed() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: T.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: T.font,
    }}>
      <div style={{
        backgroundColor: T.card,
        borderRadius: T.cardRadius,
        border: T.cardBorder,
        boxShadow: T.cardShadow,
        padding: '48px 32px',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: T.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{
          fontFamily: T.heading,
          fontSize: '28px',
          color: T.primary,
          fontWeight: 400,
          margin: '0 0 16px',
        }}>
          Booking Confirmed!
        </h1>

        <p style={{
          fontSize: '15px',
          lineHeight: 1.7,
          color: T.muted,
          margin: '0 0 32px',
        }}>
          Thank you for your reservation at Hotel RITUAL. You'll receive a
          confirmation email shortly. We look forward to welcoming you.
        </p>

        <Link to="/" style={{
          display: 'inline-block',
          padding: '13px 36px',
          backgroundColor: T.primary,
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: T.font,
          borderRadius: '10px',
          textDecoration: 'none',
          letterSpacing: '0.3px',
        }}>
          Return Home
        </Link>
      </div>
    </div>
  );
}
