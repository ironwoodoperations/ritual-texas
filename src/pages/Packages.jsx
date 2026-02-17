import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Leaf } from 'lucide-react';

export default function Packages() {
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages-public'],
    queryFn: async () => {
      const all = await base44.entities.Package.list('sort_order', 50);
      return all.filter(p => p.is_active);
    }
  });

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{
        padding: '80px 24px 60px',
        textAlign: 'center',
        background: 'linear-gradient(160deg, #3B4831 0%, #5a6b47 100%)',
        color: '#FCF9F4'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Leaf className="w-8 h-8" style={{ color: 'rgba(252,249,244,0.7)' }} />
        </div>
        <h1 style={{ margin: 0, fontFamily: 'serif', fontSize: '48px', fontWeight: 300, color: '#FCF9F4', letterSpacing: '0.02em' }}>
          Packages
        </h1>
        <p style={{ marginTop: '16px', fontSize: '18px', color: 'rgba(252,249,244,0.85)', maxWidth: '620px', margin: '16px auto 0', lineHeight: 1.7 }}>
          Curated stays that combine accommodations and signature treatments — everything arranged, nothing left to chance.
        </p>
      </section>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 20px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#3B4831', padding: '60px 0' }}>Loading packages…</div>
        ) : packages.length === 0 ? (
          <div style={{ textAlign: 'center', background: '#FCF9F4', padding: '48px', borderRadius: '18px', color: '#3B4831' }}>
            <p style={{ fontSize: '18px', margin: 0 }}>Packages coming soon. Check back shortly.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {packages.map(pkg => (
              <Link
                key={pkg.id}
                to={createPageUrl('PackageDetail') + `?slug=${pkg.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  background: '#FCF9F4',
                  borderRadius: '22px',
                  border: '1px solid rgba(59,72,49,.1)',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,.07)',
                  transition: 'box-shadow 0.3s ease',
                  cursor: 'pointer'
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,.13)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.07)'}
                >
                  {pkg.hero_image_url && (
                    <div style={{ height: '220px', overflow: 'hidden' }}>
                      <img src={pkg.hero_image_url} alt={pkg.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  {!pkg.hero_image_url && (
                    <div style={{ height: '160px', background: 'linear-gradient(135deg, #3B4831, #8a9f72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Leaf className="w-12 h-12" style={{ color: 'rgba(252,249,244,0.5)' }} />
                    </div>
                  )}
                  <div style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                      <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '24px', color: '#3B4831', fontWeight: 400 }}>{pkg.title}</h2>
                      <span style={{ fontSize: '22px', fontWeight: 700, color: '#C57C5D', whiteSpace: 'nowrap' }}>
                        ${pkg.price?.toLocaleString()}
                      </span>
                    </div>
                    {pkg.subtitle && (
                      <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#6B7B5A', fontStyle: 'italic' }}>{pkg.subtitle}</p>
                    )}
                    {pkg.short_description && (
                      <p style={{ margin: '0 0 20px', color: '#1B1B1B', lineHeight: 1.6, fontSize: '15px' }}>{pkg.short_description}</p>
                    )}
                    {pkg.includes?.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B4831', fontWeight: 600 }}>Includes</p>
                        <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {pkg.includes.slice(0, 3).map((item, i) => (
                            <li key={i} style={{ fontSize: '14px', color: '#1B1B1B', lineHeight: 1.5 }}>{item}</li>
                          ))}
                          {pkg.includes.length > 3 && (
                            <li style={{ fontSize: '14px', color: '#C57C5D', fontWeight: 600 }}>+{pkg.includes.length - 3} more…</li>
                          )}
                        </ul>
                      </div>
                    )}
                    <div style={{ display: 'inline-block', padding: '10px 20px', background: '#3B4831', color: '#FCF9F4', borderRadius: '999px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em' }}>
                      View Package
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}