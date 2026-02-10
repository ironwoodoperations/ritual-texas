import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Phone, Mail, Sparkles } from 'lucide-react';

function DailySpecialsSection() {
  const { data: specials = [] } = useQuery({
    queryKey: ['active-specials'],
    queryFn: async () => {
      const all = await base44.entities.RestaurantDailySpecials.list();
      return all.filter(s => s.isActiveToday && !s.isArchived);
    },
  });

  return (
    <section style={{ marginBottom: '60px', background: '#FCF9F4', padding: '40px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Sparkles className="w-8 h-8" style={{ color: '#C57C5D' }} />
        <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '32px', color: '#3B4831' }}>Daily Specials</h2>
      </div>
      
      {specials.length > 0 ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {specials.map(special => (
            <div key={special.id} style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid rgba(59,72,49,.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#3B4831', fontWeight: 700 }}>{special.title}</h3>
                {special.price && (
                  <span style={{ fontSize: '20px', color: '#C57C5D', fontWeight: 700 }}>${special.price}</span>
                )}
              </div>
              <p style={{ margin: '8px 0 0 0', color: '#1B1B1B', lineHeight: '1.7' }}>{special.description}</p>
              {special.category && (
                <span style={{ display: 'inline-block', marginTop: '8px', padding: '4px 10px', background: 'rgba(197,124,93,.15)', color: '#C57C5D', fontSize: '12px', borderRadius: '4px', fontWeight: 600 }}>
                  {special.category}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, color: '#1B1B1B', lineHeight: '1.7', fontSize: '16px' }}>
          Daily specials updated each morning — check back soon or call us at (903) 284-6880.
        </p>
      )}
    </section>
  );
}

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
      <section style={{ 
        padding: '80px 20px 80px 20px', 
        textAlign: 'center', 
        backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/75adb6665_galaxy_ai_1770762058526.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: '35% center',
        backgroundRepeat: 'no-repeat',
        minHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
          <Link to={createPageUrl('RestaurantMenu')} style={{ padding: '10px 18px', background: 'rgba(217, 126, 93, 0.92)', color: '#FCF9F4', textDecoration: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            View Menu
          </Link>
          <Link to={createPageUrl('RestaurantOrder')} style={{ padding: '10px 18px', background: 'rgba(229, 195, 133, 0.92)', color: '#3B4831', textDecoration: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            Order Online
          </Link>
          <Link to={createPageUrl('RestaurantReservations')} style={{ padding: '10px 18px', background: 'rgba(144, 158, 123, 0.92)', color: '#FCF9F4', textDecoration: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            Reservations
          </Link>
          <Link to={createPageUrl('RestaurantEvents')} style={{ padding: '10px 18px', background: 'rgba(186, 143, 132, 0.92)', color: '#FCF9F4', textDecoration: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            Plan Your Event
          </Link>
        </div>
        <p style={{ margin: '0', fontSize: '18px', color: '#FCF9F4', fontWeight: 400, fontStyle: 'italic', textShadow: '2px 2px 8px rgba(0,0,0,0.9)', background: 'rgba(0,0,0,0.35)', padding: '10px 24px', borderRadius: '4px', display: 'inline-block', letterSpacing: '0.3px' }}>
          Feed your soul with food, libations, and music.
        </p>
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

        {/* Daily Specials */}
        <DailySpecialsSection />

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
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                <span style={{ fontWeight: 600, color: '#1B1B1B' }}>Sunday</span>
                <span style={{ color: '#1B1B1B' }}>Closed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                <span style={{ fontWeight: 600, color: '#1B1B1B' }}>Monday</span>
                <span style={{ color: '#1B1B1B' }}>Closed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                <span style={{ fontWeight: 600, color: '#1B1B1B' }}>Tuesday</span>
                <span style={{ color: '#1B1B1B' }}>10:30 AM - 2:00 PM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                <span style={{ fontWeight: 600, color: '#1B1B1B' }}>Wednesday</span>
                <span style={{ color: '#1B1B1B' }}>10:30 AM - 2:00 PM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                <span style={{ fontWeight: 600, color: '#1B1B1B' }}>Thursday</span>
                <span style={{ color: '#1B1B1B' }}>10:30 AM - 2:00 PM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                <span style={{ fontWeight: 600, color: '#1B1B1B' }}>Friday</span>
                <span style={{ color: '#1B1B1B' }}>10:30 AM - 2:00 PM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                <span style={{ fontWeight: 600, color: '#1B1B1B' }}>Saturday</span>
                <span style={{ color: '#1B1B1B' }}>10:30 AM - 2:00 PM</span>
              </div>
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

        {/* Gallery */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '32px', color: '#3B4831', marginBottom: '24px' }}>Gallery</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {[
              'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/373223234_2024-11-271.jpg',
              'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/d4719c55c_2024-11-272.jpg',
              'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/5212e8832_IMG_20260209_095826.jpg',
              'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/1605432aa_IMG_20260209_095454.jpg',
              'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/57c09d2f7_B043AFB5-1DFD-404F-9581-966F7435BED3-7B17CC40-3FFC-421B-8FD1-8E173B70D93D.JPG',
              'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/cb1ec329f_2024-11-273.jpg',
              'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/d431348ae_IMG_20260209_094315.jpg',
              'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/584cf5d43_IMG_20260209_094310.jpg'
            ].map((img, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <img src={img} alt={`Gallery ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}