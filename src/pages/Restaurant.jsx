import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Phone, Mail } from 'lucide-react';

export default function Restaurant() {
  const { data: hours = [] } = useQuery({
    queryKey: ['restaurant-hours'],
    queryFn: () => base44.entities.RestaurantHours.list(),
  });

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedHours = hours.sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(59,72,49,0.05) 0%, rgba(150,170,155,0.05) 100%)' }}>
        <h1 style={{ margin: 0, fontFamily: 'serif', fontSize: '48px', color: '#3B4831', letterSpacing: '2px' }}>
          RITUAL
        </h1>
        <p style={{ marginTop: '16px', fontSize: '20px', color: '#1B1B1B', fontWeight: 300 }}>
          Feed your soul with food, libations, and music.
        </p>
        <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={createPageUrl('RestaurantMenu')} style={{ padding: '14px 28px', background: '#C57C5D', color: '#FCF9F4', textDecoration: 'none', borderRadius: '8px', fontWeight: 700 }}>
            View Menu
          </Link>
          <Link to={createPageUrl('RestaurantOrder')} style={{ padding: '14px 28px', background: '#3B4831', color: '#FCF9F4', textDecoration: 'none', borderRadius: '8px', fontWeight: 700 }}>
            Order Online
          </Link>
          <Link to={createPageUrl('RestaurantReservations')} style={{ padding: '14px 28px', background: 'transparent', border: '2px solid #3B4831', color: '#3B4831', textDecoration: 'none', borderRadius: '8px', fontWeight: 700 }}>
            Reservations
          </Link>
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* The Luncheonette */}
        <section style={{ marginBottom: '60px', background: '#FCF9F4', padding: '40px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
          <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '32px', color: '#3B4831' }}>The Luncheonette</h2>
          <p style={{ marginTop: '20px', lineHeight: '1.8', color: '#1B1B1B', fontSize: '16px' }}>
            Step into our café where East Texas warmth meets modern wellness. Every dish is crafted from whole, organic, locally-sourced ingredients. 
            Whether you're stopping in for a nourishing lunch, a craft cocktail, or live music, RITUAL on Main is your neighborhood gathering place 
            where good food and good company come together.
          </p>
        </section>

        {/* Today at Ritual */}
        <section style={{ marginBottom: '60px', background: '#FCF9F4', padding: '40px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
          <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '32px', color: '#3B4831' }}>Today at Ritual</h2>
          <div style={{ marginTop: '20px', lineHeight: '1.8', color: '#1B1B1B', fontSize: '16px' }}>
            <p><strong>Daily Specials:</strong> Check with us for today's fresh features</p>
            <p><strong>Live Music:</strong> Select evenings - follow us for schedule updates</p>
            <p><strong>Happy Hour:</strong> Craft cocktails and local brews</p>
          </div>
        </section>

        {/* Hours & Location */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '32px', color: '#3B4831', marginBottom: '24px' }}>Hours & Location</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {/* Hours */}
            <div style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Calendar className="w-5 h-5" style={{ color: '#3B4831' }} />
                <h3 style={{ margin: 0, fontSize: '20px', color: '#3B4831', fontWeight: 700 }}>Hours</h3>
              </div>
              {sortedHours.length > 0 ? (
                sortedHours.map(h => (
                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                    <span style={{ fontWeight: 600, color: '#1B1B1B' }}>{h.dayOfWeek}</span>
                    <span style={{ color: '#1B1B1B' }}>
                      {h.isClosed ? 'Closed' : `${h.openTime} - ${h.closeTime}`}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#1B1B1B' }}>Hours coming soon</p>
              )}
            </div>

            {/* Location */}
            <div style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <MapPin className="w-5 h-5" style={{ color: '#3B4831' }} />
                <h3 style={{ margin: 0, fontSize: '20px', color: '#3B4831', fontWeight: 700 }}>Visit Us</h3>
              </div>
              <div style={{ lineHeight: '1.8', color: '#1B1B1B' }}>
                <p style={{ margin: '8px 0' }}>
                  <a href="https://www.google.com/maps/search/?api=1&query=214+S+Main+Street+Jacksonville+TX+75766" target="_blank" rel="noopener noreferrer" style={{ color: '#C57C5D', textDecoration: 'none' }}>
                    214 S. Main Street<br />
                    Jacksonville, TX 75766
                  </a>
                </p>
                <p style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone className="w-4 h-4" />
                  <a href="tel:9032846880" style={{ color: '#1B1B1B', textDecoration: 'none' }}>(903) 284-6880</a>
                </p>
                <p style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail className="w-4 h-4" />
                  <a href="mailto:ritualonmain@gmail.com" style={{ color: '#1B1B1B', textDecoration: 'none' }}>ritualonmain@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Placeholder */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '32px', color: '#3B4831', marginBottom: '24px' }}>Gallery</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} style={{ aspectRatio: '1', background: 'rgba(59,72,49,.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B4831', fontSize: '14px' }}>
                Gallery {i}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}