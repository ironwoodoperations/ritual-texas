import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreatmentRequestForm from '@/components/TreatmentRequestForm';

export default function Treatments() {
  const [requestTreatment, setRequestTreatment] = useState(null);

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
          {treatments?.map((treatment) => (
            <article 
              key={treatment.id}
              style={{ 
                background: '#FCF9F4', 
                borderRadius: '18px', 
                padding: '18px', 
                boxShadow: '0 10px 30px rgba(0,0,0,.08)', 
                border: '1px solid rgba(59,72,49,.10)' 
              }}
            >
              <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>
                {treatment.name}
              </h2>
              <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
                {treatment.what_it_is}
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, color: '#1B1B1B' }}>{treatment.duration_minutes} min</div>
                <a 
                  href={`/booking?treatment=${treatment.slug || treatment.name.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}
                >
                  Book Now
                </a>
              </div>
            </article>
          ))}
        </div>

        {treatments?.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '40px', color: '#3B4831' }}>
            No treatments available at this time.
          </div>
        )}
      </div>
    </section>
  );
}