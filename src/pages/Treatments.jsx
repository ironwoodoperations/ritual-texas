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
                          onClick={() => setRequestTreatment(treatment)}
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
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                    {(() => {
                      let url = treatment.video_url || '';
                      let embedUrl = '';
                      
                      // Extract video ID from various formats
                      if (url.includes('youtu.be/')) {
                        const videoId = url.replace(/^.*youtu\.be\//, '').split(/[?&#]/)[0];
                        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                      } else if (url.includes('watch?v=')) {
                        const videoId = url.replace(/^.*v=/, '').split(/[&#]/)[0];
                        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
                      } else if (url.includes('/embed/')) {
                        embedUrl = url;
                      } else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
                        // Plain video ID
                        embedUrl = `https://www.youtube.com/embed/${url}`;
                      }
                      
                      if (!embedUrl) return null;
                      
                      return (
                        <iframe
                          style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '100%',
                            border: 'none'
                          }}
                          src={embedUrl}
                          title={treatment.name}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      );
                    })()}
                  </div>
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
          treatment={requestTreatment}
          onClose={() => setRequestTreatment(null)}
        />
      )}
    </section>
  );
}