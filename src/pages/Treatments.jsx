import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreatmentRequestForm from '@/components/TreatmentRequestForm';

export default function Treatments() {
  const [requestTreatment, setRequestTreatment] = useState(null);
  const [expandedVideo, setExpandedVideo] = useState(null);

  const { data: treatments, isLoading } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const allTreatments = await base44.entities.Treatment.list();
      return allTreatments
        .filter(t => t.is_available !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
  });

  if (isLoading) {
    return (
      <section style={{ background: '#F0E8DD', padding: '26px 16px', minHeight: '100vh' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto', textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ color: '#3B4831' }}>Loading treatments...</div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: '#F0E8DD', padding: '26px 16px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <header style={{ marginBottom: '14px' }}>
          <h1 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '34px', letterSpacing: '.2px' }}>
            Spa Treatments
          </h1>
        </header>

        <div style={{ display: 'grid', gap: '14px' }}>
          {treatments?.map((treatment) => {
            const isExpanded = expandedVideo === treatment.id;
            return (
            <article 
              key={treatment.id}
              style={{ 
                background: '#FCF9F4', 
                borderRadius: '18px', 
                padding: '18px', 
                boxShadow: '0 10px 30px rgba(0,0,0,.08)', 
                border: '1px solid rgba(59,72,49,.10)',
                transition: 'all 0.3s ease'
              }}
            >
              <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>
                {treatment.name}
              </h2>
              <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
                {treatment.what_it_is}
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, color: '#1B1B1B' }}>{treatment.duration_minutes} min · ${treatment.price}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {treatment.video_url && (
                    <button
                      onClick={() => setExpandedVideo(isExpanded ? null : treatment.id)}
                      style={{ background: '#C57C5D', color: '#FCF9F4', border: 'none', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}
                    >
                      {isExpanded ? '✕ Close' : '▶ Watch Video'}
                    </button>
                  )}
                  {(!treatment.booking_mode || treatment.booking_mode === 'book_online') && (
                    <a 
                      href={treatment.name?.toLowerCase().includes('sound bath') && treatment.name?.toLowerCase().includes('group')
                        ? 'https://book.squareup.com/classes/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/classes'
                        : `/booking?treatment=${treatment.slug || treatment.name.toLowerCase().replace(/\s+/g, '-')}`}
                      target={treatment.name?.toLowerCase().includes('sound bath') && treatment.name?.toLowerCase().includes('group') ? '_blank' : undefined}
                      rel={treatment.name?.toLowerCase().includes('sound bath') && treatment.name?.toLowerCase().includes('group') ? 'noopener noreferrer' : undefined}
                      style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}
                    >
                      {treatment.name?.toLowerCase().includes('sound bath') && treatment.name?.toLowerCase().includes('group') ? 'Register for Class' : 'Book Now'}
                    </a>
                  )}
                  {treatment.booking_mode === 'request_info' && (
                    <button
                      onClick={() => setRequestTreatment(treatment)}
                      style={{ background: '#8B7355', color: '#FCF9F4', border: 'none', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}
                    >
                      Request Info
                    </button>
                  )}
                  {treatment.booking_mode === 'call_to_book' && (
                    <a
                      href="tel:9038106695"
                      style={{ textDecoration: 'none', background: '#3B4831', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}
                    >
                      Call to Book
                    </a>
                  )}
                  {treatment.booking_mode === 'call_and_info' && (
                     <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <a
                          href="tel:9038106695"
                          style={{ textDecoration: 'none', background: '#3B4831', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}
                        >
                          Call to Book
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRequestTreatment(treatment); }}
                          style={{ background: '#8B7355', color: '#FCF9F4', border: 'none', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontSize: '14px' }}
                        >
                          Get More Info
                        </button>
                      </div>
                    )}
                </div>
                </div>

                {isExpanded && treatment.video_url && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(59,72,49,.10)' }}>
                  <a
                    href={treatment.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#FF0000',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '12px 18px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '14px',
                      width: 'fit-content'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                    Watch on YouTube
                  </a>
                </div>
                )}
                </article>
                );
                })}
                </div>

        {treatments?.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '40px', color: '#3B4831' }}>
            No treatments available at this time.
          </div>
        )}
      </div>

      {requestTreatment && (
        <TreatmentRequestForm
          key={requestTreatment.id}
          treatment={requestTreatment}
          onClose={() => setRequestTreatment(null)}
        />
      )}
    </section>
  );
}